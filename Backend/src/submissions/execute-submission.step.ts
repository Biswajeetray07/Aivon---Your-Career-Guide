import type { EventConfig } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import { wrapCode, formatStdin, detectProblemTypeFromInput } from "../utils/code-runner";
import { runCode, runSpjChecker, runRawPython } from "../utils/judge0";
import { runSingleTest } from "../utils/judge-core/runSingleTest";
import { aggregateResults } from "../utils/judge-core/aggregateResults";
import { safeJudge } from "../utils/judge-core/safeJudge";
import type { JudgeMode } from "../utils/judge-core/outputComparator";
import { analyzeError } from "../utils/error-intel/pipeline";

export const config: EventConfig = {
  type: "event",
  name: "ExecuteSubmission",
  description: "Runs submitted code against ALL test cases (including hidden) via Judge0",
  subscribes: ["execute-submission"],
  emits: ["submission-complete"],
  flows: ["submission-flow"],
  includeFiles: [
    "../services/prisma.ts",
    "../utils/jwt.ts",
    "../utils/code-runner.ts",
    "../utils/judge0.ts",
    "../utils/templates.ts",
    "../middlewares/auth.middleware.ts",
    "../utils/judge-core/verdictClassifier.ts",
    "../utils/judge-core/errorSanitizer.ts",
    "../utils/judge-core/runSingleTest.ts",
    "../utils/judge-core/aggregateResults.ts",
    "../utils/judge-core/safeJudge.ts",
    "../utils/judge-core/outputComparator.ts",
    "../utils/error-intel/pipeline.ts",
    "../utils/error-intel/patterns/index.ts",
    "../utils/error-intel/patterns/types.ts",
    "../utils/error-intel/patterns/common.ts",
    "../utils/error-intel/patterns/python.ts",
    "../utils/error-intel/patterns/java.ts",
    "../utils/error-intel/patterns/cpp.ts",
    "../utils/error-intel/wa/index.ts",
    "../utils/error-intel/wa/types.ts",
    "../utils/error-intel/wa/normalizer.ts",
    "../utils/error-intel/wa/diff-engine.ts",
    "../utils/error-intel/wa/ranker.ts",
    "../utils/error-intel/wa/hint-builder.ts",
    "../utils/error-intel/wa/detectors/index.ts",
    "../utils/error-intel/wa/detectors/offByOne.ts",
    "../utils/error-intel/wa/detectors/ordering.ts",
    "../utils/error-intel/wa/detectors/whitespace.ts",
    "../utils/error-intel/wa/detectors/precision.ts",
    "../utils/error-intel/wa/detectors/overflow.ts",
    "../utils/error-intel/wa/detectors/edgeCase.ts",
    "../utils/error-intel/wa/detectors/partialLogic.ts",
  ],
};

async function safeExec<T>(promise: Promise<T>, ms = 25000): Promise<T> {
  let timer: any;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("[JUDGE0_POLL_TIMEOUT] Execution timeout")), ms);
  });
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    timeout
  ]);
}

function mapToPrismaStatus(verdict: string): any {
  switch (verdict) {
    case "Accepted": return "ACCEPTED";
    case "Wrong Answer": return "WRONG_ANSWER";
    case "Wrong Answer on Hidden Test": return "WRONG_ANSWER_ON_HIDDEN_TEST";
    case "Time Limit Exceeded": return "TIME_LIMIT_EXCEEDED";
    case "Memory Limit Exceeded": return "RUNTIME_ERROR"; 
    case "Runtime Error": return "RUNTIME_ERROR";
    case "Compile Error": return "COMPILATION_ERROR";
    default: return "INTERNAL_ERROR";
  }
}

