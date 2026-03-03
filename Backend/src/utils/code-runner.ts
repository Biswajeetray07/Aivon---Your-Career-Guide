import { getTemplate, normLang } from "./templates";
import { assembleCode } from "./uas/assembler";
import { validateSignature } from "./uas/signature-validator";
import type { ProblemSpec, InputField, OutputSpec } from "./uas/types";

// ── Template injection ───────────────────────────────────────────────────────

export function wrapCode(
  userCode: string,
  language: string,
  entryPoint: string,
  problemType: string = "array",
  inputSpec?: InputField[] | null,
  outputSpec?: OutputSpec | null,
): { code: string; executionPath: "uas" | "legacy" } {
  let ep = entryPoint.trim();
  if (ep.startsWith("Solution().")) ep = ep.replace("Solution().", "");

  const lang = normLang(language);

  // Only wrap Python and JavaScript — others pass through as-is
  if (lang !== "python" && lang !== "javascript") {
    return { code: userCode, executionPath: "legacy" };
  }

  // ── Signature Validation (pre-execution guard) ────────────────────────────
  if (inputSpec && inputSpec.length > 0) {
    const validation = validateSignature(userCode, ep, inputSpec, lang);
    if (!validation.valid) {
      // Return code that will immediately print the error
      if (lang === "python") {
        return { code: `import sys\nsys.stderr.write(${JSON.stringify(validation.error)})\nsys.exit(1)`, executionPath: "uas" };
      } else {
        return { code: `process.stderr.write(${JSON.stringify(validation.error)}); process.exit(1);`, executionPath: "uas" };
      }
    }
  }

  // ── UAS Path: per-argument type spec is available (Python + JS) ───────────
  if (inputSpec && inputSpec.length > 0) {
    const safeOutputSpec: OutputSpec = outputSpec ?? { type: "any" };
    const spec: ProblemSpec = {
      problemId: "runtime",
      language: lang,
      functionName: ep,
      inputSpec,
      outputSpec: safeOutputSpec,
    };
    return { code: assembleCode(userCode, spec, lang), executionPath: "uas" };
  }

  // ── Legacy Path: use static template files ────────────────────────────────
  const template = getTemplate(lang, problemType);

  return {
    code: template
      .replace("###USERCODE###", userCode)
      .replace(/###ENTRYPOINT###/g, ep),
    executionPath: "legacy"
  };
}


// ── Auto problem type detection from input ────────────────────────────────────

/**
 * Heuristically detect the problem type from a test case input string.
 * This is used to override `problemType = "array"` for problems whose
 * inputs contain linked-list or binary-tree argument names.
 */
export function detectProblemTypeFromInput(
  input: string,
  problemType: string
): string {
  // Only try to upgrade from the generic "array" default
  if (problemType !== "array") return problemType;

  const trimmed = input.trim().toLowerCase();

  // Linked list indicators: l1, l2, list1, list2, head, node
  if (/\b(l1|l2|list1|list2|head)\s*=/.test(trimmed)) {
    return "linked_list";
  }

  // Binary tree indicators: root, tree
  if (/\b(root|tree)\s*=/.test(trimmed)) {
    return "binary_tree";
  }

  // Graph indicators: adjList, graph, edges, node
  if (/\b(adjList|graph|edges|node)\s*=/.test(trimmed)) {
    return "graph";
  }

  // Matrix indicators: board, grid, matrix
  if (/\b(board|grid|matrix)\b/i.test(trimmed) || /\[{2,}.*\]{2,}/.test(trimmed)) {
    return "matrix";
  }

  return problemType;
}

// ── stdin formatter ──────────────────────────────────────────────────────────

/**
 * Converts a test case input string to the one-arg-per-line JSON format.
 *
 * The optional `fieldNames` parameter (from inputSpec) allows the parser to
 * know exactly which keys to extract and how many arguments to expect.
 *
 * Parsing order:
 *   1. Already one-per-line JSON → pass through
 *   2. Single JSON dict → extract values by fieldNames
 *   3. State-machine key=value splitting (bracket + string aware)
 *   4. Bare value fallback
 */
export function formatStdin(input: string, fieldNames?: string[]): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  // Phase 1: check if each line is already valid JSON
  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.every((line) => isValidJson(line))) {
    // If we got the right number of lines for the fieldNames, use it directly
    if (!fieldNames || lines.length === fieldNames.length) {
      return lines.join("\n");
    }
    // Special case: single JSON dict line with fieldNames
    if (lines.length === 1 && fieldNames.length > 1) {
      try {
        const parsed = JSON.parse(lines[0]);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const dictResult = extractFromDict(parsed, fieldNames);
          if (dictResult) return dictResult;
        }
      } catch { /* fall through */ }
    }
    return lines.join("\n");
  }

  // Phase 2: JSON dict extraction (e.g. {"board": [...], "word": "..."})
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && fieldNames) {
        const dictResult = extractFromDict(parsed, fieldNames);
        if (dictResult) return dictResult;
      }
    } catch { /* fall through to key=value parsing */ }
  }

  // Phase 3: State-machine key=value extraction
  const collapsed = collapseMultilineInput(trimmed);
  const values = smExtractKeyValues(collapsed, fieldNames);

  if (values.length > 0) {
    return values.map(normalizeValue).join("\n");
  }

  // Phase 4: single bare value fallback
  return normalizeValue(trimmed);
}

// ── JSON Dict Extraction ─────────────────────────────────────────────────────

/**
 * Extracts values from a JSON dict using the fieldNames order.
 * Also handles the nested `{"args": {...}}` pattern.
 */
