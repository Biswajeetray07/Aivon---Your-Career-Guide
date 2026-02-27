// @ts-nocheck — tests/ is excluded from tsconfig.json; runs via tsx
/**
 * Error Intelligence Pipeline — Comprehensive Integration Test
 * Tests all 5 error categories + 7 WA sub-detectors end-to-end.
 */
import { analyzeError, type ErrorIntelResult } from "../src/utils/error-intel/pipeline";

// ─────────────────────────── Test Harness ───────────────────────────
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    const msg = `  ❌ ${name}${detail ? ` → ${detail}` : ""}`;
    console.log(msg);
    failures.push(msg);
  }
}

function section(label: string) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`${"═".repeat(60)}`);
}

// ─────────────── 1. ACCEPTED (sanity baseline) ────────────────────
section("1. ACCEPTED — Should return isError=false");
{
  const r = analyzeError("python", 3, null, null, false, false, 0, true);
  assert("category = ACCEPTED", r.category === "ACCEPTED");
  assert("isError = false", r.isError === false);
  assert("hints is empty", r.hints.length === 0);
}

// ─────────────── 2. COMPILE ERROR ─────────────────────────────────
section("2. COMPILE ERROR — Python SyntaxError");
{
  const stderr = `  File "solution.py", line 5\n    if x == 3\n            ^\nSyntaxError: expected ':'`;
  const r = analyzeError("python", 6, stderr, stderr, false, false, 0, false);
  assert("category = COMPILE_ERROR", r.category === "COMPILE_ERROR");
  assert("isError = true", r.isError === true);
  assert("errorType = SyntaxError", r.errorType === "SyntaxError");
  assert("pattern matched", r.pattern != null);
  assert("pattern id = PY_SYNTAX_ERROR", r.pattern?.id === "PY_SYNTAX_ERROR");
  assert("has hints", r.hints.length > 0);
  assert("message is truthy", !!r.message);
  console.log("    → Message:", r.message);
  console.log("    → Hints:", r.hints);
}

// ─────────────── 3. RUNTIME ERROR — Python IndexError ─────────────
section("3. RUNTIME ERROR — Python IndexError");
{
  const stderr = `Traceback (most recent call last):\n  File "solution.py", line 12, in <module>\n    print(arr[10])\nIndexError: list index out of range`;
  const r = analyzeError("python", 11, stderr, null, false, false, 1, false);
  assert("category = RUNTIME_ERROR", r.category === "RUNTIME_ERROR");
  assert("isError = true", r.isError === true);
  assert("errorType = IndexError", r.errorType === "IndexError");
  assert("pattern id = PY_INDEX_ERROR", r.pattern?.id === "PY_INDEX_ERROR");
  assert("has hints", r.hints.length > 0);
  console.log("    → Hints:", r.hints);
}

// ─────────────── 4. RUNTIME ERROR — Python ZeroDivision ───────────
section("4. RUNTIME ERROR — Python ZeroDivisionError");
{
  const stderr = `ZeroDivisionError: division by zero`;
  const r = analyzeError("python", 11, stderr, null, false, false, 1, false);
  assert("category = RUNTIME_ERROR", r.category === "RUNTIME_ERROR");
  assert("errorType = ZeroDivisionError", r.errorType === "ZeroDivisionError");
  assert("pattern matched", r.pattern?.id === "PY_ZERO_DIVISION");
  console.log("    → Message:", r.message);
}

// ─────────────── 5. RUNTIME ERROR — Python RecursionError ─────────
section("5. RUNTIME ERROR — Python RecursionError");
{
  const stderr = `RecursionError: maximum recursion depth exceeded in comparison`;
  const r = analyzeError("python", 11, stderr, null, false, false, 1, false);
  assert("errorType = RecursionError", r.errorType === "RecursionError");
  assert("has stack overflow hint", r.hints.some(h => h.toLowerCase().includes("recursion") || h.toLowerCase().includes("base case")));
}

// ─────────────── 6. TLE ───────────────────────────────────────────
section("6. TLE — Time Limit Exceeded");
{
  const r = analyzeError("cpp", 5, null, null, true, false, 0, false);
  assert("category = TLE", r.category === "TLE");
  assert("isError = true", r.isError === true);
  assert("has optimization hints", r.hints.some(h => h.includes("too long") || h.includes("O(N")));
  console.log("    → Hints:", r.hints);
}

