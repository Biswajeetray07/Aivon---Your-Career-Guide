import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";
import axios from "axios";

const bodySchema = z.object({
  problemId: z.string(),
  language: z.string().default("javascript"),
  code: z.string(),
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "AiCodeFeedback",
  path: "/api/ai/code-feedback",
  method: "POST",
  emits: [],
  flows: ["ai-flow"],
  middleware: [authMiddleware()],
  bodySchema,
  responseSchema: {
    200: z.object({
      feedback: z.string(),
      timeComplexity: z.string(),
      spaceComplexity: z.string(),
      improvementTip: z.string().optional(),
      interviewNote: z.string().optional(),
    }),
    400: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
  },
  includeFiles: ["../services/prisma.ts", "../utils/jwt.ts", "../middlewares/auth.middleware.ts", "../utils/ai/ollamaPipeline.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  try {
    const { problemId, language, code } = bodySchema.parse(req.body);

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { title: true, description: true, difficulty: true },
    });
    if (!problem) return { status: 404, body: { error: "Problem not found" } };

    const systemPrompt = `You are Aivon Performance Analyzer, a senior competitive programming expert.

Your job is to evaluate the algorithmic efficiency of user code with high precision.

CRITICAL RULES:

- Be technically accurate.
- Prefer worst-case complexity.
- Do NOT guess unknown behavior.
- Do NOT add motivational fluff.
- Be concise but clear.
- Output STRICT JSON only.

You must determine:

1. Time complexity (Big-O worst case)
2. Space complexity (Big-O auxiliary space)
3. Whether the solution is already optimal
4. Provide improvement tip ONLY if meaningful

EXCELLENT WORK & INTERVIEW NOTE RULE:

Set "excellent_work" to true ONLY if:
- the solution is asymptotically optimal
- and implementation is clean

Otherwise set it to false.

If excellent_work is true, "interview_note" MUST contain a specific, dynamic insight on why this code would impress a FAANG interviewer. Mention specific techniques used (e.g. "Excellent use of two-pointers to avoid O(N) space constraint"). Do NOT use generic phrases.
If excellent_work is false, "interview_note" should be an empty string "".

TIP RULES:

- If the solution is optimal → tip must be empty string ""
- If improvement exists → give ONE specific actionable suggestion
- Do NOT give generic advice

CONFIDENCE RULE:

- high → very certain
- medium → minor uncertainty
- low → significant uncertainty

OUTPUT FORMAT (STRICT JSON):

{
  "time_complexity": "",
  "space_complexity": "",
  "analysis": "",
  "tip": "",
  "excellent_work": false,
  "interview_note": "",
  "confidence": "high"
}

Do not output anything outside JSON.
Before finishing, internally verify the JSON is valid.`;

    const prompt = `Problem: ${problem.title} (${problem.difficulty})
${problem.description.substring(0, 1000)}

User Code (${language}):
\`\`\`${language}
${code}
\`\`\`

Analyze the performance.`;

    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    const res = await axios.post("http://localhost:11434/api/generate", {
      model: "qwen2.5-coder:7b",
      prompt: fullPrompt,
      stream: false,
      format: "json",
      options: { 
        temperature: 0.1, 
        top_p: 0.9, 
        num_predict: 220, 
        num_ctx: 4096 
      }
    }, { timeout: 45000 }).catch(e => {
      throw new Error(e.code === 'ECONNREFUSED' ? "Ollama daemon is offline. Please run 'ollama serve' in your terminal." : e.message);
    });

    let rawText = res.data.response || "";
    // Defensive parsing for model <think> wrappers if they somehow appear
    rawText = rawText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) rawText = jsonMatch[0];

    let result: any = {};
    try {
      result = JSON.parse(rawText);
    } catch (parseError) {
      logger.error("JSON Parsing failed in Performance Analyzer", { rawText });
      throw new Error("AI returned malformed JSON. Please try again.");
    }

    const parsedResult = {
      feedback: result.analysis || "Performance analysis completed.",
      timeComplexity: result.time_complexity || "O(N)",
      spaceComplexity: result.space_complexity || "O(N)",
      improvementTip: result.tip ? result.tip : undefined,
      interviewNote: result.excellent_work ? (result.interview_note || "Excellent work! This is optimal code.") : undefined
    };

    logger.info("Feedback generated", { problemId });
    return { status: 200, body: parsedResult };
  } catch (err: any) {
    logger.error("Code feedback failed", { error: err.message });
    const isOffline = err.message.includes("offline") || err.message.includes("unavailable");
    return { status: isOffline ? 503 : 400, body: { error: err.message ?? "Could not generate feedback" } };
  }
};

