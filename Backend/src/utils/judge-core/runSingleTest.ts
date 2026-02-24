import { normalizeExecution } from "./executionNormalizer";
import { classifyVerdict } from "./verdictClassifier";
import { sanitizeError } from "./errorSanitizer";
import { compareElite } from "./outputComparator";
import { runSpjChecker, parseExecutionOutput } from "../judge0"; // We continue using our robust SPJ runner

// Provide safeExec locally if missing or pass it in. We assume safeExec is in the caller, but we can just use the promise.
// Or we pass spjPassed boolean directly from caller to keep this pure.
export async function runSingleTest(params: {
  rawExec: any;
  expectedOutput: string;
  testInput: string;
  language: string;
  judgeMode?: string;
  spjCode?: string | null;
}) {
  const { rawExec, expectedOutput, testInput, language, judgeMode = "exact", spjCode } = params;
  
  // 1. Normalize Docker/Judge0 output into standard internal format
  const exec = normalizeExecution(rawExec);

  // 2. Parse stdout to isolate user printed output vs return value
  // We use our existing parseExecutionOutput to safely split the ###AIVON_RES### separator
  // If no separator, the entire stdout logic acts as fallback.
  const { stdout, actual } = parseExecutionOutput(rawExec.stdout || "");
  exec.stdout = stdout || "";

  // 3. Compare with Expected
  let outputMatch = false;
  let spjMessage: string | undefined;

  // If Judge0 claims it ran successfully, check comparator.
  if (exec.exitCode === 0) {
    if (judgeMode === "spj" && spjCode) {
      // Run SPJ checker (assume runSpjChecker has internal timeout/safety)
      try {
        const spjResult = await runSpjChecker(spjCode, testInput, actual ?? "", expectedOutput);
        outputMatch = spjResult.ok;
        spjMessage = spjResult.message;
      } catch (err: any) {
        outputMatch = false;
        spjMessage = "SPJ Error: " + err.message;
      }
    } else {
      outputMatch = compareElite(actual, expectedOutput, judgeMode as any);
    }
  }

  // 4. Classify Verdict with Strict Precedence
  const compileErrorMatch = exec.judge0StatusId === 6 || exec.judge0StatusId === 14; 
  const verdictInfo = classifyVerdict({
    compileError: compileErrorMatch ? exec.compileOutput || exec.stderr : null,
    exec,
    outputMatch
  });

  // 5. Clean potential runtime Python/JS error messages of internal sandbox junk
  const cleanError = sanitizeError(
    verdictInfo.errorMessage || exec.stderr,
    language,
    exec.judge0StatusId
  );

  return {
    verdict: verdictInfo.verdict,
    runtimeMs: exec.timeMs,
    memoryKb: exec.memoryKb,
    stdout: exec.stdout,
    actualOutput: actual,
    errorMessage: cleanError.message,
    errorLine: cleanError.line,
    errorType: cleanError.errorType,
    rawError: cleanError.raw
  };
}
