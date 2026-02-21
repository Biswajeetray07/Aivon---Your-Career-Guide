import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
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
    200: z.object({ feedback: z.string(), timeComplexity: z.string(), spaceComplexity: z.string() }),
    400: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
  },
  includeFiles: ["../services/prisma.ts", "../utils/jwt.ts", "../middlewares/auth.middleware.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  try {
    const { problemId, language, code } = bodySchema.parse(req.body);

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { title: true, description: true, difficulty: true },
    });
    if (!problem) return { status: 404, body: { error: "Problem not found" } };

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Problem: ${problem.title} (${problem.difficulty})
Language: ${language}

Student Code:
\`\`\`${language}
${code}
\`\`\`

Review this code and provide structured feedback.`,
      config: {
        systemInstruction: `You are a senior software engineer doing a code review. 
Provide actionable feedback on code quality, correctness, time complexity, and space complexity.
Be specific, educational, and encouraging. Format your response as JSON with keys: 
"feedback" (string), "timeComplexity" (string like "O(n)"), "spaceComplexity" (string like "O(1)").`,
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text ?? "{}");
    logger.info("Code feedback generated", { problemId });
    return {
      status: 200,
      body: {
        feedback: parsed.feedback ?? "No feedback available.",
        timeComplexity: parsed.timeComplexity ?? "Unknown",
        spaceComplexity: parsed.spaceComplexity ?? "Unknown",
      },
    };
  } catch (err: any) {
    logger.error("Code feedback failed", { error: err.message });
    return { status: 400, body: { error: err.message ?? "Could not generate feedback" } };
  }
};
