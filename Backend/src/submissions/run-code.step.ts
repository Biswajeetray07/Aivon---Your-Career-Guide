import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";
import { rateLimitMiddleware } from "../middlewares/rateLimit.middleware";
import { wrapCode, formatStdin, detectProblemTypeFromInput } from "../utils/code-runner";
import { runCode, runSpjChecker } from "../utils/judge0";
import { runSingleTest } from "../utils/judge-core/runSingleTest";
import { aggregateResults } from "../utils/judge-core/aggregateResults";
import { safeJudge } from "../utils/judge-core/safeJudge";
import type { JudgeMode } from "../utils/judge-core/outputComparator";

const bodySchema = z.object({
  problemId: z.string(),
  language: z.string(),
  code: z.string().min(1).max(50000, "String must contain at most 50000 character(s)"), 
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "RunCode",
  description: "Run code against visible test cases only (no DB persistence)",
  path: "/api/run",
  method: "POST",
  emits: [],
  flows: ["submission-flow"],
  middleware: [authMiddleware(), rateLimitMiddleware(60000, 15, "USER_ID")], // 15 executions per minute per user
  bodySchema,
  responseSchema: {
    200: z.object({
      status: z.string(),
      runtime: z.number().nullable(),
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
    429: z.object({ error: z.string() }),
  },
  includeFiles: [
    "../services/prisma.ts",
    "../middlewares/auth.middleware.ts",
    "../middlewares/rateLimit.middleware.ts",
    "../utils/code-runner.ts",
    "../utils/judge0.ts",
    "../utils/templates.ts",
    "../utils/jwt.ts",
    "../middlewares/auth.middleware.ts",
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

export const handler: any = async (req: any, { logger }: any) => {
  try {
    const { problemId, language, code } = bodySchema.parse(req.body);

    logger.info("Run code request", { problemId, language });

    // Fetch the problem including UAS adapter fields
    const problem = await prisma.problem.findFirst({
      where: { id: problemId },
      select: {
        id: true,
        entryPoint: true,
        problemType: true,
        judgeMode: true,
        spjCode: true,
        inputSpec: true,
        outputSpec: true,
        testCases: {
          where: { isHidden: false },
          orderBy: { order: "asc" },
          take: 3,
          select: { input: true, expected: true },
        },
      },
    });

    const inputSpec = (problem as any)?.inputSpec ?? null;
    const outputSpec = (problem as any)?.outputSpec ?? null;

    if (!problem) return { status: 404, body: { error: "Problem not found" } };
    if (!problem.testCases || problem.testCases.length === 0) return { status: 400, body: { error: "No visible test cases" } };

    const judgeMode = (problem.judgeMode ?? "exact") as JudgeMode;

    const baseProblemType = problem.problemType ?? "array";
    const effectiveProblemType = problem.testCases.length > 0
      ? detectProblemTypeFromInput(problem.testCases[0].input, baseProblemType)
      : baseProblemType;

    logger.info("Wrapping code", { 
      effectiveProblemType, 
      entryPoint: problem.entryPoint,
      uasEnabled: !!(inputSpec && (inputSpec as any[]).length > 0)
    });
    const wrappedCode = wrapCode(
      code,
      language,
      problem.entryPoint,
      effectiveProblemType,
      inputSpec as any[] | null,
      outputSpec as any,
    );

    type TestResult = {
      input: string; expected: string; actual: string | null; stdout?: string | null;
      stderr: string | null; compileOutput: string | null;
      passed: boolean; runtime: number | null; verdict: string;
      errorDetails?: { verdict: string; errorType: string; line: number | null; message: string } | null;
    };
    const testResults: TestResult[] = [];

    let totalRuntime = 0;
    let maxMemory = 0;

    for (const tc of problem.testCases) {
      const formattedInput = formatStdin(tc.input);

      logger.info("Running test case", { input: tc.input.slice(0, 80) });
      const result = await safeExec(runCode(wrappedCode, language, formattedInput), 20000);
      logger.info("Judge0 result", { statusId: result.status.id, statusDesc: result.status.description });

      const singleResult = await runSingleTest({
        rawExec: result,
        expectedOutput: tc.expected,
        testInput: tc.input,
        language,
        judgeMode,
        spjCode: problem.spjCode
      });

      if (singleResult.runtimeMs) totalRuntime += singleResult.runtimeMs;
      if (singleResult.memoryKb && singleResult.memoryKb > maxMemory) maxMemory = singleResult.memoryKb;

      const passed = singleResult.verdict === "Accepted";
      
      logger.info("Test case result", { passed, verdict: singleResult.verdict });

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
        verdict: singleResult.verdict // Added manually
      });
    }

    const { verdict: overallStatus } = aggregateResults(testResults as any, "run");

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
