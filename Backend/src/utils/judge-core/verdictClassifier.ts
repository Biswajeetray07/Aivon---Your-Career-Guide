import { RawExecResult } from "./executionNormalizer";

export function classifyVerdict(params: {
  compileError?: string | null;
  exec: RawExecResult;
  outputMatch?: boolean;
}) {
  const { compileError, exec, outputMatch } = params;

  // 1️⃣ Compile Error (Syntax error or explicit CE)
  if (compileError || exec.judge0StatusId === 6 || exec.judge0StatusId === 14) {
    return {
      verdict: "Compile Error",
      errorMessage: compileError || exec.compileOutput || exec.stderr
    };
  }

  // 2️⃣ TLE (Hard timeout from Runner or Judge0)
  if (exec.timedOut || exec.signal === "SIGKILL" || exec.judge0StatusId === 5) {
    return { verdict: "Time Limit Exceeded" };
  }

  // 3️⃣ MLE (OOM killer or configured limit)
  if (exec.memoryExceeded) {
    return { verdict: "Memory Limit Exceeded" };
  }

  // 4️⃣ Runtime Error (Crashes, Unhandled Exceptions)
  if (exec.exitCode !== 0) {
    return {
      verdict: "Runtime Error",
      errorMessage: exec.stderr || "Runtime failure (exit code " + exec.exitCode + ")"
    };
  }

  // 5️⃣ Wrong Answer (Execution succeeded, but output doesn't match expected)
  if (outputMatch === false || exec.judge0StatusId === 4) {
    return { verdict: "Wrong Answer" };
  }

  // 6️⃣ Accepted (Passes all checks)
  return { verdict: "Accepted" };
}
