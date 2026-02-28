/**
 * code-runner.ts — Problem-Aware LeetCode-style Judge Templates
 *
 * Templates are injected inline: user code replaces ###USERCODE###,
 * and the entry point function name replaces ###ENTRYPOINT###.
 *
 * stdin protocol: one JSON-encoded argument per line.
 * e.g.  [2,7,11,15]\n9\n
 *
 * Supported problem types:
 *   array | string | matrix | binary_tree | linked_list | graph
 */

import { getTemplate, normLang } from "./templates";
import { assembleCode } from "./uas/assembler";
import type { ProblemSpec, InputField, OutputSpec } from "./uas/types";

// ── Template injection ───────────────────────────────────────────────────────

export function wrapCode(
  userCode: string,
  language: string,
  entryPoint: string,
  problemType: string = "array",
  inputSpec?: InputField[] | null,
  outputSpec?: OutputSpec | null,
): string {
  let ep = entryPoint.trim();
  if (ep.startsWith("Solution().")) ep = ep.replace("Solution().", "");

  const lang = normLang(language);

  // Only wrap Python and JavaScript — others pass through as-is
  if (lang !== "python" && lang !== "javascript") {
    return userCode;
  }

  // ── UAS Path: per-argument type spec is available ─────────────────────────
  if (inputSpec && inputSpec.length > 0 && (lang === "python")) {
    const safeOutputSpec: OutputSpec = outputSpec ?? { type: "any" };
    const spec: ProblemSpec = {
      problemId: "runtime",
      language: "python",
      functionName: ep,
      inputSpec,
      outputSpec: safeOutputSpec,
    };
    return assembleCode(userCode, spec, lang);
  }

  // ── Legacy Path: use static template files ────────────────────────────────
  const template = getTemplate(lang, problemType);

  return template
    .replace("###USERCODE###", userCode)
    .replace(/###ENTRYPOINT###/g, ep);
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

  return problemType;
}

// ── stdin formatter ──────────────────────────────────────────────────────────

/**
 * Converts a test case input string to the one-arg-per-line JSON format.
 *
 * Handles:
 *   1. Already one-per-line JSON: "[1,2,3]\n9" → unchanged
 *   2. key=value on same line: "nums = [1,2,3], target = 9" → "[1,2,3]\n9"
 *   3. key=value on separate lines: "nums = [1,2,3]\ntarget = 9" → "[1,2,3]\n9"
 *   4. Single bare value: "[1,2,3]" → "[1,2,3]"
 *
 * Uses bracket-depth-aware parsing so arrays with commas are not split.
 */
export function formatStdin(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  // Phase 1: check if each line is already valid JSON (new format)
  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.every((line) => isValidJson(line))) {
    return lines.join("\n");
  }

  // Phase 2: try bracket-aware key=value extraction
  // First, collapse multi-line key=value into a single line
  const collapsed = collapseMultilineInput(trimmed);
  const values = extractKeyValueValues(collapsed);

  if (values.length > 0) {
    // Normalize each extracted value to valid JSON
    return values.map(normalizeValue).join("\n");
  }

  // Phase 3: single bare value fallback
  return normalizeValue(trimmed);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isValidJson(s: string): boolean {
  try { JSON.parse(s); return true; } catch { return false; }
}

/**
 * Collapses a multi-line key=value input to a single line.
 * "nums = [1,2,3]\ntarget = 9" → "nums = [1,2,3], target = 9"
 */
function collapseMultilineInput(input: string): string {
  const lines = input.split("\n").map((l) => l.trim()).filter(Boolean);

  // If each line looks like "key = value", join with ", "
  const keyValueLine = /^\w+\s*=/;
  if (lines.every((l) => keyValueLine.test(l))) {
    return lines.join(", ");
  }

  return input;
}

/**
 * Extracts values from a comma-separated key=value string.
 * Uses bracket-depth counting so commas inside [] {} () are not treated as separators.
 *
 * "nums = [2,7,11,15], target = 9"
 *   → ["[2,7,11,15]", "9"]
 *
 * "s1 = \"hello\", s2 = \"world\""
 *   → ["\"hello\"", "\"world\""]
 */
function extractKeyValueValues(input: string): string[] {
  // Find all key=value pairs using bracket-aware splitting
  // First split on "word_chars whitespace = " while respecting brackets
  const pairs = splitKeyValuePairs(input);
  return pairs.map(([, val]) => val.trim());
}

/**
 * Splits "k1 = v1, k2 = v2" into [["k1","v1"], ["k2","v2"]]
 * without breaking on commas inside nested brackets.
 */
function splitKeyValuePairs(input: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];

  // Find positions where "key =" starts
  const keyPattern = /\b(\w+)\s*=/g;
  const keyPositions: Array<{ key: string; valueStart: number }> = [];
  let m;
  while ((m = keyPattern.exec(input)) !== null) {
    keyPositions.push({ key: m[1], valueStart: m.index + m[0].length });
  }

  for (let i = 0; i < keyPositions.length; i++) {
    const { key, valueStart } = keyPositions[i];
    const valueEnd = i + 1 < keyPositions.length
      ? findValueEnd(input, valueStart, keyPositions[i + 1].valueStart - keyPositions[i + 1].key.length - 3) // subtract "key ="
      : input.length;
    const value = input.slice(valueStart, valueEnd).trim().replace(/,\s*$/, "");
    if (value) pairs.push([key, value]);
  }

  return pairs;
}

