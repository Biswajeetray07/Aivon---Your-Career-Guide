/**
 * Output Comparator — LeetCode-grade comparison engine
 *
 * Supports: exact, unordered, float, multiline, spj modes
 * Hardened for: NaN/Infinity, mixed int/float, nested structures, Unicode
 */

export type JudgeMode = "exact" | "unordered" | "float" | "multiline" | "spj";

// ── Canonical epsilon for float tolerance ───────────────────────────────────
const EPS = 1e-5;

// ── Output Normalization ────────────────────────────────────────────────────

export function normalizeOutput(output: string | null): string {
  if (output === null || output === undefined) return "null";

  let s = output.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  s = s.split("\n").map(l => l.trimEnd()).join("\n").trim();

  // Python literals → JSON
  s = s
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false")
    .replace(/\bNone\b/g, "null");

  // Try JSON canonical form
  try {
    const singleToDouble = s.replace(/'/g, '"');
    return JSON.stringify(JSON.parse(singleToDouble));
  } catch { /* not valid JSON */ }

  s = s.replace(/,\s+/g, ",").replace(/\[\s+/g, "[").replace(/\s+\]/g, "]");
  return s;
}

// ── Elite Comparator ────────────────────────────────────────────────────────

export function compareElite(
  actual: string | null,
  expected: string,
  mode: JudgeMode = "exact"
): boolean {
  if (actual === null || actual === undefined) return false;

  switch (mode) {
    case "unordered": return compareUnordered(actual, expected);
    case "float":     return compareFloat(actual, expected);
    case "multiline": return compareMultiline(actual, expected);
    case "spj":
    case "exact":
    default:          return compareExact(actual, expected);
  }
}

// ── MODE: EXACT ─────────────────────────────────────────────────────────────

function compareExact(actual: string, expected: string): boolean {
  if (actual.trim() === "" && expected.trim() !== "") return false;

  const a = normalizeOutput(actual);
  const e = normalizeOutput(expected);

  if (a === e) return true;
  if (a.toLowerCase() === e.toLowerCase()) return true;

  try {
    const pa = JSON.parse(a);
    const pe = JSON.parse(e);
    if (deepCompare(pa, pe)) return true;
  } catch { /* not JSON */ }

  return a.replace(/\s+/g, "") === e.replace(/\s+/g, "");
}

// ── Deep Comparator (HEART OF CORRECTNESS) ──────────────────────────────────

function deepCompare(a: any, b: any, eps = EPS): boolean {
  // Identity
  if (a === b) return true;

  // Null handling
  if (a === null || b === null) return a === b;
  if (a === undefined || b === undefined) return a === b;

  // Number comparison (handles mixed int/float: 1 === 1.0)
  if (typeof a === "number" && typeof b === "number") {
    // Guard: NaN/Infinity → treat as non-equal unless both are identical
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return Object.is(a, b); // NaN === NaN, Inf === Inf
    }
    // Integer exact match (avoid float tolerance for integers)
    if (Number.isInteger(a) && Number.isInteger(b)) return a === b;
    // Float tolerance
    return Math.abs(a - b) <= eps;
  }

  // Mixed number/string coercion (e.g. "1" vs 1)
  if (typeof a === "number" && typeof b === "string") {
    const bn = Number(b);
    if (!isNaN(bn)) return deepCompare(a, bn, eps);
  }
  if (typeof a === "string" && typeof b === "number") {
    const an = Number(a);
    if (!isNaN(an)) return deepCompare(an, b, eps);
  }

  // Boolean comparison
  if (typeof a === "boolean" && typeof b === "boolean") return a === b;

  // Array comparison (order-sensitive)
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepCompare(v, b[i], eps));
  }

  // Object comparison
  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(k => deepCompare(a[k], b[k], eps));
  }

  // String comparison (case-insensitive fallback)
  if (typeof a === "string" && typeof b === "string") {
    return a.trim() === b.trim();
  }

  return false;
}

// ── MODE: UNORDERED ─────────────────────────────────────────────────────────

function compareUnordered(actual: string, expected: string): boolean {
  const a = normalizeOutput(actual);
  const e = normalizeOutput(expected);
  try {
    const pa = JSON.parse(a);
    const pe = JSON.parse(e);
    if (Array.isArray(pa) && Array.isArray(pe)) {
      if (pa.length !== pe.length) return false;
      const sa = [...pa].map(x => JSON.stringify(x)).sort();
      const se = [...pe].map(x => JSON.stringify(x)).sort();
      return JSON.stringify(sa) === JSON.stringify(se);
    }
  } catch { /* fall through */ }

  const al = a.split("\n").map(l => l.trim()).filter(Boolean).sort();
  const el = e.split("\n").map(l => l.trim()).filter(Boolean).sort();
  return JSON.stringify(al) === JSON.stringify(el);
}

// ── MODE: FLOAT ─────────────────────────────────────────────────────────────

function compareFloat(actual: string, expected: string, eps = EPS): boolean {
  const an = Number(actual.trim());
  const en = Number(expected.trim());
  if (Number.isFinite(an) && Number.isFinite(en)) return Math.abs(an - en) <= eps;
  return compareExact(actual, expected);
}

// ── MODE: MULTILINE ─────────────────────────────────────────────────────────

function compareMultiline(actual: string, expected: string): boolean {
  const splitTrimmed = (s: string) =>
    s.replace(/\r\n/g, "\n").trim().split("\n").map(l => l.trim()).filter(Boolean);

  const al = splitTrimmed(actual);
  const el = splitTrimmed(expected);

  if (al.length !== el.length) return false;
  return al.every((line, i) => line.toLowerCase() === el[i].toLowerCase());
}
