import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import axios from "axios";
import { authMiddleware } from "../middlewares/auth.middleware";

const bodySchema = z.object({
  problemId: z.string(),
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "GenerateOracleFiles",
  path: "/api/ai/generate-oracle",
  method: "POST",
  emits: [],
  flows: ["ai-flow"],
  middleware: [authMiddleware()],
  bodySchema,
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
      judgeMeta: z.any().optional()
    }),
    400: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  includeFiles: ["../services/prisma.ts", "../utils/jwt.ts", "../middlewares/auth.middleware.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  try {
    const { problemId } = bodySchema.parse(req.body);

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: { testCases: true }
    });

    if (!problem) return { status: 404, body: { error: "Problem not found" } };

    // Prevent overriding if it already exists
    const existingMeta = await prisma.problemJudgeMeta.findUnique({
      where: { problemId: problem.id }
    });

    if (existingMeta && problem.hasOracle) {
       return { status: 200, body: { success: true, message: "Oracle already exists.", judgeMeta: existingMeta } };
    }

    const systemPrompt = `You are a Senior Systems Engineer for a LeetCode-style judging platform.
Your job is to generate TWO Python 3 programs for Differential Stress Testing.

1. "generator.py" -> A script that prints N random edge-case inputs to standard output for this problem.
2. "oracle.py" -> A trusted, absolute brute-force OR highly optimal solution that reads the generator's inputs from standard input and prints the precise correct answer.

CRITICAL RULES:
- Both scripts must be fully independent and runnable via 'python script.py'.
- "generator.py" must randomly print the required inputs formatted precisely as standard test cases.
- "generator.py" MUST enforce extreme structural variation: generate asymmetrical lengths (e.g., one huge array, one empty array), negative extremums, and duplicated values to catch coincidental logic bugs.
- "oracle.py" must read these inputs using 'sys.stdin.read().splitlines()' (or similar) and print the output.
- Output MUST be strict JSON containing exactly two keys: "generator_code" and "oracle_code".
- Provide NOTHING ELSE BUT THE JSON.`;

    const prompt = `Problem Title: ${problem.title} (${problem.difficulty})
Description: ${problem.description}
Constraints: ${problem.constraints || "None provided"}
Entry Point / Arguments expected: ${problem.entryPoint}

Example Visible Test Cases:
${problem.testCases.map((tc: any) => `Input:\n${tc.input}\nExpected Output: ${tc.expected}`).join('\n\n')}

Generate the required JSON output.`;

    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    const res = await axios.post("http://localhost:11434/api/generate", {
      model: "qwen2.5-coder:7b",
      prompt: fullPrompt,
      stream: false,
      format: "json",
      options: { 
        temperature: 0.2, 
        top_p: 0.9, 
        num_predict: -1, 
        num_ctx: 8192 
      }
    }, { timeout: 60000 }).catch(e => {
      throw new Error(e.code === 'ECONNREFUSED' ? "Ollama offline" : e.message);
    });

    const rawText = res.data.response || "";
    let parsed: any;
    
    try {
      parsed = JSON.parse(rawText.replace(/<think>[\s\S]*?<\/think>/g, "").trim());
    } catch (e) {
      throw new Error("AI returned malformed Python script JSON payload.");
    }

    if (!parsed.generator_code || !parsed.oracle_code) {
      throw new Error("AI failed to generate both required scripts.");
    }

    const judgeMeta = await prisma.problemJudgeMeta.upsert({
      where: { problemId: problem.id },
      update: {
        generatorCode: parsed.generator_code,
        oracleCode: parsed.oracle_code
      },
      create: {
        problemId: problem.id,
        generatorCode: parsed.generator_code,
        oracleCode: parsed.oracle_code
      }
    });

    await prisma.problem.update({
      where: { id: problem.id },
      data: { hasOracle: true }
    });

    logger.info("Successfully generated Differential Testing Meta", { problemId: problem.id });

    return { 
      status: 200, 
      body: { 
        success: true, 
        message: "Oracle and Generator scripts generated flawlessly.", 
        judgeMeta 
      } 
    };

  } catch (err: any) {
    logger.error("Failed to generate Oracle files", { error: err.message });
    return { status: err.message === "Ollama offline" ? 503 : 500, body: { error: err.message ?? "Generation failed" } };
  }
};
