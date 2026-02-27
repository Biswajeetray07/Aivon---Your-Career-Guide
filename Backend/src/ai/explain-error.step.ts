import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";
import { askOllama, extractOllamaText, dualStageAnalysis } from "../utils/ai/ollamaPipeline";

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
      debugSteps: z.array(z.string()).optional(),
      edgeCasesToCheck: z.array(z.string()).optional(),
    }),
    400: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
  },
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
    const isTLE = errorDetails.verdict === "TIME_LIMIT_EXCEEDED" || errorDetails.verdict === "Time Limit Exceeded";
    const isHidden = testcase?.isHidden ?? false;

    let coderPrompt: string;

    if (isWA) {
      const diffSection = isHidden
        ? `The failing test case is hidden. Reason from common patterns and edge cases for this problem type.`
        : `\nOutput Comparison:\n  Expected: ${testcase?.expected ?? "N/A"}\n  User got: ${testcase?.received ?? "(no output)"}\n  Input:    ${testcase?.input ?? "N/A"}`;

      coderPrompt = `Problem: ${problem.title} (${problem.difficulty})
Language: ${language}

User Code:
\`\`\`${language}
${code}
\`\`\`

Error:
  Verdict: Wrong Answer
${diffSection}

Perform deep analysis.`;
    } else {
      const testcaseInfo = testcase
        ? `\nTest Case:\n  Input: ${testcase.input ?? "N/A"}\n  Expected: ${testcase.expected ?? "N/A"}\n  Received: ${testcase.received ?? "(no output)"}`
        : "";

      const tleHint = isTLE ? "\nCRITICAL VERDICT: TIME LIMIT EXCEEDED. This guarantees the code contains an INFINITE LOOP, a deadlock, or grossly inefficient O(N^2) complexity where O(N) or O(log N) is expected. You MUST find the loop or recursive call that fails to terminate." : "";

      coderPrompt = `Problem: ${problem.title} (${problem.difficulty})
Language: ${language}

User Code:
\`\`\`${language}
${code}
\`\`\`

Error:
  Type: ${errorDetails.errorType}
  Verdict: ${errorDetails.verdict}
  Line: ${errorDetails.line ?? "unknown"}
  Message: ${errorDetails.message}
${testcaseInfo}${tleHint}

Perform deep analysis.`;
    }

const coderSystemPrompt = `You are Aivon Coder Brain, a world-class competitive programming expert and algorithmic auditor.

Your sole directive is to perform an exhaustive, universal technical analysis of user code using "Dry-Run Execution Tracing".

CRITICAL RULES:
- Be strictly analytical and technical.
- Do NOT produce pedagogical teaching explanations (that is Stage 2's job).
- Do NOT hallucinate variables or lines that do not exist in the user's code.
- Output STRICT JSON only at the very end of your response.

UNIVERSAL DEBUGGING ALGORITHM (You MUST follow this inside a <think> block before outputting JSON):
1. State the Algorithm: Identify the algorithm the user is attempting (e.g. Binary Search, BFS, DP).
2. Trace the Failing Scenario: If a test case is provided, mentally trace the user's pointers, loop invariants, or recursive states step-by-step for that specific input.
3. Hunt for Infinite Loops (TLE): If the verdict is Time Limit Exceeded, assume a \`while\` loop or recursion is stuck. Trace the update conditions for loop boundaries (e.g. \`left\`, \`right\`, \`fast\`, \`slow\`). Identify the exact variable assignment that fails to move the pointer forward or shrink the search space.
4. Hunt for Logic Leaks (WA): If the verdict is Wrong Answer, check for off-by-one errors, swapping variables incorrectly from different arrays, incorrect arithmetic operators, or missing base cases.
5. Identify the EXACT line of code that is wrong and exactly how to fix it.

Classify the primary mistake pattern using one of:
- infinite_loop
- off_by_one
- boundary_error
- wrong_algorithm
- inefficiency
- logic_bug
- edge_case_missing
- none

Determine the explanation_depth (brief, standard, deep) based on code quality, severity, and complexity.
If code is completely flawless, explicitly declare "is_correct": true.

Output format (STRICT JSON):
{
  "is_correct": boolean,
  "mistake_pattern": "infinite_loop | off_by_one | boundary_error | wrong_algorithm | inefficiency | logic_bug | edge_case_missing | none",
  "explanation_depth": "brief | standard | deep",
  "primary_issue": "Concise technical label of the exact failure point",
  "root_cause": "Hyper-specific technical explanation. State the exact line number, the exact variable names, and exactly why their state transition causes the algorithm to fail.",
  "time_complexity": "Big-O",
  "space_complexity": "Big-O",
  "edge_case_risks": ["item1", "item2"],
  "suggested_test_cases": ["case1", "case2"],
  "optimization_suggestions": ["item1", "item2"],
  "confidence": "high | medium | low"
}

Do not include anything outside JSON.`;

    const teacherSystemPrompt = `You are Aivon AI Teacher, an elite competitive programming mentor.

You receive structured analysis from the Aivon Coder Brain.

Your mission is to transform it into the clearest possible student-friendly explanation, structured as JSON.

Teaching principles:
- Be precise and structured.
- Adapt depth based on "explanation_depth".
- Keep tone supportive and professional.
- Avoid fluff.

You MUST output exactly this JSON structure and nothing else:
{
  "summary": "1-2 sentence quick insight on what's wrong.",
  "rootCause": "Clear explanation of the core technical flaw.",
  "likelyIssue": "Optional. A simpler translation of rootCause if it's a Wrong Answer.",
  "fixSteps": ["Step 1 to fix", "Step 2 to fix"],
  "debugSteps": ["Optional. Step 1 to debug", "Optional. Step 2 to debug"],
  "edgeCasesToCheck": ["Optional. case 1", "Optional. case 2"],
  "conceptToReview": "The primary DSA topic they struggled with (e.g. 'BFS on Trees', 'Integer Overflow')"
}`;

    const teacherPromptGenerator = (coderJson: string) => `You will pass the JSON from Stage 1.
    
Coder Analysis:
${coderJson}

Transform this into the final student-friendly JSON response.`;

    const finalResponse = await dualStageAnalysis({
      coderSystemPrompt,
      coderPrompt,
      teacherSystemPrompt,
      teacherPromptGenerator
    });
    
    let rawText = finalResponse.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) rawText = jsonMatch[0];

    let parsedResult: any = {};
    try {
      parsedResult = JSON.parse(rawText);
    } catch (parseError) {
      logger.error("JSON Parsing failed in Explain Error Analyzer", { rawText });
      throw new Error("AI returned malformed JSON. Please try again.");
    }

    logger.info("Dual-stage error explanation generated", { problemId, verdict: errorDetails.verdict, isWA });

    return {
      status: 200,
      body: parsedResult,
    };
  } catch (err: any) {
    logger.error("Error explanation failed", { error: err.message });
    const isOffline = err.message?.includes("offline") || err.message?.includes("unavailable");
    return { status: isOffline ? 503 : 400, body: { error: err.message ?? "Could not explain error" } };
  }
};

