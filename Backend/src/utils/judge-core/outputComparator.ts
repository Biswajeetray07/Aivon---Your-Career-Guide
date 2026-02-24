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
    if (JSON.stringify(pa) === JSON.stringify(pe)) return true;
    if (typeof pa === "number" && typeof pe === "number") return Math.abs(pa - pe) < 1e-5;
    if (typeof pa === "boolean" && typeof pe === "boolean") return pa === pe;
    
    if (Array.isArray(pa) && Array.isArray(pe) && pa.length === pe.length) {
      if (pa.every((v, i) => typeof v === "number" && typeof pe[i] === "number")) {
        return pa.every((v, i) => Math.abs(v - pe[i]) < 1e-5);
      }
    }
  } catch { /* not JSON */ }
  
  return a.replace(/\s+/g, "") === e.replace(/\s+/g, "");
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

function compareFloat(actual: string, expected: string, eps = 1e-5): boolean {
  const an = Number(actual.trim());
  const en = Number(expected.trim());
  if (Number.isFinite(an) && Number.isFinite(en)) return Math.abs(an - en) < eps;
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
