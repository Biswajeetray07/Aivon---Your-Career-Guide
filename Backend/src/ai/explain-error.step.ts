import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import { ollamaChat, MODELS } from "../services/ollama";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";

const bodySchema = z.object({
  problemId: z.string(),
  language: z.string(),
  code: z.string(),
  errorDetails: z.object({
    verdict: z.string(),
    errorType: z.string(),
    line: z.number().nullable(),
    message: z.string(),
  }),
  testcase: z.object({
    input: z.string().optional(),
    expected: z.string().optional(),
    received: z.string().nullable().optional(),
    isHidden: z.boolean().optional(),
  }).optional(),
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "AiExplainError",
  path: "/api/ai/explain-error",
  method: "POST",
  emits: [],
  flows: ["ai-flow"],
  middleware: [authMiddleware()],
  bodySchema,
  responseSchema: {
    200: z.object({
      summary: z.string(),
      rootCause: z.string(),
      fixSteps: z.array(z.string()),
      conceptToReview: z.string(),
      likelyIssue: z.string().optional(),
      whyItHappens: z.string().optional(),
      debugSteps: z.array(z.string()).optional(),
      edgeCasesToCheck: z.array(z.string()).optional(),
    }),
    400: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
  },
  includeFiles: ["../services/prisma.ts", "../utils/jwt.ts", "../middlewares/auth.middleware.ts", "../services/ollama.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  try {
    const { problemId, language, code, errorDetails, testcase } = bodySchema.parse(req.body);

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { title: true, description: true, difficulty: true },
    });
    if (!problem) return { status: 404, body: { error: "Problem not found" } };



    const isWA = errorDetails.verdict === "WRONG_ANSWER" || errorDetails.errorType === "WrongAnswer";
    const isHidden = testcase?.isHidden ?? false;

    let prompt: string;
    let systemInstruction: string;

    if (isWA) {
      const diffSection = isHidden
        ? `The failing test case is hidden. Reason from common patterns and edge cases for this problem type.`
        : `\nOutput Comparison:\n  Expected: ${testcase?.expected ?? "N/A"}\n  User got: ${testcase?.received ?? "(no output)"}\n  Input:    ${testcase?.input ?? "N/A"}`;

      prompt = `Problem: ${problem.title} (${problem.difficulty})
Language: ${language}

Student Code:
\`\`\`${language}
${code}
\`\`\`

Verdict: Wrong Answer
${diffSection}

Diagnose why this code produces incorrect output.`;

      systemInstruction = `You are a competitive programming debugging expert.

The user's code RUNS but produces wrong output.

Your job:
- Analyze why the logic fails for this case.
- Compare expected vs user output (if visible) to identify the bug pattern.
- Suggest a step-by-step debugging approach.
- List edge cases that may expose this bug.
- If the test case is hidden, reason from common bug patterns for this problem type.
- DO NOT provide corrected full code. At most one short inline snippet.
- Keep tone educational and supportive.

Respond ONLY with a JSON object (no markdown, no extra text) with keys:
"summary" (one-sentence description of the failure),
"likelyIssue" (most probable root cause),
"whyItHappens" (why this occurs in their specific code, 1-2 sentences),
"debugSteps" (array of 3-4 actionable debugging steps),
"edgeCasesToCheck" (array of 2-3 edge cases to test),
"conceptToReview" (one concept name),
"rootCause" (same as likelyIssue),
"fixSteps" (same as debugSteps)`;
    } else {
      const testcaseInfo = testcase
        ? `\nTest Case:\n  Input: ${testcase.input ?? "N/A"}\n  Expected: ${testcase.expected ?? "N/A"}\n  Received: ${testcase.received ?? "(no output)"}`
        : "";

      prompt = `Problem: ${problem.title} (${problem.difficulty})
Language: ${language}

Student Code:
\`\`\`${language}
${code}
\`\`\`

Error:
  Type: ${errorDetails.errorType}
  Verdict: ${errorDetails.verdict}
  Line: ${errorDetails.line ?? "unknown"}
  Message: ${errorDetails.message}
${testcaseInfo}

Analyze this error and help the student fix it.`;

      systemInstruction = `You are a senior competitive programming mentor.

Your job is to help the student FIX their code, not to give the full solution.

Rules:
- Clearly explain what the error means in plain English.
- Point to the exact line number if available.
- Explain WHY it happened (root cause).
- Give 2-4 step-by-step fix instructions. Each step should be one actionable sentence.
- Do NOT provide full corrected code. Never write more than a single line snippet if needed.
- Suggest what concept the student should review.
- Keep tone supportive, concise, and educational.

Respond ONLY with a JSON object (no markdown, no extra text) with keys:
"summary" (one-sentence error explanation),
"rootCause" (why this happened, 1-2 sentences),
"fixSteps" (array of 2-4 short actionable steps),
"conceptToReview" (one concept name),
"likelyIssue" (same as rootCause),
"whyItHappens" (same as rootCause),
"debugSteps" (same as fixSteps),
"edgeCasesToCheck" ([])`;
    }

    const raw = await ollamaChat(MODELS.FAST, systemInstruction, prompt, { temperature: 0.4, format: "json" });
    const parsed = JSON.parse(raw);
    logger.info("Error explanation generated", { problemId, verdict: errorDetails.verdict, isWA });

    return {
      status: 200,
      body: {
        summary: parsed.summary ?? "An error occurred in your code.",
        rootCause: parsed.rootCause ?? parsed.likelyIssue ?? errorDetails.message,
        fixSteps: Array.isArray(parsed.fixSteps) ? parsed.fixSteps
          : Array.isArray(parsed.debugSteps) ? parsed.debugSteps
          : ["Review the error message and check the indicated line."],
        conceptToReview: parsed.conceptToReview ?? "Debugging basics",
        likelyIssue: parsed.likelyIssue ?? parsed.rootCause ?? null,
        whyItHappens: parsed.whyItHappens ?? null,
        debugSteps: Array.isArray(parsed.debugSteps) ? parsed.debugSteps : null,
        edgeCasesToCheck: Array.isArray(parsed.edgeCasesToCheck) ? parsed.edgeCasesToCheck : null,
      },
    };
  } catch (err: any) {
    logger.error("Error explanation failed", { error: err.message });
    return { status: 400, body: { error: err.message ?? "Could not explain error" } };
  }
};
