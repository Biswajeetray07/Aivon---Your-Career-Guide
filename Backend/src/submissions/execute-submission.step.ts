import type { EventConfig } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import { wrapCode, formatStdin, detectProblemTypeFromInput } from "../utils/code-runner";
import {
  runCode,
  compareElite,
  judgeStatusToVerdictCode,
  parseStructuredError,
  formatErrorOutput,
  parseExecutionOutput,
  runSpjChecker,
  type JudgeMode,
} from "../utils/judge0";

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
  ],
};

export const handler: any = async (
  { data: { submissionId } }: { data: { submissionId: string } },
  { logger, emit }: { logger: any; emit: any }
) => {
  logger.info("ExecuteSubmission started", { submissionId });

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      problem: {
        include: { testCases: { orderBy: { order: "asc" } } },
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
      await fetch("http://localhost:3003/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, event }),
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
      passed: boolean; runtime: number | null;
      errorDetails?: { verdict: string; errorType: string; line: number | null; message: string } | null;
    };
    const testResults: TestResult[] = [];

    let finalStatus: string = "ACCEPTED";
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
        const result = await runCode(wrappedCode, submission.language, formattedInput);
        logger.info("Judge0 result", { submissionId, caseIndex: i, statusId: result.status.id, statusDesc: result.status.description });

        const { stdout, actual } = parseExecutionOutput(result.stdout);
        const runtime = result.time ? Math.round(parseFloat(result.time) * 1000) : null;

        // Determine pass using the problem's judge mode
        let passed = false;
        if (result.status.id === 3) {
          if (judgeMode === "spj" && spjCode) {
            const spjResult = await runSpjChecker(spjCode, tc.input, actual ?? "", tc.expected);
            passed = spjResult.ok;
          } else {
            passed = compareElite(actual, tc.expected, judgeMode);
          }
        }

        if (runtime) totalRuntime += runtime;
        if (result.memory && result.memory > maxMemory) maxMemory = result.memory;

        const rawErr = result.stderr || result.compile_output;
        const errorDetails = rawErr
          ? parseStructuredError(rawErr, submission.language, result.status.id)
          : null;

        logger.info("Test case verdict", {
          submissionId,
          caseIndex: i,
          passed,
          actual: actual?.slice(0, 100),
          expected: tc.expected?.slice(0, 100),
        });

        testResults.push({
          input: tc.input,
          expected: tc.expected,
          actual,
          stdout,
          stderr: formatErrorOutput(result.stderr, submission.language),
          compileOutput: formatErrorOutput(result.compile_output, submission.language),
          passed,
          runtime,
          errorDetails: errorDetails ? {
            verdict: errorDetails.verdict,
            errorType: errorDetails.errorType,
            line: errorDetails.line,
            message: errorDetails.message,
          } : null,
        });

        // Hard errors (CE / TLE / MLE / RE) — stop immediately
        if (result.status.id !== 3 && result.status.id !== 4) {
          finalStatus = judgeStatusToVerdictCode(result.status.id);
          failedCaseIndex = i;
          break;
        }

        // Wrong Answer — continue to show how many pass, then stop
        if (!passed) {
          finalStatus = "WRONG_ANSWER";
          failedCaseIndex = i;
          break;
        }
      } catch (err: any) {
        logger.error("Judge0 call failed for test case", { submissionId, caseIndex: i, error: err.message });
        const isTimeout = err.message?.includes("timed out");
        finalStatus = isTimeout ? "TIME_LIMIT_EXCEEDED" : "RUNTIME_ERROR";
        const verdict = isTimeout ? "Time Limit Exceeded" : "Internal Error";
        testResults.push({
          input: tc.input, expected: tc.expected,
          actual: null, stdout: null,
          stderr: String(err.message), compileOutput: null,
          passed: false, runtime: null,
          errorDetails: {
            verdict,
            errorType: isTimeout ? "TLE" : "SystemError",
            line: null,
            message: err.message,
          },
        });
        failedCaseIndex = i;
        break;
      }
    }

    // All test cases executed successfully
    if (testResults.length === testCases.length && testResults.every((r) => r.passed)) {
      finalStatus = "ACCEPTED";
    }

    const passedCases = testResults.filter((r) => r.passed).length;

    logger.info("Submission executed", {
      submissionId,
      status: finalStatus,
      passedCases,
      totalCases: testCases.length,
      totalRuntime,
      failedCaseIndex,
    });

    const finalDetails = {
      testResults,
      passedCases: testResults.filter((r) => r.passed).length,
      totalCases: submission.problem.testCases.length,
      failedCaseIndex,
      message,
    };

    const finalSub = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: finalStatus as any,
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
      data: { submissionId, status: finalStatus, userId: submission.userId },
    });

  } catch (globalErr: any) {
    logger.error("Fatal error executing submission", { submissionId, error: globalErr.message });

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: "INTERNAL_ERROR" as any,
        details: {
          testResults: [{
            input: "", expected: "", actual: null, stdout: null,
            stderr: String(globalErr.message), compileOutput: null,
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
