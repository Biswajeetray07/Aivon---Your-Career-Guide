import axios from "axios";

// ─── Language IDs for Judge0 CE ──────────────────────────────────────────────

export const LANGUAGE_IDS: Record<string, number> = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
  typescript: 74,
  go: 60,
  rust: 73,
  csharp: 51,
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RunCodeResult {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
}

export interface StructuredError {
  verdict: string;
  errorType: string;
  line: number | null;
  message: string;
  raw: string;
}

// ─── Verdict code mapping (canonical, industry-standard) ─────────────────────
//
// Judge0 status IDs:
//  1 = In Queue, 2 = Processing
//  3 = Accepted, 4 = Wrong Answer
//  5 = Time Limit Exceeded, 6 = Compilation Error
//  7 = RE (SIGSEGV), 8 = RE (SIGXFSZ), 9 = RE (SIGFPE),
// 10 = RE (SIGABRT), 11 = RE (NZEC), 12 = RE (Other)
// 13 = Internal Error, 14 = Exec Format Error (CE equivalent)
// All others → INTERNAL_ERROR

export function judgeStatusToVerdictCode(statusId: number): string {
  if (statusId === 3) return "ACCEPTED";
  if (statusId === 4) return "WRONG_ANSWER";
  if (statusId === 5) return "TIME_LIMIT_EXCEEDED";
  if (statusId === 6) return "COMPILATION_ERROR";
  if (statusId >= 7 && statusId <= 12) return "RUNTIME_ERROR";
  if (statusId === 14) return "COMPILATION_ERROR"; // Exec format error
  return "INTERNAL_ERROR";
}

// ─── Deterministic Verdict Normalizer ──────────────────────────────────────────
// Priority: INTERNAL_ERROR > COMPILATION_ERROR > RUNTIME_ERROR > TIME_LIMIT_EXCEEDED > MEMORY_LIMIT_EXCEEDED > WRONG_ANSWER > ACCEPTED
export function computeOverallVerdict(
  testResults: { passed: boolean; errorDetails?: { verdict: string } | null }[],
  isCompilationError: boolean = false
): string {
  if (isCompilationError) return "COMPILATION_ERROR";
  if (testResults.length === 0) return "INTERNAL_ERROR";

  const verdicts = testResults.map(r => r.errorDetails?.verdict ?? (r.passed ? "ACCEPTED" : "WRONG_ANSWER"));

  if (verdicts.includes("Internal Error") || verdicts.includes("INTERNAL_ERROR") || verdicts.includes("Judge Unavailable")) return "INTERNAL_ERROR";
  if (verdicts.includes("Compile Error") || verdicts.includes("COMPILATION_ERROR")) return "COMPILATION_ERROR";
  if (verdicts.includes("Runtime Error") || verdicts.includes("RUNTIME_ERROR")) return "RUNTIME_ERROR";
  if (verdicts.includes("Time Limit Exceeded") || verdicts.includes("TIME_LIMIT_EXCEEDED")) return "TIME_LIMIT_EXCEEDED";
  if (verdicts.includes("Memory Limit Exceeded") || verdicts.includes("MEMORY_LIMIT_EXCEEDED")) return "MEMORY_LIMIT_EXCEEDED";
  if (verdicts.includes("Wrong Answer on Hidden Test") || verdicts.includes("WRONG_ANSWER_ON_HIDDEN_TEST")) return "WRONG_ANSWER_ON_HIDDEN_TEST";
  if (verdicts.includes("Wrong Answer") || verdicts.includes("WRONG_ANSWER")) return "WRONG_ANSWER";

  return testResults.every(r => r.passed) ? "ACCEPTED" : "WRONG_ANSWER";
}

// Keep backward-compat alias
export const judgeStatusToSubmissionStatus = judgeStatusToVerdictCode;

// ─── Execute code on Judge0 ──────────────────────────────────────────────────

