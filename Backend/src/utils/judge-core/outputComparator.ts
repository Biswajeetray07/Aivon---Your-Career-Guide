export type JudgeMode = "exact" | "unordered" | "float" | "multiline" | "spj";

export function normalizeOutput(output: string | null): string {
  if (output === null || output === undefined) return "null";
  
  let s = output.trim().replace(/\r\n/g, "\n");
  s = s.split("\n").map(l => l.trimEnd()).join("\n").trim();
  
  s = s
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false")
    .replace(/\bNone\b/g, "null");
    
  try {
    const singleToDouble = s.replace(/'/g, '"');
    return JSON.stringify(JSON.parse(singleToDouble));
  } catch { /* not valid JSON, fall through */ }
  
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
  
  if (a === e) return true;
  if (a.toLowerCase() === e.toLowerCase()) return true;
  
  try {
    const pa = JSON.parse(a);
    const pe = JSON.parse(e);
    if (deepCompare(pa, pe)) return true;
  } catch { /* not JSON */ }
  
  return a.replace(/\s+/g, "") === e.replace(/\s+/g, "");
}

function deepCompare(a: any, b: any, eps = 1e-4): boolean {
  if (a === b) return true;
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= eps;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepCompare(v, b[i], eps));
  }
  if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(k => deepCompare(a[k], b[k], eps));
  }
  return false;
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

function compareFloat(actual: string, expected: string, eps = 1e-4): boolean {
  const an = Number(actual.trim());
  const en = Number(expected.trim());
  if (Number.isFinite(an) && Number.isFinite(en)) return Math.abs(an - en) <= eps;
  return compareExact(actual, expected);
}

function compareMultiline(actual: string, expected: string): boolean {
  const splitTrimmed = (s: string) =>
    s.replace(/\r\n/g, "\n").trim().split("\n").map(l => l.trim()).filter(Boolean);
    
  const al = splitTrimmed(actual);
  const el = splitTrimmed(expected);
  
  if (al.length !== el.length) return false;
  return al.every((line, i) => line.toLowerCase() === el[i].toLowerCase());
}