function extractFromDict(obj: Record<string, unknown>, fieldNames: string[]): string | null {
  // Handle nested {"args": {...}} wrapper
  const dict = (obj.args && typeof obj.args === "object" && !Array.isArray(obj.args))
    ? obj.args as Record<string, unknown>
    : obj;

  const values: string[] = [];
  for (const name of fieldNames) {
    if (!(name in dict)) return null; // missing key → can't extract
    values.push(JSON.stringify(dict[name]));
  }
  return values.join("\n");
}

// ── State Machine Key=Value Splitter ─────────────────────────────────────────

/**
 * Robust state-machine parser for "key1 = value1, key2 = value2" format.
 *
 * Properly tracks:
 *  - Bracket depth ([], {}, ())
 *  - String literals (both " and ', with escape handling)
 *  - Only splits on commas at depth 0 that precede a known key
 */
function smExtractKeyValues(input: string, fieldNames?: string[]): string[] {
  // Step 1: Find all key positions using a regex scan
  const keyPattern = /\b(\w+)\s*=/g;
  const keyPositions: Array<{ key: string; eqEnd: number; matchStart: number }> = [];
  let m;
  while ((m = keyPattern.exec(input)) !== null) {
    keyPositions.push({
      key: m[1],
      eqEnd: m.index + m[0].length,
      matchStart: m.index,
    });
  }

  if (keyPositions.length === 0) return [];

  // If fieldNames are provided, filter to only known keys (preserving order)
  let filteredPositions = keyPositions;
  if (fieldNames && fieldNames.length > 0) {
    const nameSet = new Set(fieldNames);
    filteredPositions = keyPositions.filter((kp) => nameSet.has(kp.key));
    // If we don't find all expected field names, fall back to all found keys
    if (filteredPositions.length < fieldNames.length) {
      filteredPositions = keyPositions;
    }
  }

  if (filteredPositions.length === 0) return [];

  // Step 2: Extract values between key positions using bracket/string-aware scanning
  const values: string[] = [];

  for (let i = 0; i < filteredPositions.length; i++) {
    const valueStart = filteredPositions[i].eqEnd;
    const scanEnd = i + 1 < filteredPositions.length
      ? filteredPositions[i + 1].matchStart
      : input.length;

    // Scan from valueStart to scanEnd, stripping the trailing ", " separator
    const rawValue = smExtractSingleValue(input, valueStart, scanEnd);
    if (rawValue !== null) {
      values.push(rawValue);
    }
  }

  return values;
}

/**
 * Extracts a single value from `input[start..end)` using bracket/string-aware scanning.
 * Strips any trailing comma + whitespace that separates from the next key.
 */
function smExtractSingleValue(input: string, start: number, end: number): string | null {
  // Find the actual end of the value by scanning backwards from `end`
  // to strip the trailing ", key" part. The value ends at the last position
  // where brackets are balanced and we hit a comma at depth 0.

  let depth = 0;
  let inString = false;
  let stringChar = "";
  let lastBalancedComma = -1;

  for (let i = start; i < end; i++) {
    const ch = input[i];
    const prev = i > 0 ? input[i - 1] : "";

    if (inString) {
      if (ch === stringChar && prev !== "\\") inString = false;
      continue;
    }

    if (ch === '"' || ch === "'") { inString = true; stringChar = ch; continue; }
    if (ch === "[" || ch === "(" || ch === "{") { depth++; continue; }
    if (ch === "]" || ch === ")" || ch === "}") { depth--; continue; }

    if (depth === 0 && ch === ",") {
      lastBalancedComma = i;
    }
  }

  // The actual value end: if there was a trailing comma at depth 0
  // that leads to a key= pattern, use the comma position.
  // Otherwise use `end`.
  let valueEnd = end;
  if (lastBalancedComma > start) {
    // Check if the text after the last comma contains a key= pattern
    const afterComma = input.slice(lastBalancedComma + 1, end).trim();
    if (/^\w+\s*=/.test(afterComma)) {
      valueEnd = lastBalancedComma;
    }
  }

  const value = input.slice(start, valueEnd).trim();
  // Strip any residual trailing comma
  const cleaned = value.replace(/,\s*$/, "").trim();
  return cleaned || null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isValidJson(s: string): boolean {
  try { JSON.parse(s); return true; } catch { return false; }
}

/**
 * Collapses multi-line key=value input to a single line.
 */
function collapseMultilineInput(input: string): string {
  const lines = input.split("\n").map((l) => l.trim()).filter(Boolean);
  const keyValueLine = /^\w+\s*=/;
  if (lines.every((l) => keyValueLine.test(l))) {
    return lines.join(", ");
  }
  return input;
}

/**
 * Normalizes a raw extracted value to valid JSON.
 */
function normalizeValue(val: string): string {
  let s = val.trim();

  if (s.startsWith("'") && s.endsWith("'")) {
    s = '"' + s.slice(1, -1).replace(/"/g, '\\"') + '"';
  }

  s = s.replace(/\bTrue\b/g, "true")
       .replace(/\bFalse\b/g, "false")
       .replace(/\bNone\b/g, "null");

  if (isValidJson(s)) return JSON.stringify(JSON.parse(s));

  s = s.replace(/'/g, '"');
  if (isValidJson(s)) return JSON.stringify(JSON.parse(s));

  return JSON.stringify(val.trim());
}

// ── Legacy exports (backward compat) ─────────────────────────────────────────

export function wrapPython(userCode: string, entryPoint: string): string {
  return wrapCode(userCode, "python", entryPoint, "array").code;
}

export function wrapJavaScript(userCode: string, entryPoint: string): string {
  return wrapCode(userCode, "javascript", entryPoint, "array").code;
}