export async function runCode(
  code: string,
  language: string,
  stdin: string
): Promise<RunCodeResult> {
  const languageId = LANGUAGE_IDS[language.toLowerCase()];
  if (!languageId) throw new Error(`Unsupported language: ${language}`);

  const apiHeaders = {
    "X-RapidAPI-Key": process.env.JUDGE0_API_KEY!,
    "X-RapidAPI-Host": process.env.JUDGE0_API_HOST!,
    "Content-Type": "application/json",
  };

  // Helper: retry a request once on transient network/rate-limit failures
  async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      const isRetriable =
        err.code === "ECONNABORTED" ||
        err.code === "ETIMEDOUT" ||
        err.response?.status === 429;
      if (isRetriable) {
        await new Promise((r) => setTimeout(r, 2000));
        return fn();
      }
      throw err;
    }
  }

  // 1. Submit async (wait=false)
  const submitRes = await withRetry(() =>
    axios.post(
      `https://${process.env.JUDGE0_API_HOST}/submissions?base64_encoded=false&wait=false`,
      {
        source_code: code,
        language_id: languageId,
        stdin,
        cpu_time_limit: 2,
        memory_limit: 262144,
        wall_time_limit: 5,
      },
      { headers: apiHeaders, timeout: 15000 }
    )
  );

  const token = submitRes.data.token;
  if (!token) throw new Error("Failed to get submission token from Judge0");

  // 2. Poll for result (max 20 attempts, 1.0s delay each ≈ 20s total)
  //    This must finish well within the 30s frontend timeout.
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    let data: any;
    try {
      const resultRes = await axios.get(
        `https://${process.env.JUDGE0_API_HOST}/submissions/${token}?base64_encoded=false`,
        { headers: apiHeaders, timeout: 15000 }
      );
      data = resultRes.data;
    } catch (pollErr: any) {
      // Network/rate-limit error while polling — retry, don't give up
      if (attempt < 24) continue;
      throw new Error(`[JUDGE0_API_ERROR] Judge0 API unreachable: ${pollErr.message}`);
    }

    // Status 1 (In Queue) or Status 2 (Processing) means we wait
    if (data.status?.id === 1 || data.status?.id === 2) {
      continue;
    }

    return data as RunCodeResult;
  }

  // ⚠ IMPORTANT: This is an infrastructure timeout, NOT a code TLE.
  // The error message prefix [JUDGE0_POLL_TIMEOUT] lets catch blocks distinguish it.
  throw new Error("[JUDGE0_POLL_TIMEOUT] Execution timed out waiting for Judge0 response");
}

// ─── Execute raw Python script (Generator / Oracle) ──────────────────────────
export async function runRawPython(code: string, stdin: string = ""): Promise<RunCodeResult> {
  const languageId = LANGUAGE_IDS["python"];
  const apiHeaders = {
    "X-RapidAPI-Key": process.env.JUDGE0_API_KEY!,
    "X-RapidAPI-Host": process.env.JUDGE0_API_HOST!,
    "Content-Type": "application/json",
  };

  const submitRes = await axios.post(
    `https://${process.env.JUDGE0_API_HOST}/submissions?base64_encoded=false&wait=false`,
    {
      source_code: code,
      language_id: languageId,
      stdin,
      cpu_time_limit: 3, 
      memory_limit: 262144,
      wall_time_limit: 6,
    },
    { headers: apiHeaders, timeout: 15000 }
  );

  const token = submitRes.data.token;
  if (!token) throw new Error("Failed to get submission token from Judge0 for Raw Script");

  for (let attempt = 0; attempt < 15; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    let data: any;
    try {
      const resultRes = await axios.get(
        `https://${process.env.JUDGE0_API_HOST}/submissions/${token}?base64_encoded=false`,
        { headers: apiHeaders, timeout: 10000 }
      );
      data = resultRes.data;
    } catch { continue; }
    if (data.status?.id === 1 || data.status?.id === 2) continue;
    return data as RunCodeResult;
  }
  throw new Error("[JUDGE0_POLL_TIMEOUT] Raw Python Script Timeout");
}

// ─── Execution Output Parser ──────────────────────────────────────────────────
//
// The template prints "###AIVON_RES###\n" before the serialized return value.
// Everything printed BEFORE the separator is the user's stdout (console.log / print).
// Everything AFTER is the actual return value.
//
// FALLBACK: If no separator is found (e.g. old cached template, or server not yet
// restarted to pick up template changes), treat the ENTIRE raw output as `actual`.
// This ensures correct solutions never show "(no output)" just because the
// separator line is missing.

