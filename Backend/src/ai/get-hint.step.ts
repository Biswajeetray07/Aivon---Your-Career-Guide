import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";
import { askOllama, extractOllamaText } from "../utils/ai/ollamaPipeline";

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
  includeFiles: ["../services/prisma.ts", "../utils/jwt.ts", "../middlewares/auth.middleware.ts", "../utils/ai/ollamaPipeline.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  try {
    const { problemId, userCode } = bodySchema.parse(req.body);

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { title: true, description: true, difficulty: true, tags: true },
    });
    if (!problem) return { status: 404, body: { error: "Problem not found" } };

    const userCodeSection = userCode
      ? `\n\nThe student's current code attempt:\n\`\`\`\n${userCode}\n\`\`\``
      : "";

    const systemInstruction = `You are an expert DSA tutor. Your goal is to give a helpful hint that guides the student
toward solving the problem themselves — do NOT give away the full solution.
Be encouraging, concise, and pedagogically effective. Focus on the key insight or approach.`;

    const prompt = `Problem: ${problem.title} (${problem.difficulty})
Tags: ${problem.tags.join(", ")}

Description:
${problem.description.substring(0, 1500)}${userCodeSection}

Give me a helpful hint to solve this problem.`;

    const rawResponse = await askOllama({
      taskType: "hint",
      prompt: `${systemInstruction}\n\n${prompt}`
    });
    
    const rawText = extractOllamaText(rawResponse.data);
    
    // For pure hint, we want exactly what the model returns, but we can strip <think> for cleanliness
    const hint = rawText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    logger.info("Hint generated", { problemId });
    return { status: 200, body: { hint: hint || "Think about the problem constraints and what data structures match best." } };
  } catch (err: any) {
    logger.error("Hint generation failed", { error: err.message });
    return { status: 400, body: { error: err.message ?? "Could not generate hint" } };
  }
};
