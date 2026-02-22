import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { ollamaChat, MODELS } from "../services/ollama";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";

const bodySchema = z.object({ problemId: z.string() });

export const config: ApiRouteConfig = {
  type: "api",
  name: "AiExplain",
  path: "/api/ai/explain",
  method: "POST",
  emits: [],
  flows: ["ai-flow"],
  middleware: [authMiddleware()],
  bodySchema,
  responseSchema: {
    200: z.object({ explanation: z.string(), approach: z.string(), keyInsights: z.array(z.string()) }),
    400: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
  },
  includeFiles: ["../services/prisma.ts", "../utils/jwt.ts", "../middlewares/auth.middleware.ts", "../services/ollama.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  try {
    const { problemId } = bodySchema.parse(req.body);

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { title: true, description: true, difficulty: true, tags: true },
    });
    if (!problem) return { status: 404, body: { error: "Problem not found" } };

    const systemInstruction = `You are an expert DSA teacher. Explain problem-solving approaches clearly and concisely.
Respond ONLY with a JSON object (no markdown, no extra text) with keys: "explanation" (overview), "approach" (algorithm steps), "keyInsights" (array of 3-5 key points).
Do not provide complete code solutions.`;

    const prompt = `Explain how to approach solving this DSA problem:

Problem: ${problem.title} (${problem.difficulty})
Tags: ${problem.tags.join(", ")}

${problem.description.substring(0, 1500)}

Provide a clear explanation of the approach to solve it.`;

    const raw = await ollamaChat(MODELS.FAST, systemInstruction, prompt, { format: "json" });
    const parsed = JSON.parse(raw);
    logger.info("Explanation generated", { problemId });
    return {
      status: 200,
      body: {
        explanation: parsed.explanation ?? "",
        approach: parsed.approach ?? "",
        keyInsights: parsed.keyInsights ?? [],
      },
    };
  } catch (err: any) {
    logger.error("Explanation failed", { error: err.message });
    return { status: 400, body: { error: err.message ?? "Could not generate explanation" } };
  }
};
