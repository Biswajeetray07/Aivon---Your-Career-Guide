/**
 * UAS Auto-Generator — Heuristic Engine for Metadata Backfill
 *
 * Parses Python starter code type annotations, title keywords, and descriptions
 * to automatically generate inputSpec/outputSpec with confidence scoring.
 *
 * Usage: imported by the CLI backfill script
 */

import type { DSAType, InputField, OutputSpec } from "./types";

// ── Type Hint → DSAType Mapping ─────────────────────────────────────────────

const PYTHON_TYPE_MAP: Record<string, DSAType> = {
  // Structural types
  "Optional[ListNode]":  "linked_list",
  "ListNode":            "linked_list",
  "Optional[TreeNode]":  "binary_tree",
  "TreeNode":            "binary_tree",
  "Optional[Node]":      "nary_tree",
  "Node":                "nary_tree",

  // Primitives
  "int":     "number",
  "float":   "number",
  "str":     "string",
  "bool":    "boolean",

  // Collections
  "List[int]":           "array",
  "List[float]":         "array",
  "List[str]":           "array",
  "List[bool]":          "array",
  "List[List[int]]":     "matrix",
  "List[List[float]]":   "matrix",
  "List[List[str]]":     "matrix",
  "List[Optional[int]]": "array",

  // Intervals (special matrix)
  "List[List[int]]_intervals": "intervals",
};

// Keywords that suggest intervals vs matrix
const INTERVAL_KEYWORDS = ["interval", "merge", "schedule", "meeting", "overlap", "range"];

// ── Title Keyword Scoring ───────────────────────────────────────────────────

type TitleSignal = { type: DSAType; weight: number };

const TITLE_PATTERNS: Array<{ regex: RegExp; signal: TitleSignal }> = [
  // Linked List (strongest)
  { regex: /linked\s*list/i,                signal: { type: "linked_list", weight: 0.9 } },
  { regex: /\blistnode\b/i,                 signal: { type: "linked_list", weight: 0.9 } },

  // Binary Tree / BST
  { regex: /binary\s*tree/i,                signal: { type: "binary_tree", weight: 0.9 } },
  { regex: /\bbst\b/i,                      signal: { type: "binary_tree", weight: 0.85 } },
  { regex: /binary\s*search\s*tree/i,       signal: { type: "binary_tree", weight: 0.9 } },
  { regex: /\btreenode\b/i,                 signal: { type: "binary_tree", weight: 0.9 } },

  // N-ary tree
  { regex: /n[\s-]*ary\s*tree/i,            signal: { type: "nary_tree", weight: 0.9 } },

  // Graph
  { regex: /\bgraph\b/i,                    signal: { type: "graph_adj_list", weight: 0.7 } },
  { regex: /shortest\s*path/i,              signal: { type: "graph_adj_list", weight: 0.5 } },
  { regex: /number\s*of\s*islands/i,        signal: { type: "matrix", weight: 0.8 } },

  // Matrix
  { regex: /\bmatrix\b/i,                   signal: { type: "matrix", weight: 0.7 } },
  { regex: /\bgrid\b/i,                     signal: { type: "matrix", weight: 0.5 } },

  // Intervals
  { regex: /\binterval/i,                   signal: { type: "intervals", weight: 0.8 } },
  { regex: /merge\s*intervals/i,            signal: { type: "intervals", weight: 0.95 } },

  // Heap / priority queue
  { regex: /\bheap\b/i,                     signal: { type: "heap", weight: 0.6 } },
];

// ── Description Pattern Scanning ────────────────────────────────────────────

