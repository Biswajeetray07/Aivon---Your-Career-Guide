export function formatJudgeResponse(data: {
  submissionId?: string;
  verdict: string;
  passed: number;
  total: number;
  failedCase: number | null;
  runtimeMs: number | null;
  memoryMb: number | null;
  testCaseResults: any[];
}) {
  return {
    success: true,
    submissionId: data.submissionId,
    verdict: data.verdict,
    passed: data.passed,
    total: data.total,
    failedCase: data.failedCase,
    runtimeMs: data.runtimeMs ?? null, 
    memoryMb: data.memoryMb ?? null,
    testCaseResults: data.testCaseResults
  };
}