export function parseExecutionOutput(raw: string | null): { stdout: string | null; actual: string | null } {
  if (!raw) return { stdout: null, actual: null };

  // Normalise line endings (Judge0 can return \r\n on some runtimes)
  const normalised = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const SEP = "###AIVON_RES###\n";
  const sepIdx = normalised.indexOf(SEP);

  if (sepIdx === -1) {
    // No separator found.
    // IMPORTANT FALLBACK: treat the entire stdout as the return value (actual).
    // This handles the case where the server hasn't restarted after template changes,
    // OR where the user isn't printing anything themselves.
    // We DON'T show this as stdout because it would cause "(no output)" in the
    // "Your Output" box even though the code ran correctly.
    const val = normalised.trim();
    return { stdout: null, actual: val || null };
  }

  const stdoutRaw = normalised.slice(0, sepIdx).trim();
  const actualRaw = normalised.slice(sepIdx + SEP.length).trim();

  return {
    stdout: stdoutRaw || null,
    actual: actualRaw || null,
  };
}

// ─── Output normalization ─────────────────────────────────────────────────────
//
// Normalises both the actual output and expected output to a canonical compact
// JSON-like string before comparison.

export function normalizeOutput(output: string | null): string {
  if (output === null || output === undefined) return "null";

  let s = output.trim().replace(/\r\n/g, "\n");

  // Strip trailing whitespace from each line
  s = s.split("\n").map(l => l.trimEnd()).join("\n").trim();

  // Python literal → JSON
  s = s
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false")
    .replace(/\bNone\b/g, "null");

  // Try to parse + re-serialise as JSON to get canonical compact form
  // e.g. "[1, 2, 3]" → "[1,2,3]", "{'a': 1}" → '{"a":1}'
  try {
    // Replace Python single-quoted strings first
    const singleToDouble = s.replace(/'/g, '"');
    const parsed = JSON.parse(singleToDouble);
    return JSON.stringify(parsed);
  } catch { /* not valid JSON, fall through */ }

  // Remove spaces after commas as a best-effort normalisation
  s = s.replace(/,\s+/g, ",").replace(/\[\s+/g, "[").replace(/\s+\]/g, "]");

  return s;
}

// ─── Elite comparator ────────────────────────────────────────────────────────────────────

// Keep as alias for any callers using old name
export const compareOutputs = (actual: string | null, expected: string) =>
  compareElite(actual, expected, "exact");

export type JudgeMode = "exact" | "unordered" | "float" | "multiline" | "spj";

/**
 * Elite comparator — dispatches to the correct mode.
 * This is modelled after how Codeforces/LeetCode handle different problem types.
 */
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
    // SPJ verdict is determined externally — compareElite is not called for it
    // but if it is, fall through to exact.
    case "spj":
    case "exact":
    default:          return compareExact(actual, expected);
  }
}

// ─── MODE: EXACT ──────────────────────────────────────────────────────────────
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

// ─── MODE: UNORDERED ─────────────────────────────────────────────────────────
// Used for problems where multiple valid orderings exist (e.g. subsets, anagrams).
function compareUnordered(actual: string, expected: string): boolean {
  const a = normalizeOutput(actual);
  const e = normalizeOutput(expected);

  // Try JSON array comparison with sort
  try {
    const pa = JSON.parse(a);
    const pe = JSON.parse(e);

    if (Array.isArray(pa) && Array.isArray(pe)) {
      if (pa.length !== pe.length) return false;
      // Sort elements as strings for stable deep comparison
      const sa = [...pa].map(x => JSON.stringify(x)).sort();
      const se = [...pe].map(x => JSON.stringify(x)).sort();
      return JSON.stringify(sa) === JSON.stringify(se);
    }
  } catch { /* fall through */ }

  // Line-based unordered fallback
  const al = a.split("\n").map(l => l.trim()).filter(Boolean).sort();
  const el = e.split("\n").map(l => l.trim()).filter(Boolean).sort();
  return JSON.stringify(al) === JSON.stringify(el);
}

