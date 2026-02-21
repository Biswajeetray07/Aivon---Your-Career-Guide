import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";

const bodySchema = z.object({
  problemId: z.string(),
  userCode: z.string().optional(),
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "AiGetHint",
  path: "/api/ai/hint",
  method: "POST",
  emits: [],
  flows: ["ai-flow"],
  middleware: [authMiddleware()],
  bodySchema,
  responseSchema: {
    200: z.object({ hint: z.string() }),
    400: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
  },
  includeFiles: ["../services/prisma.ts", "../utils/jwt.ts", "../middlewares/auth.middleware.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  try {
    const { problemId, userCode } = bodySchema.parse(req.body);

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { title: true, description: true, difficulty: true, tags: true },
    });
    if (!problem) return { status: 404, body: { error: "Problem not found" } };

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

    const userCodeSection = userCode
      ? `\n\nThe student's current code attempt:\n\`\`\`\n${userCode}\n\`\`\``
      : "";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Problem: ${problem.title} (${problem.difficulty})
Tags: ${problem.tags.join(", ")}

Description:
${problem.description.substring(0, 1500)}${userCodeSection}

Give me a helpful hint to solve this problem.`,
      config: {
        systemInstruction: `You are an expert DSA tutor. Your goal is to give a helpful hint that guides the student 
toward solving the problem themselves — do NOT give away the full solution. 
Be encouraging, concise, and pedagogically effective. Focus on the key insight or approach.`,
        temperature: 0.7,
      },
    });

    const hint = response.text ?? "Think about the problem constraints and what data structures match best.";
    logger.info("Hint generated", { problemId });
    return { status: 200, body: { hint } };
  } catch (err: any) {
    logger.error("Hint generation failed", { error: err.message });
    return { status: 400, body: { error: err.message ?? "Could not generate hint" } };
  }
};