// ─────────────── 7. MLE ───────────────────────────────────────────
section("7. MLE — Memory Limit Exceeded");
{
  const r = analyzeError("java", 12, null, null, false, true, 0, false);
  assert("category = MLE", r.category === "MLE");
  assert("has memory hints", r.hints.some(h => h.includes("memory")));
  console.log("    → Hints:", r.hints);
}

// ┌─────────────────────────────────────────────────────────────────┐
// │        WRONG ANSWER — 7 Sub-Detector Tests                     │
// └─────────────────────────────────────────────────────────────────┘

// ─────────── 8. WA: FORMAT_MISMATCH (trailing whitespace) ────────
section("8. WA Detector: FORMAT_MISMATCH");
{
  // Same characters, different formatting (newlines vs spaces)
  const expected = "1\n2\n3";
  const actual   = "1 2 3";
  const r = analyzeError("python", 4, null, null, false, false, 0, false, expected, actual, "3\n1 2 3");
  assert("category = WRONG_ANSWER", r.category === "WRONG_ANSWER");
  assert("waRootCause exists", r.waRootCause != null);
  assert("waRootCause.cause = FORMAT_MISMATCH", r.waRootCause?.cause === "FORMAT_MISMATCH");
  assert("level1 hint mentions format/spacing", 
    (r.waRootCause?.hints.level1.toLowerCase().includes("format") || 
     r.waRootCause?.hints.level1.toLowerCase().includes("correct") ||
     r.waRootCause?.hints.level1.toLowerCase().includes("spacing")) || false);
  console.log("    → Cause:", r.waRootCause?.cause, "| Confidence:", r.waRootCause?.confidence);
  console.log("    → L1:", r.waRootCause?.hints.level1);
}

// ─────────── 9. WA: ORDERING_MISMATCH ────────────────────────────
section("9. WA Detector: ORDERING_MISMATCH");
{
  const expected = "1 2 3 4 5";
  const actual   = "5 4 3 2 1";
  const r = analyzeError("python", 4, null, null, false, false, 0, false, expected, actual, "5\n1 2 3 4 5");
  assert("category = WRONG_ANSWER", r.category === "WRONG_ANSWER");
  assert("waRootCause exists", r.waRootCause != null);
  console.log("    → Cause:", r.waRootCause?.cause, "| Confidence:", r.waRootCause?.confidence);
  console.log("    → L1:", r.waRootCause?.hints.level1);
  console.log("    → Evidence:", r.waRootCause?.evidence);
}

// ─────────── 10. WA: OFF_BY_ONE ──────────────────────────────────
section("10. WA Detector: OFF_BY_ONE");
{
  const expected = "1 2 3 4 5";
  const actual   = "1 2 3 4";     // missing last element
  const r = analyzeError("python", 4, null, null, false, false, 0, false, expected, actual, "5\n1 2 3 4 5");
  assert("category = WRONG_ANSWER", r.category === "WRONG_ANSWER");
  assert("waRootCause exists", r.waRootCause != null);
  console.log("    → Cause:", r.waRootCause?.cause, "| Confidence:", r.waRootCause?.confidence);
  console.log("    → L1:", r.waRootCause?.hints.level1);
}

// ─────────── 11. WA: FLOAT_PRECISION ─────────────────────────────
section("11. WA Detector: FLOAT_PRECISION");
{
  const expected = "3.14159";
  const actual   = "3.14";
  const r = analyzeError("python", 4, null, null, false, false, 0, false, expected, actual, "pi test");
  assert("category = WRONG_ANSWER", r.category === "WRONG_ANSWER");
  assert("waRootCause exists", r.waRootCause != null);
  console.log("    → Cause:", r.waRootCause?.cause, "| Confidence:", r.waRootCause?.confidence);
  console.log("    → L1:", r.waRootCause?.hints.level1);
}

// ─────────── 12. WA: INTEGER_OVERFLOW ────────────────────────────
section("12. WA Detector: INTEGER_OVERFLOW");
{
  const expected = "9000000000";   // > 2^31
  const actual   = "-1294967296";  // wrapped negative
  const r = analyzeError("cpp", 4, null, null, false, false, 0, false, expected, actual, "big sum");
  assert("category = WRONG_ANSWER", r.category === "WRONG_ANSWER");
  assert("waRootCause exists", r.waRootCause != null);
  console.log("    → Cause:", r.waRootCause?.cause, "| Confidence:", r.waRootCause?.confidence);
  console.log("    → L1:", r.waRootCause?.hints.level1);
}