// ─── MODE: FLOAT ─────────────────────────────────────────────────────────────
// Used for geometry and math problems requiring numeric tolerance.
function compareFloat(actual: string, expected: string, eps = 1e-5): boolean {
  const an = Number(actual.trim());
  const en = Number(expected.trim());
  if (Number.isFinite(an) && Number.isFinite(en)) {
    return Math.abs(an - en) < eps;
  }
  // If not numbers, fall back to exact
  return compareExact(actual, expected);
}

// ─── MODE: MULTILINE ─────────────────────────────────────────────────────────
// Used for problems with multi-line output where line order matters but
// trailing whitespace and case differences should be ignored.
function compareMultiline(actual: string, expected: string): boolean {
  const splitTrimmed = (s: string) =>
    s.replace(/\r\n/g, "\n").trim().split("\n").map(l => l.trim()).filter(Boolean);

  const al = splitTrimmed(actual);
  const el = splitTrimmed(expected);

  if (al.length !== el.length) return false;
  return al.every((line, i) => line.toLowerCase() === el[i].toLowerCase());
}

// ─── SPJ RUNNER ──────────────────────────────────────────────────────────────
//
// For problems where multiple correct outputs exist (e.g. graph paths, custom
// validators), a Special Judge checker script is run on Judge0.
//
// Checker protocol:
//   stdin = "<test_input>\n###\n<expected>\n###\n<actual>"
//   checker prints: OK or WRONG
//   exit code 0 = OK, non-zero = WRONG

export const SPJ_STDIN_SEP = "###";

export async function runSpjChecker(
  spjCode: string,
  testInput: string,
  actual: string,
  expected: string
): Promise<{ ok: boolean; message: string }> {
  // Compose the checker stdin
  const checkerStdin = [
    testInput.trim(),
    SPJ_STDIN_SEP,
    expected.trim(),
    SPJ_STDIN_SEP,
    actual?.trim() ?? "",
  ].join("\n");

  // Build the full checker script — wrap with output normalisation
  const checkerWithWrapper = `${spjCode}

import sys as _sys
_inp = _sys.stdin.read()
_parts = _inp.split("###\\n")
_test_input = _parts[0].strip() if len(_parts) > 0 else ""
_expected   = _parts[1].strip() if len(_parts) > 1 else ""
_actual     = _parts[2].strip() if len(_parts) > 2 else ""

try:
    _result = check(_test_input, _expected, _actual)
    if _result is True or _result == "OK" or _result == 1:
        print("OK")
        _sys.exit(0)
    else:
        print(str(_result) if _result else "WRONG")
        _sys.exit(1)
except Exception as _e:
    print("CHECKER_ERROR: " + str(_e))
    _sys.exit(2)
`;

  try {
    const result = await runCode(checkerWithWrapper, "python", checkerStdin);
    const output = result.stdout?.trim() ?? "";
    const ok = result.status.id === 3 && output.toUpperCase().startsWith("OK");
    return {
      ok,
      message: output || result.stderr?.trim() || result.status.description,
    };
  } catch (err: any) {
    return { ok: false, message: `SPJ runner error: ${err.message}` };
  }
}

// ─── Template header line count ───────────────────────────────────────────────
//
// When user code is wrapped in a template, Python traces report absolute line
// numbers. We need to subtract the header lines ABOVE ###USERCODE### to show
// the user's actual line number.
//
// Python templates: line 1 = import, line 2 = import, line 3 = blank, line 4 = ###USERCODE###
//   → 3 header lines
// JS templates: line 1 = ###USERCODE###
//   → 0 header lines

export function getTemplateHeaderLines(language: string): number {
  const lang = language.toLowerCase();
  if (lang === "python" || lang === "python3") return 3;
  // JS templates put ###USERCODE### at line 1
  return 0;
}

// ─── Structured error parser ──────────────────────────────────────────────────

