import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";
import { askOllama, extractOllamaText } from "../utils/ai/ollamaPipeline";

const bodySchema = z.object({
  problemId: z.string(),
  language: z.string(),
  code: z.string(),
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "AiImproveCode",
  path: "/api/ai/improve",
  method: "POST",
  emits: [],
  flows: ["ai-flow"],
  middleware: [authMiddleware()],
  bodySchema,
  responseSchema: {
    200: z.object({
        feedback: z.string(),
        alternativeApproach: z.string(),
        timeComplexity: z.string(),
        spaceComplexity: z.string()
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
      select: { title: true, description: true, difficulty: true, tags: true },
    });
    if (!problem) return { status: 404, body: { error: "Problem not found" } };

    const systemPrompt = `You are an elite DSA mentor. Do not overuse emojis or decorative icons. Be human, calm, and technical.
The user has submitted CORRECT code for the problem.
Your goal is to suggest an alternative, better, or more optimal approach.
Return ONLY valid JSON in this exact structure:
{
  "feedback": "Short feedback on their current approach constraints vs optimal",
  "alternativeApproach": "Detailed markdown explanation of the alternative approach, including high level pseudocode",
  "timeComplexity": "extract actual optimal time complexity here, e.g. O(N log N)",
  "spaceComplexity": "extract actual optimal space complexity here, e.g. O(N)"
}`;

    const prompt = `Problem: ${problem.title} (${problem.difficulty})
Tags: ${problem.tags.join(", ")}

Description:
${problem.description.substring(0, 1000)}

User Code (${language}):
\`\`\`${language}
${code}
\`\`\`

Provide the JSON improvement response.`;

    const rawResponse = await askOllama({
      taskType: "improve",
      prompt: `${systemPrompt}\n\n${prompt}`,
      format: "json"
    });
    
    let rawText = extractOllamaText(rawResponse.data);
    rawText = rawText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) rawText = jsonMatch[0];

    const result = JSON.parse(rawText);

    logger.info("Improvement generated", { problemId });
    return { status: 200, body: result };
  } catch (err: any) {
    logger.error("Improvement generation failed", { error: err.message });
    return { status: 400, body: { error: err.message ?? "Could not generate improvement" } };
  }
};