// ─────────── 13. WA: EDGE_CASE_MISS ─────────────────────────────
section("13. WA Detector: EDGE_CASE_MISS");
{
  const expected = "0";
  const actual   = "";              // empty output for n=0
  const r = analyzeError("python", 4, null, null, false, false, 0, false, expected, actual, "0");
  assert("category = WRONG_ANSWER", r.category === "WRONG_ANSWER");
  assert("waRootCause exists", r.waRootCause != null);
  console.log("    → Cause:", r.waRootCause?.cause, "| Confidence:", r.waRootCause?.confidence);
  console.log("    → L1:", r.waRootCause?.hints.level1);
}

// ─────────── 14. WA: PARTIAL_LOGIC_ERROR ─────────────────────────
section("14. WA Detector: PARTIAL_LOGIC");
{
  const expected = "1 2 3 4 5 6 7 8 9 10";
  const actual   = "1 2 3 0 0 0 0 0 0 0";   // correct prefix, then wrong
  const r = analyzeError("python", 4, null, null, false, false, 0, false, expected, actual, "generate 1..10");
  assert("category = WRONG_ANSWER", r.category === "WRONG_ANSWER");
  assert("waRootCause exists", r.waRootCause != null);
  console.log("    → Cause:", r.waRootCause?.cause, "| Confidence:", r.waRootCause?.confidence);
  console.log("    → L1:", r.waRootCause?.hints.level1);
}

// ─────────── 15. WA: GENERIC (no specific detector) ──────────────
section("15. WA: GENERIC — completely wrong output");
{
  const expected = "hello world";
  const actual   = "goodbye universe";
  const r = analyzeError("python", 4, null, null, false, false, 0, false, expected, actual, "test");
  assert("category = WRONG_ANSWER", r.category === "WRONG_ANSWER");
  assert("waRootCause exists", r.waRootCause != null);
  console.log("    → Cause:", r.waRootCause?.cause, "| Confidence:", r.waRootCause?.confidence);
  console.log("    → L1:", r.waRootCause?.hints.level1);
}

// ──────────────────── DiffSignal Deep Dive ────────────────────────
section("16. DiffSignal Structure Verification");
{
  const expected = "10 20 30 40 50";
  const actual   = "10 20 99 40 50";
  const r = analyzeError("python", 4, null, null, false, false, 0, false, expected, actual, "5 values");
  assert("diffSignal exists", r.waRootCause?.diffSignal != null);
  const ds = r.waRootCause?.diffSignal;
  if (ds) {
    assert("firstMismatchIndex = 2 (token 99)", ds.firstMismatchIndex === 2);
    assert("lengthDelta = 0 (same count)", ds.lengthDelta === 0);
    assert("prefixMatchRatio > 0", ds.prefixMatchRatio > 0);
    assert("suffixMatchRatio > 0", ds.suffixMatchRatio > 0);
    console.log("    → DiffSignal:", JSON.stringify(ds, null, 2));
  }
}

// ──────────────────── Response Shape for API ─────────────────────
section("17. API Response Shape Conformance");
{
  const r = analyzeError("python", 11, "IndexError: list index out of range", null, false, false, 1, false);
  assert("has isError", typeof r.isError === "boolean");
  assert("has category", typeof r.category === "string");
  assert("has errorType", r.errorType === null || typeof r.errorType === "string");
  assert("has line", r.line === null || typeof r.line === "number");
  assert("has message", r.message === null || typeof r.message === "string");
  assert("has hints array", Array.isArray(r.hints));
}

// ═══════════════════════ FINAL SCOREBOARD ═════════════════════════
section(`SCOREBOARD`);
console.log(`\n  ✅ Passed: ${passed}`);
console.log(`  ❌ Failed: ${failed}`);
console.log(`  📊 Total:  ${passed + failed}`);
console.log(`  🎯 Rate:   ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

if (failures.length > 0) {
  console.log("  Failures:");
  failures.forEach(f => console.log(f));
}

process.exit(failed > 0 ? 1 : 0);