const DESC_PATTERNS: Array<{ regex: RegExp; signal: TitleSignal }> = [
  { regex: /linked\s*list/i,                signal: { type: "linked_list", weight: 0.7 } },
  { regex: /\blistnode\b/i,                 signal: { type: "linked_list", weight: 0.8 } },
  { regex: /binary\s*tree/i,               signal: { type: "binary_tree", weight: 0.7 } },
  { regex: /\btreenode\b/i,                signal: { type: "binary_tree", weight: 0.8 } },
  { regex: /\bgraph\b/i,                   signal: { type: "graph_adj_list", weight: 0.5 } },
  { regex: /adjacency\s*list/i,            signal: { type: "graph_adj_list", weight: 0.7 } },
  { regex: /\bmatrix\b/i,                  signal: { type: "matrix", weight: 0.4 } },
  { regex: /\binterval/i,                  signal: { type: "intervals", weight: 0.5 } },
];

// ── Ambiguity Flags ─────────────────────────────────────────────────────────

const AMBIGUOUS_PATTERNS = [
  /\bdesign\b/i,
  /\blru\s*cache\b/i,
  /\bmin\s*stack\b/i,
  /\brandom\b.*\bpointer\b/i,
  /\bcopy\b.*\brandom\b/i,
  /\bserialize\b.*\bdeserialize\b/i,
  /\biterator\b/i,
  /\bimplrement\b/i,
];

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export type ConfidenceTier = "auto" | "review" | "ambiguous" | "reject";

export interface SignalScore {
  source: "signature" | "title" | "description";
  score: number;
  detail: string;
}

export interface MetadataProposal {
  problemId: string;
  slug: string;
  title: string;
  proposedInputSpec: InputField[];
  proposedOutputSpec: OutputSpec;
  confidence: number;
  tier: ConfidenceTier;
  signals: SignalScore[];
  isAmbiguous: boolean;
  ambiguityReason?: string;
}

export interface ProblemRow {
  id: string;
  slug: string;
  title: string;
  starterCode: any;
  description: string | null;
  entryPoint: string;
  problemType: string | null;
}

/**
 * Generate a metadata proposal for a single problem.
 */
