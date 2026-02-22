import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import { ollamaChat, MODELS } from "../services/ollama";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";

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
      isOptimal: z.boolean().optional(),
      improvementTip: z.string().optional(),
      interviewNote: z.string().optional(),
    }),
    400: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
  },
  includeFiles: ["../services/prisma.ts", "../utils/jwt.ts", "../middlewares/auth.middleware.ts", "../services/ollama.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  try {
    const { problemId, language, code } = bodySchema.parse(req.body);

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { title: true, description: true, difficulty: true },
    });
    if (!problem) return { status: 404, body: { error: "Problem not found" } };



    const prompt = `Problem: ${problem.title} (${problem.difficulty})
Language: ${language}

Accepted Solution:
\`\`\`${language}
${code}
\`\`\`

Analyse this accepted solution.`;

    const systemInstruction = `You are a competitive programming performance analyst doing a post-AC review.

Analyse the user's accepted solution and provide structured performance feedback.

Rules:
- Be concise and educational.
- Do NOT provide alternative full code.
- Give a single actionable improvement tip.
- Include an interview-readiness note.

Respond ONLY with a JSON object (no markdown, no extra text) with keys:
"feedback" (2-3 sentence analysis of the approach),
"timeComplexity" (e.g. "O(n log n)"),
"spaceComplexity" (e.g. "O(n)"),
"isOptimal" (boolean — is this the best known complexity?),
"improvementTip" (one concrete tip to improve without full code),
"interviewNote" (one sentence on interview readiness)`;

    const raw = await ollamaChat(MODELS.CODER, systemInstruction, prompt, { temperature: 0.3, format: "json" });
    const parsed = JSON.parse(raw);
    logger.info("Code feedback generated", { problemId });

    return {
      status: 200,
      body: {
        feedback: parsed.feedback ?? "Good solution.",
        timeComplexity: parsed.timeComplexity ?? "Unknown",
        spaceComplexity: parsed.spaceComplexity ?? "Unknown",
        isOptimal: parsed.isOptimal ?? null,
        improvementTip: parsed.improvementTip ?? null,
        interviewNote: parsed.interviewNote ?? null,
      },
    };
  } catch (err: any) {
    logger.error("Code feedback failed", { error: err.message });
    return { status: 400, body: { error: err.message ?? "Could not generate feedback" } };
  }
};