/**
 * Finds where a value ends before the next key=value pair.
 * Respects bracket depth so we don't cut inside a nested structure.
 */
function findValueEnd(input: string, start: number, nextKeyApprox: number): number {
  let depth = 0;
  let inString = false;
  let stringChar = "";

  for (let i = start; i < input.length; i++) {
    const ch = input[i];

    if (inString) {
      if (ch === stringChar && input[i - 1] !== "\\") inString = false;
      continue;
    }

    if (ch === '"' || ch === "'") { inString = true; stringChar = ch; continue; }
    if (ch === "[" || ch === "(" || ch === "{") { depth++; continue; }
    if (ch === "]" || ch === ")" || ch === "}") { depth--; continue; }

    // At depth 0, a comma followed by "word =" is a key separator
    if (depth === 0 && ch === "," && i >= nextKeyApprox - 5) {
      return i;
    }
  }

  return input.length;
}

/**
 * Normalizes a raw extracted value to JSON.
 * - Handles Python-style quotes: 'abc' → "abc"
 * - Handles Python True/False/None
 * - Leaves valid JSON unchanged
 */
function normalizeValue(val: string): string {
  let s = val.trim();

  // Remove surrounding single quotes and replace with double quotes
  if (s.startsWith("'") && s.endsWith("'")) {
    s = '"' + s.slice(1, -1).replace(/"/g, '\\"') + '"';
  }

  // Python literals
  s = s.replace(/\bTrue\b/g, "true")
       .replace(/\bFalse\b/g, "false")
       .replace(/\bNone\b/g, "null");

  // If it's valid JSON, re-serialize for compaction (removes spaces like [1000, 1000])
  if (isValidJson(s)) return JSON.stringify(JSON.parse(s));

  // Replace single-quoted strings in arrays/objects
  s = s.replace(/'/g, '"');
  if (isValidJson(s)) return JSON.stringify(JSON.parse(s));

  // Return as double-quoted string
  return JSON.stringify(val.trim());
}

// ── Legacy exports (backward compat) ─────────────────────────────────────────

export function wrapPython(userCode: string, entryPoint: string): string {
  return wrapCode(userCode, "python", entryPoint, "array");
}

export function wrapJavaScript(userCode: string, entryPoint: string): string {
  return wrapCode(userCode, "javascript", entryPoint, "array");
}
