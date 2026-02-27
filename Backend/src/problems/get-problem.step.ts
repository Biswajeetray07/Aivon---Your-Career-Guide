import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";

export const config: ApiRouteConfig = {
  type: "api",
  name: "GetProblem",
  path: "/api/problems/:id",
  method: "GET",
  emits: [],
  flows: ["problems-flow"],
  responseSchema: {
    200: z.object({
      id: z.string(), title: z.string(), slug: z.string(),
      difficulty: z.string(), description: z.string(),
      starterCode: z.unknown(), entryPoint: z.string(),
      judgeMode: z.string().optional(),
      tags: z.array(z.string()), examples: z.unknown().nullable(),
      constraints: z.string().nullable(),
      testCases: z.array(z.object({ id: z.string(), input: z.string(), expected: z.string(), order: z.number() })),
    }),
    404: z.object({ error: z.string() }),
  },
  includeFiles: ["../services/prisma.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  const start = Date.now();
  console.log(`➡️ GET /api/problems/${req.pathParams.id}`);

  try {
    const { id } = (req.pathParams || req.params || {});

    console.log(`🔍 Fetching problem ${id} from DB...`);
    const problem = await prisma.problem.findFirst({
      where: { OR: [{ id }, { slug: id }], isActive: true },
      include: {
        testCases: { where: { isHidden: false }, orderBy: { order: "asc" } },
      },
    });
    console.log(`✅ Problem fetched: ${problem ? 'Found' : 'Not Found'} (${Date.now() - start}ms)`);

    if (!problem) {
      console.log(`⬅️ GET 404 Not Found`);
      return { status: 404, body: { error: "Problem not found" } };
    }

    logger.info("Problem fetched", { problemId: problem.id });

    // Map safely to avoid Zod schema validation errors causing unhandled rejections
    const safeProblem = {
      id: problem.id,
      title: problem.title,
      slug: problem.slug,
      difficulty: problem.difficulty,
      description: problem.description,
      starterCode: problem.starterCode,
      entryPoint: problem.entryPoint,
      judgeMode: problem.judgeMode,
      tags: problem.tags,
      examples: problem.examples,
      constraints: problem.constraints,
      testCases: problem.testCases.map((tc: any) => ({
        id: tc.id,
        input: String(tc.input),
        expected: String(tc.expected),
        order: Number(tc.order)
      }))
    };

    console.log(`⬅️ GET 200 OK (${Date.now() - start}ms)`);
    return { status: 200, body: safeProblem as any };
  } catch (err: any) {
    console.error("❌ getProblem FAILED:", err);
    logger.error("Get problem failed", { error: err.message, stack: err.stack });
    return { status: 500, body: { error: "Internal server error fetching problem", message: err.message } };
  }
};

