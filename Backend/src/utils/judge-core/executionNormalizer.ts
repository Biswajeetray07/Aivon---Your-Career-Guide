export type RawExecResult = {
  exitCode: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  compileOutput: string;
  timeMs: number;
  memoryKb: number;
  timedOut: boolean;
  memoryExceeded: boolean;
  judge0StatusId: number;
};

export function normalizeExecution(rawJudge0: any): RawExecResult {
  const statusId = rawJudge0.status?.id || 13; // Default to Internal Error
  return {
    exitCode: (statusId >= 7 && statusId <= 12) ? 1 : ((statusId === 3 || statusId === 4) ? 0 : null),
    signal: statusId === 7 ? "SIGSEGV" : (statusId === 9 ? "SIGFPE" : null),
    stdout: String(rawJudge0.stdout || ""),
    stderr: String(rawJudge0.stderr || ""),
    compileOutput: String(rawJudge0.compile_output || ""),
    timeMs: rawJudge0.time ? Math.round(parseFloat(rawJudge0.time) * 1000) : 0,
    memoryKb: rawJudge0.memory ? rawJudge0.memory : 0,
    timedOut: statusId === 5 || Boolean(rawJudge0.timeout),
    memoryExceeded: statusId === 8 || Boolean(rawJudge0.memoryExceeded),
    judge0StatusId: statusId
  };
}
