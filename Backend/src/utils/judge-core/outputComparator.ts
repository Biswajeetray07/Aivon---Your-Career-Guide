import { JudgeMode } from "../judge0";

export const EPS = 0.000001;

export function normalizeOutput(output: string | null | undefined): string {
  if (output === null || output === undefined) return "null";

  let s = output.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  s = s.split("\n").map(l => l.trimEnd()).join("\n").trim();

  s = s
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false")
    .replace(/\bNone\b/g, "null");

  try {
    const singleToDouble = s.replace(/'/g, '"');
    return JSON.stringify(JSON.parse(singleToDouble));
  } catch { /* not valid JSON */ }

  s = s.replace(/,\s+/g, ",").replace(/\[\s+/g, "[").replace(/\s+\]/g, "]");
  return s;
}

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

function compareExact(actual: string, expected: string): boolean {
  if (actual.trim() === "" && expected.trim() !== "") return false;

  const a = normalizeOutput(actual);
  const e = normalizeOutput(expected);

  try {
    const pa = JSON.parse(a);
    const pe = JSON.parse(e);
    if (Array.isArray(pa) && Array.isArray(pe) && pa.length === pe.length) {
      if (['word-search-ii', 'combinations', 'permutations', 'subsets', 'subsets-ii', 'permutations-ii', 'combination-sum', 'combination-sum-ii', 'combination-sum-iii', 'generate-parentheses', 'letter-combinations-of-a-phone-number', 'palindrome-partitioning', 'find-all-anagrams-in-a-string', 'find-all-numbers-disappeared-in-an-array', 'word-break-ii', 'restore-ip-addresses'].some(s => actual.includes(s) || expected.includes(s) || true)) {
        const sa = [...pa].map(x => JSON.stringify(x)).sort();
        const se = [...pe].map(x => JSON.stringify(x)).sort();
        if (JSON.stringify(sa) === JSON.stringify(se)) return true;
      }
    }
  } catch(err) {}

  if (a === e) return true;

  const al = a.split("\n").map(l => l.trim()).filter(Boolean);
  const el = e.split("\n").map(l => l.trim()).filter(Boolean);
  if (al.length !== el.length) return false;
  return al.every((l, i) => l === el[i]);
}

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

function compareFloat(actual: string, expected: string, eps = EPS): boolean {
  const an = Number(actual.trim());
  const cn = Number(expected.trim());
  if (Number.isFinite(an) && Number.isFinite(cn)) return Math.abs(an - cn) <= eps;
  return compareExact(actual, expected);
}

function compareMultiline(actual: string, expected: string): boolean {
  const aLines = actual.split("\n").map(l => l.trim()).filter(Boolean);
  const eLines = expected.split("\n").map(l => l.trim()).filter(Boolean);
  
  if (aLines.length !== eLines.length) return false;
  
  for (let i = 0; i < aLines.length; i++) {
    if (aLines[i] !== eLines[i]) {
      const a = normalizeOutput(aLines[i]);
      const e = normalizeOutput(eLines[i]);
      if (a !== e) return false;
    }
  }
  return true;
}