export function parseStructuredError(
  errorText: string | null,
  language: string,
  statusId: number
): StructuredError | null {
  if (!errorText?.trim()) return null;
  const raw = errorText.trim();
  const lang = language.toLowerCase();

  // Derive human-readable verdict from status ID
  let verdict = "Runtime Error";
  if (statusId === 5) verdict = "Time Limit Exceeded";
  if (statusId === 6 || statusId === 14) verdict = "Compile Error";
  if (statusId >= 7 && statusId <= 12) verdict = "Runtime Error";

  const headerOffset = getTemplateHeaderLines(language);

  try {
    if (lang === "python" || lang === "python3") {
      return parsePythonError(raw, verdict, headerOffset);
    }
    if (lang === "javascript" || lang === "nodejs") {
      return parseJavaScriptError(raw, verdict, headerOffset);
    }
  } catch { /* fallthrough */ }

  return {
    verdict,
    errorType: "RuntimeError",
    line: null,
    message: raw.split("\n").filter(Boolean).slice(-1)[0] || raw,
    raw,
  };
}

function parsePythonError(raw: string, verdict: string, headerOffset: number = 0): StructuredError {
  const lines = raw.split("\n");

  // The last non-empty line is typically the exception type + message
  const lastLine = lines.filter(Boolean).slice(-1)[0]?.trim() ?? "";

  let errorType = "RuntimeError";
  let message = lastLine;

  const colonIdx = lastLine.indexOf(":");
  if (colonIdx > 0) {
    const candidate = lastLine.slice(0, colonIdx).trim();
    if (/^[A-Za-z][A-Za-z0-9]*(?:Error|Exception|Warning)$/.test(candidate)) {
      errorType = candidate;
      message = lastLine.slice(colonIdx + 1).trim();
    }
  }

  // SyntaxError / IndentationError → CE
  if (errorType === "SyntaxError" || errorType === "IndentationError") {
    verdict = "Compile Error";
  }

  // Try to extract the user's line number, skipping template internals
  let userLine: number | null = null;
  const TEMPLATE_MARKERS = [
    "if __name__", "__main__", "__format", "__build_tree",
    "__serialize", "__build_list", "sys.stdin", "###USERCODE###",
    "json.loads", "json.dumps", "traceback",
  ];

  for (let i = lines.length - 2; i >= 0; i--) {
    const lineMatch = lines[i].match(/\bline\s+(\d+)/i);
    if (!lineMatch) continue;
    const contextLine = lines[i + 1] ?? "";
    const isTemplateLine = TEMPLATE_MARKERS.some(m => contextLine.includes(m));
    if (!isTemplateLine) {
      const rawLineNum = parseInt(lineMatch[1], 10);
      // ⚠ CRITICAL: Subtract the template header lines to get the user's actual line
      userLine = Math.max(1, rawLineNum - headerOffset);
      break;
    }
  }

  return { verdict, errorType, line: userLine, message, raw };
}

function parseJavaScriptError(raw: string, verdict: string, headerOffset: number = 0): StructuredError {
  const lines = raw.split("\n");
  // Find the first line containing "Error:"
  const errLine = lines.find(l => /\bError:/i.test(l));

  let errorType = "RuntimeError";
  let message = lines[0] || raw;

  if (errLine) {
    const colonIdx = errLine.indexOf(":");
    if (colonIdx > 0) {
      errorType = errLine.slice(0, colonIdx).trim();
      message = errLine.slice(colonIdx + 1).trim();
      if (errorType === "SyntaxError") verdict = "Compile Error";
    }
  }

  // Grab the first user stack frame (skip node internals and template code)
  let userLine: number | null = null;
  for (const l of lines) {
    if (l.includes("at ") && !l.includes("node:") && !l.includes("__main") && !l.includes("__serialize")) {
      const m = l.match(/:(\d+):\d+/);
      if (m) {
        const rawLineNum = parseInt(m[1], 10);
        userLine = Math.max(1, rawLineNum - headerOffset);
        break;
      }
    }
  }

  return { verdict, errorType, line: userLine, message, raw };
}

// ─── Legacy string formatter (used by response schema) ───────────────────────

export function formatErrorOutput(errorText: string | null, language: string): string | null {
  if (!errorText?.trim()) return null;
  const parsed = parseStructuredError(errorText, language, 0);
  if (!parsed) return null;

  let out = parsed.errorType;
  if (parsed.line !== null) out += ` on line ${parsed.line}`;
  if (parsed.message) out += `\n\n${parsed.message}`;
  return out;
}
