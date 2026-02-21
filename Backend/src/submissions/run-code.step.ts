import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";
import { wrapCode, formatStdin, detectProblemTypeFromInput } from "../utils/code-runner";
import {
  runCode,
  compareElite,
  parseStructuredError,
  formatErrorOutput,
  parseExecutionOutput,
  judgeStatusToVerdictCode,
  computeOverallVerdict,
  runSpjChecker,
  type JudgeMode,
} from "../utils/judge0";

const bodySchema = z.object({
  problemId: z.string(),
  language: z.string(),
  code: z.string().min(1),
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "RunCode",
  description: "Run code against visible test cases only (no DB persistence)",
  path: "/api/run",
  method: "POST",
  emits: [],
  flows: ["submission-flow"],
  middleware: [authMiddleware()],
  bodySchema,
  responseSchema: {
    200: z.object({
      status: z.string(),
      runtime: z.number().nullable(),
      memory: z.number().nullable(),
      testResults: z.array(z.object({
        input: z.string(),
        expected: z.string(),
        actual: z.string().nullable(),
        stdout: z.string().nullable().optional(),
        stderr: z.string().nullable(),
        compileOutput: z.string().nullable(),
        passed: z.boolean(),
        runtime: z.number().nullable(),
        errorDetails: z.object({
          verdict: z.string(),
          errorType: z.string(),
          line: z.number().nullable(),
          message: z.string(),
        }).nullable().optional(),
      })),
      passedCases: z.number(),
      totalCases: z.number(),
    }),
    400: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
  },
  includeFiles: [
    "../services/prisma.ts",
    "../utils/code-runner.ts",
    "../utils/judge0.ts",
    "../utils/templates.ts",
    "../utils/jwt.ts",
    "../middlewares/auth.middleware.ts",
  ],
};

export const handler: any = async (req: any, { logger }: any) => {
  try {
    const { problemId, language, code } = bodySchema.parse(req.body);

    logger.info("Run code request", { problemId, language });

    const problem = await prisma.problem.findFirst({
      where: { id: problemId },
      select: {
        id: true,
        entryPoint: true,
        problemType: true,
        judgeMode: true,
        spjCode: true,
        testCases: {
          where: { isHidden: false },
          orderBy: { order: "asc" },
          take: 3,
          select: { input: true, expected: true },
        },
      },
    });

    if (!problem) return { status: 404, body: { error: "Problem not found" } };
    if (problem.testCases.length === 0) return { status: 400, body: { error: "No visible test cases" } };

    const judgeMode = (problem.judgeMode ?? "exact") as JudgeMode;

    const baseProblemType = (problem as any).problemType ?? "array";
    const effectiveProblemType = problem.testCases.length > 0
      ? detectProblemTypeFromInput(problem.testCases[0].input, baseProblemType)
      : baseProblemType;

    logger.info("Wrapping code", { effectiveProblemType, entryPoint: problem.entryPoint });
    const wrappedCode = wrapCode(code, language, problem.entryPoint, effectiveProblemType);

    type TestResult = {
      input: string; expected: string; actual: string | null; stdout?: string | null;
      stderr: string | null; compileOutput: string | null;
      passed: boolean; runtime: number | null;
      errorDetails?: { verdict: string; errorType: string; line: number | null; message: string } | null;
    };
    const testResults: TestResult[] = [];

    let totalRuntime = 0;
    let maxMemory = 0;
    let isCompilationError = false;

    for (const tc of problem.testCases) {
      const formattedInput = formatStdin(tc.input);

      logger.info("Running test case", { input: tc.input.slice(0, 80) });
      const result = await runCode(wrappedCode, language, formattedInput);
      logger.info("Judge0 result", { statusId: result.status.id, statusDesc: result.status.description });

      const { stdout, actual } = parseExecutionOutput(result.stdout);
      const runtime = result.time ? Math.round(parseFloat(result.time) * 1000) : null;

      // Determine pass: judge0 must report OK (status 3) AND comparator must agree
      let passed = false;
      let spjMessage: string | undefined;
      if (result.status.id === 3) {
        if (judgeMode === "spj" && problem.spjCode) {
          const spjResult = await runSpjChecker(problem.spjCode, tc.input, actual ?? "", tc.expected);
          passed = spjResult.ok;
          spjMessage = spjResult.message;
        } else {
          passed = compareElite(actual, tc.expected, judgeMode);
        }
      }

      if (runtime) totalRuntime += runtime;
      if (result.memory && result.memory > maxMemory) maxMemory = result.memory;

      const rawErr = result.stderr || result.compile_output;
      const errorDetails = rawErr
        ? parseStructuredError(rawErr, language, result.status.id)
        : null;

      logger.info("Test case result", {
        passed,
        actual: actual?.slice(0, 100),
        expected: tc.expected?.slice(0, 100),
        stdout: stdout?.slice(0, 100),
        verdictId: result.status.id,
      });

      testResults.push({
        input: tc.input,
        expected: tc.expected,
        actual,
        stdout,
        stderr: formatErrorOutput(result.stderr, language),
        compileOutput: formatErrorOutput(result.compile_output, language),
        passed,
        runtime,
        errorDetails: errorDetails ? {
          verdict: errorDetails.verdict,
          errorType: errorDetails.errorType,
          line: errorDetails.line,
          message: errorDetails.message,
        } : null,
      });

      if (result.status.id === 6 || result.status.id === 14) {
        isCompilationError = true;
      }
    }

    const overallStatus = computeOverallVerdict(testResults, isCompilationError);

    logger.info("Run completed", { problemId, status: overallStatus, type: effectiveProblemType });

    return {
      status: 200,
      body: {
        status: overallStatus,
        runtime: totalRuntime || null,
        memory: maxMemory || null,
        testResults,
        passedCases: testResults.filter((r) => r.passed).length,
        totalCases: testResults.length,
      },
    };
  } catch (err: any) {
    logger.error("Run failed", { error: err.message, stack: err.stack?.slice(0, 300) });

    // Distinguish infrastructure failures from actual code time limits
    const isApiTimeout =
      err.message?.includes("[JUDGE0_POLL_TIMEOUT]") ||
      err.message?.includes("[JUDGE0_API_ERROR]") ||
      err.message?.includes("ECONNABORTED") ||
      err.message?.includes("ETIMEDOUT");

    // API timeouts are NOT the user's fault → INTERNAL_ERROR, never TLE
    const statusText = "INTERNAL_ERROR";
    const verdictLabel = isApiTimeout ? "Judge Unavailable" : "Internal Error";
    const userMessage = isApiTimeout
      ? "The judge server did not respond in time. This is NOT a problem with your code — please try again."
      : err.message;

    return {
      status: 200,
      body: {
        status: statusText,
        runtime: null,
        memory: null,
        passedCases: 0,
        totalCases: 1,
        testResults: [{
          input: "", expected: "", actual: null, stdout: null,
          stderr: userMessage, compileOutput: null,
          passed: false, runtime: null,
          errorDetails: {
            verdict: verdictLabel,
            errorType: isApiTimeout ? "JudgeTimeout" : "SystemError",
            line: null,
            message: userMessage,
          },
        }],
      },
    };
  }
};
