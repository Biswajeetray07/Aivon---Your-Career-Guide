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
  try {
    const { id } = req.pathParams;

    const problem = await prisma.problem.findFirst({
      where: { OR: [{ id }, { slug: id }], isActive: true },
      include: {
        testCases: { where: { isHidden: false }, orderBy: { order: "asc" } },
      },
    });

    if (!problem) return { status: 404, body: { error: "Problem not found" } };

    logger.info("Problem fetched", { problemId: problem.id });
    return { status: 200, body: { ...problem, createdAt: undefined, updatedAt: undefined } as any };
  } catch (err: any) {
    logger.error("Get problem failed", { error: err.message, stack: err.stack });
    return { status: 500, body: { error: "Internal server error fetching problem" } };
  }
};