export const handler: any = async (
  payload: any,
  { logger, emit }: { logger: any; emit: any }
) => {
  let submissionId = "UNKNOWN";
  
  try {
    submissionId = payload?.data?.submissionId || payload?.submissionId;
    if (!submissionId) {
      throw new Error(`Invalid payload, missing submissionId: ${JSON.stringify(payload)}`);
    }
  } catch (e: any) {
    logger.error("ExecuteSubmission init failed (Malformatted payload)", { error: e.message });
    return; // We cannot update the DB to SYSTEM_ERROR because we don't have the submissionId
  }

  logger.info("ExecuteSubmission started", { submissionId });

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      problem: {
        include: { 
          testCases: { orderBy: { order: "asc" } },
          judgeMeta: true
        },
      },
    },
  });

  if (!submission) {
    logger.error("Submission not found", { submissionId });
    return;
  }

  const judgeMode = ((submission.problem as any).judgeMode ?? "exact") as JudgeMode;
  const spjCode = (submission.problem as any).spjCode as string | null;

  // Helper to push real-time updates to the standalone Socket.IO server
  const pushUpdate = async (event: any) => {
    try {
      const socketUrl = process.env.SOCKET_URL_INTERNAL || "http://localhost:3003";
      await fetch(`${socketUrl}/emit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
           topic: submissionId, 
           event: "judge-update", 
           payload: event 
        }),
      });
    } catch (err) {
      logger.warn("Failed to push real-time update", { err: String(err) });
    }
  };

  // Mark as RUNNING immediately
  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "RUNNING" },
  });

  await pushUpdate({
    status: "RUNNING",
    progress: { current: 0, total: submission.problem.testCases.length },
    message: "Starting execution...",
  });

  try {
    const baseProblemType = (submission.problem as any).problemType ?? "array";
    const testCases = submission.problem.testCases;

    const effectiveProblemType = testCases.length > 0
      ? detectProblemTypeFromInput(testCases[0].input, baseProblemType)
      : baseProblemType;

    logger.info("Wrapping code for submission", {
      submissionId,
      language: submission.language,
      effectiveProblemType,
      entryPoint: submission.problem.entryPoint,
    });

    const wrappedCode = wrapCode(
      submission.code,
      submission.language,
      submission.problem.entryPoint,
      effectiveProblemType
    );

    type TestResult = {
      input: string; expected: string; actual: string | null; stdout?: string | null;
      stderr: string | null; compileOutput: string | null;
      passed: boolean; runtime: number | null; verdict: string;
      errorDetails?: { verdict: string; errorType: string; line: number | null; message: string } | null;
      errorIntel?: ReturnType<typeof analyzeError>;
    };
    const testResults: TestResult[] = [];

    let totalRuntime = 0;
    let maxMemory = 0;
    let failedCaseIndex: number | null = null;
    let message: string | null = null;

    logger.info(`Starting batched execution for submission ${submissionId}`);

    for (let i = 0; i < submission.problem.testCases.length; i++) {
      const tc = submission.problem.testCases[i];
      await pushUpdate({
        status: "RUNNING",
        progress: { current: i + 1, total: submission.problem.testCases.length },
        message: `Running test case ${i + 1}/${submission.problem.testCases.length}...`,
      });

      logger.info(`Running case ${i + 1}/${submission.problem.testCases.length}`);
      try {
        const formattedInput = formatStdin(tc.input);

        logger.info("Running test case", { submissionId, caseIndex: i, input: tc.input.slice(0, 60) });
        const result = await safeExec(runCode(wrappedCode, submission.language, formattedInput), 20000);
        logger.info("Judge0 result", { submissionId, caseIndex: i, statusId: result.status.id, statusDesc: result.status.description });

        const singleResult = await runSingleTest({
          rawExec: result,
          expectedOutput: tc.expected,
          testInput: tc.input,
          language: submission.language,
          judgeMode,
          spjCode
        });

        if (singleResult.runtimeMs) totalRuntime += singleResult.runtimeMs;
        if (singleResult.memoryKb && singleResult.memoryKb > maxMemory) maxMemory = singleResult.memoryKb;

        const passed = singleResult.verdict === "Accepted";

        logger.info("Test case verdict", {
          submissionId,
          caseIndex: i,
          passed,
          verdict: singleResult.verdict
        });

        testResults.push({
          input: tc.input,
          expected: tc.expected,
          actual: singleResult.actualOutput,
          stdout: singleResult.stdout,
          stderr: singleResult.rawError || null,
          compileOutput: null,
          passed,
          runtime: singleResult.runtimeMs,
          errorDetails: (singleResult.errorType && singleResult.verdict !== "Accepted") ? {
            verdict: singleResult.verdict,
            errorType: singleResult.errorType,
            line: singleResult.errorLine,
            message: singleResult.errorMessage || "",
          } : null,
          verdict: singleResult.verdict,
          errorIntel: analyzeError(
             submission.language, 
             result.status.id, 
             singleResult.rawError || singleResult.errorMessage || null, 
             result.compile_output || null, 
             result.status.id === 5, 
             result.status.id === 12, 
             result.status.id !== 3 ? 1 : 0, 
             passed,
             tc.expected,
             singleResult.actualOutput,
             tc.input
          )
        });

        // Hard errors (CE / TLE / MLE / RE / WA) — stop immediately in SUBMIT mode
        if (!passed) {
          failedCaseIndex = i;
          break;
        }
      } catch (err: any) {
        logger.error("Judge0 call failed for test case", { submissionId, caseIndex: i, error: err.message });

        // Distinguish infrastructure failures from actual code time limits
        const isApiTimeout =
          err.message?.includes("[JUDGE0_POLL_TIMEOUT]") ||
          err.message?.includes("[JUDGE0_API_ERROR]") ||
          err.message?.includes("ECONNABORTED") ||
          err.message?.includes("ETIMEDOUT");
        const finalVerdict = isApiTimeout ? "INTERNAL_ERROR" : "RUNTIME_ERROR";
        const verdictLabel = isApiTimeout ? "Judge Unavailable" : "Internal Error";

        testResults.push({
          input: tc.input, expected: tc.expected,
          actual: null, stdout: null,
          stderr: null, compileOutput: null,
          passed: false, runtime: null, verdict: finalVerdict,
          errorDetails: {
            verdict: verdictLabel,
            errorType: "SystemError",
            line: null,
            message: err.message,
          },
        });
        failedCaseIndex = i;
        break; // Stop execution on infrastructure error
      }
    } // ─── End Visible Test Cases Loop ───

    // ─── Phase D: Differential Testing Framework (The Universal Judge) ───
    // Only run stress tests if the previous visible cases passed, 
    // AND the problem supports it, AND there is no runtime API failure yet.
    const isSubmitAttempt = true; // For now assuming it's a full submit
    
    if (isSubmitAttempt && failedCaseIndex === null && submission.problem.hasOracle && submission.problem.judgeMeta) {
      const { generatorCode, oracleCode } = submission.problem.judgeMeta;

      if (generatorCode && oracleCode) {
        logger.info(`Starting Differential Testing Framework for ${submissionId}`);
        await pushUpdate({
          status: "RUNNING",
          progress: { current: testCases.length, total: testCases.length + 5 },
          message: `Visible tests passed. Generating rigorous randomized boundary cases...`,
        });

        try {
           // 1. Ask Generator.py to blast out 5 random boundary cases
           const genRes = await safeExec(runRawPython(generatorCode), 15000);
           
           if (genRes.status.id === 3 && genRes.stdout) {
              // 2. We assume the generator separated each test block by a double newline \n\n
              // Or if it's one test, just one block.
              const rawGenInputs = genRes.stdout.split('\n\n').map(s => s.trim()).filter(Boolean);
              
              // We'll iterate over up to 5 generated cases 
              for (let stressIdx = 0; stressIdx < Math.min(rawGenInputs.length, 5); stressIdx++) {
                 const stressInput = rawGenInputs[stressIdx];
                 
                 // 3. Oracle runs the Ground Truth
                 const oracleRes = await safeExec(runRawPython(oracleCode, stressInput), 15000);
                 
                 if (oracleRes.status.id === 3 && oracleRes.stdout) {
                     const expectedOracleOutput = oracleRes.stdout.trim();
                     
                     await pushUpdate({
                        status: "RUNNING",
                        progress: { current: testCases.length + stressIdx + 1, total: testCases.length + 5 },
                        message: `Differential verification on randomized hidden case ${stressIdx + 1}...`,
                     });

                     const formattedStressInput = formatStdin(stressInput);
                     const userRes = await safeExec(runCode(wrappedCode, submission.language, formattedStressInput), 20000);

                     const singleResult = await runSingleTest({
                        rawExec: userRes,
                        expectedOutput: expectedOracleOutput,
                        testInput: stressInput,
                        language: submission.language,
                        judgeMode,
                        spjCode
                     });

                     if (singleResult.runtimeMs) totalRuntime += singleResult.runtimeMs;
                     if (singleResult.memoryKb && singleResult.memoryKb > maxMemory) maxMemory = singleResult.memoryKb;

                     if (singleResult.verdict !== "Accepted") {
                        // We caught them on a hidden adversarial case!
                        testResults.push({
                           input: "<Hidden Generative Edge Case>\n" + stressInput.slice(0, 100) + "...",
                           expected: expectedOracleOutput.slice(0, 100) + "...",
                           actual: (singleResult.actualOutput ?? null) as string | null,
                           stdout: singleResult.stdout,
                           stderr: singleResult.rawError || null,
                           compileOutput: null,
                           passed: false,
                           runtime: singleResult.runtimeMs,
                           errorDetails: {
                             verdict: singleResult.verdict === "Wrong Answer" ? "Wrong Answer on Hidden Test" : singleResult.verdict,
                             errorType: singleResult.errorType || "RuntimeError",
                             line: singleResult.errorLine,
                             message: "Your code failed on a randomly generated adversarial hidden test case.\n" + (singleResult.errorMessage || ""),
                           },
                           verdict: singleResult.verdict
                        });
                        failedCaseIndex = testCases.length + stressIdx;
                        break;
                     } 
                 } else {
                   logger.error(`Oracle failed to resolve Ground Truth for generative test: ${oracleRes.stderr}`);
                 }
              }
           } else {
             logger.error(`Generator failed to create inputs: ${genRes.stderr}`);
           }
        } catch (stressErr: any) {
           logger.error(`Differential Testing Engine failure: ${stressErr.message}`);
        }
      }
    }

    // Now compute the overall status based on testResults using the uniform aggregate logic
    const { verdict: overallStatus } = aggregateResults(testResults as any, "submit");

    const passedCount = testResults.filter(r => r.passed).length;
    const isAccepted = overallStatus === "Accepted";

    logger.info("Submission executed", {
      submissionId,
      status: mapToPrismaStatus(overallStatus),
      passedCases: passedCount,
      totalCases: testCases.length,
      totalRuntime,
      failedCaseIndex,
    });

    const finalDetails = {
      testResults,
      passedCount: testResults.filter((r) => r.passed).length,
      totalCases: submission.problem.testCases.length,
      failedCaseIndex,
      message,
    };

    const finalSub = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: mapToPrismaStatus(overallStatus),
        runtime: totalRuntime > 0 ? totalRuntime : null,
        memory: maxMemory > 0 ? maxMemory : null,
        details: finalDetails,
      },
      include: {
        problem: { select: { id: true, title: true, slug: true } },
      },
    });

    await pushUpdate({
      status: "DONE",
      submission: finalSub,
    });

    await emit({
      topic: "submission-complete",
      data: { submissionId, status: mapToPrismaStatus(overallStatus), userId: submission.userId },
    });

  } catch (globalErr: any) {
    logger.error("Fatal error executing submission", { submissionId, error: globalErr.message });

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: "INTERNAL_ERROR" as any,
        details: {
          testResults: [{
            input: "", expected: "", actual: null as string | null, stdout: null,
            stderr: globalErr.message ? String(globalErr.message) : null, compileOutput: null,
            passed: false, runtime: null,
            errorDetails: {
              verdict: "Internal Error",
              errorType: "Crash",
              line: null,
              message: globalErr.message,
            },
          }],
          totalCases: 1,
          passedCases: 0,
        },
      },
    });

    await emit({
      topic: "submission-complete",
      data: { submissionId, status: "INTERNAL_ERROR", userId: submission.userId },
    });
  }
};