export function generateProposal(problem: ProblemRow): MetadataProposal {
  const signals: SignalScore[] = [];

  // ── 1. Parse starter code (strongest signal) ──────────────────────────────
  const sigResult = parseStarterCode(problem.starterCode, problem.entryPoint);
  if (sigResult) {
    signals.push({
      source: "signature",
      score: sigResult.confidence,
      detail: `Parsed ${sigResult.params.length} params: ${sigResult.params.map(p => `${p.name}:${p.typeHint || "any"}`).join(", ")}` +
              (sigResult.returnType ? ` → ${sigResult.returnType}` : ""),
    });
  }

  // ── 2. Title keyword scoring ──────────────────────────────────────────────
  const titleResult = inferFromTitle(problem.title);
  if (titleResult.score > 0) {
    signals.push({
      source: "title",
      score: titleResult.score,
      detail: titleResult.detail,
    });
  }

  // ── 3. Description pattern scan ───────────────────────────────────────────
  const descResult = inferFromDescription(problem.description);
  if (descResult.score > 0) {
    signals.push({
      source: "description",
      score: descResult.score,
      detail: descResult.detail,
    });
  }

  // ── 4. Check ambiguity ────────────────────────────────────────────────────
  const ambiguity = checkAmbiguity(problem.title, problem.description);

  // ── 5. Build inputSpec and outputSpec ──────────────────────────────────────
  let inputSpec: InputField[];
  let outputSpec: OutputSpec;

  if (sigResult && sigResult.params.length > 0) {
    // Use signature (highest quality)
    inputSpec = sigResult.params.map(p => ({
      name: p.name,
      type: resolveType(p.typeHint, problem.title),
    }));
    outputSpec = { type: resolveType(sigResult.returnType, problem.title) };
  } else {
    // Fallback to title/description heuristics
    inputSpec = buildFallbackInputSpec(problem, titleResult, descResult);
    outputSpec = { type: titleResult.primaryType || "any" };
  }

  // ── 6. Score confidence ───────────────────────────────────────────────────
  const confidence = scoreConfidence(signals);
  const tier = ambiguity.isAmbiguous ? "ambiguous" : getTier(confidence);

  return {
    problemId: problem.id,
    slug: problem.slug,
    title: problem.title,
    proposedInputSpec: inputSpec,
    proposedOutputSpec: outputSpec,
    confidence,
    tier,
    signals,
    isAmbiguous: ambiguity.isAmbiguous,
    ambiguityReason: ambiguity.reason,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL: Starter Code Parser
// ═══════════════════════════════════════════════════════════════════════════════

interface ParsedParam {
  name: string;
  typeHint: string | null;
}

interface SignatureResult {
  params: ParsedParam[];
  returnType: string | null;
  confidence: number;
}

function parseStarterCode(starterCode: any, entryPoint: string): SignatureResult | null {
  // Extract Python code from the starterCode object/string
  let code: string | null = null;
  if (typeof starterCode === "string") {
    code = starterCode;
  } else if (starterCode && typeof starterCode === "object") {
    code = starterCode["python"] || starterCode["python3"] || null;
  }

  if (!code) return null;

  // Match: def methodName(self, param1: Type1, param2: Type2) -> ReturnType:
  const defRegex = new RegExp(
    `def\\s+${escapeRegex(entryPoint)}\\s*\\(\\s*self\\s*,?\\s*(.*)\\)\\s*(?:->\\s*(.+?))?\\s*:`,
    "m"
  );
  const match = code.match(defRegex);
  if (!match) return null;

  const rawParams = match[1]?.trim() || "";
  const rawReturn = match[2]?.trim() || null;

  // Parse individual parameters
  const params = parseParams(rawParams);

  // Calculate confidence based on how many params have type hints
  const typedCount = params.filter(p => p.typeHint !== null).length;
  const confidence = params.length === 0
    ? 0.5
    : (typedCount / params.length) * 0.95 + 0.05;

  return {
    params,
    returnType: rawReturn,
    confidence,
  };
}

function parseParams(raw: string): ParsedParam[] {
  if (!raw.trim()) return [];

  const params: ParsedParam[] = [];
  let depth = 0;
  let current = "";

  // Split by comma, respecting bracket depth (for List[List[int]])
  for (const ch of raw) {
    if (ch === "[" || ch === "(") depth++;
    if (ch === "]" || ch === ")") depth--;
    if (ch === "," && depth === 0) {
      params.push(parseOneParam(current.trim()));
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    params.push(parseOneParam(current.trim()));
  }

  return params;
}

function parseOneParam(raw: string): ParsedParam {
  // Match: paramName: TypeHint or paramName: TypeHint = default
  const match = raw.match(/^(\w+)\s*:\s*(.+?)(?:\s*=\s*.+)?$/);
  if (match) {
    return { name: match[1], typeHint: match[2].trim() };
  }
  // No type hint
  const nameMatch = raw.match(/^(\w+)/);
  return { name: nameMatch?.[1] || raw, typeHint: null };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL: Type Resolution
// ═══════════════════════════════════════════════════════════════════════════════

function resolveType(typeHint: string | null, title: string): DSAType {
  if (!typeHint) return "any";

  const cleaned = typeHint.trim();

  // Direct lookup
  if (PYTHON_TYPE_MAP[cleaned]) {
    // Special case: List[List[int]] could be intervals
    if (cleaned === "List[List[int]]" && isLikelyIntervals(title)) {
      return "intervals";
    }
    return PYTHON_TYPE_MAP[cleaned];
  }

  // Regex-based matching for complex generics
  if (/^Optional\[ListNode\]$/i.test(cleaned)) return "linked_list";
  if (/^Optional\[TreeNode\]$/i.test(cleaned)) return "binary_tree";
  if (/^Optional\[Node\]$/i.test(cleaned)) return "nary_tree";
  if (/^List\[List\[/.test(cleaned)) {
    return isLikelyIntervals(title) ? "intervals" : "matrix";
  }
  if (/^List\[/.test(cleaned)) return "array";
  if (/^Optional\[int\]$/i.test(cleaned)) return "number";
  if (/^Optional\[str\]$/i.test(cleaned)) return "string";
  if (/^Optional\[bool\]$/i.test(cleaned)) return "boolean";

  return "any";
}

function isLikelyIntervals(title: string): boolean {
  const lower = title.toLowerCase();
  return INTERVAL_KEYWORDS.some(kw => lower.includes(kw));
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL: Title & Description Analyzers
// ═══════════════════════════════════════════════════════════════════════════════

interface HeuristicResult {
  score: number;
  primaryType: DSAType | null;
  detail: string;
}

function inferFromTitle(title: string): HeuristicResult {
  let best: TitleSignal | null = null;
  const matches: string[] = [];

  for (const pattern of TITLE_PATTERNS) {
    if (pattern.regex.test(title)) {
      matches.push(`"${pattern.regex.source}" → ${pattern.signal.type}`);
      if (!best || pattern.signal.weight > best.weight) {
        best = pattern.signal;
      }
    }
  }

  return {
    score: best?.weight ?? 0,
    primaryType: best?.type ?? null,
    detail: matches.length > 0 ? `Matched: ${matches.join(", ")}` : "No title matches",
  };
}

function inferFromDescription(description: string | null): HeuristicResult {
  if (!description) return { score: 0, primaryType: null, detail: "No description" };

  let best: TitleSignal | null = null;
  const matches: string[] = [];

  for (const pattern of DESC_PATTERNS) {
    if (pattern.regex.test(description)) {
      matches.push(`"${pattern.regex.source}" → ${pattern.signal.type}`);
      if (!best || pattern.signal.weight > best.weight) {
        best = pattern.signal;
      }
    }
  }

  return {
    score: best?.weight ?? 0,
    primaryType: best?.type ?? null,
    detail: matches.length > 0 ? `Matched: ${matches.join(", ")}` : "No description matches",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL: Ambiguity & Confidence
// ═══════════════════════════════════════════════════════════════════════════════

function checkAmbiguity(title: string, _description: string | null): { isAmbiguous: boolean; reason?: string } {
  // Only check the TITLE for ambiguity — descriptions are too noisy
  for (const pattern of AMBIGUOUS_PATTERNS) {
    if (pattern.test(title)) {
      return { isAmbiguous: true, reason: `Title matches ambiguity pattern: ${pattern.source}` };
    }
  }
  return { isAmbiguous: false };
}

function scoreConfidence(signals: SignalScore[]): number {
  const sigScore = signals.find(s => s.source === "signature")?.score ?? 0;
  const titleScore = signals.find(s => s.source === "title")?.score ?? 0;
  const descScore = signals.find(s => s.source === "description")?.score ?? 0;

  // Weighted formula: signature is the strongest signal by far
  // A fully-typed signature alone is enough for auto-apply
  const weighted = sigScore * 0.70 + titleScore * 0.20 + descScore * 0.10;

  // Floor: if we parsed a good signature (≥0.80), guarantee at least 0.85
  // because Python type hints are extremely reliable
  if (sigScore >= 0.80) {
    return Math.max(0.85, Math.min(1, weighted));
  }

  return Math.min(1, weighted);
}

function getTier(confidence: number): ConfidenceTier {
  if (confidence >= 0.85) return "auto";
  if (confidence >= 0.65) return "review";
  if (confidence >= 0.40) return "ambiguous";
  return "reject";
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL: Fallback builders
// ═══════════════════════════════════════════════════════════════════════════════

function buildFallbackInputSpec(
  problem: ProblemRow,
  titleResult: HeuristicResult,
  descResult: HeuristicResult
): InputField[] {
  const primaryType = titleResult.primaryType || descResult.primaryType || "any";

  // For structural types, use common param names
  switch (primaryType) {
    case "linked_list":
      return [{ name: "head", type: "linked_list" }];
    case "binary_tree":
      return [{ name: "root", type: "binary_tree" }];
    case "nary_tree":
      return [{ name: "root", type: "nary_tree" }];
    case "matrix":
      return [{ name: "matrix", type: "matrix" }];
    case "graph_adj_list":
      return [{ name: "graph", type: "graph_adj_list" }];
    default:
      return [{ name: "nums", type: "array" }];
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
