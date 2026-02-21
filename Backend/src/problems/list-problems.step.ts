import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";

export const config: ApiRouteConfig = {
  type: "api",
  name: "ListProblems",
  path: "/api/problems",
  method: "GET",
  emits: [],
  flows: ["problems-flow"],
  queryParams: [
    { name: "difficulty", description: "Filter by difficulty: EASY | MEDIUM | HARD" },
    { name: "tags", description: "Comma-separated tags to filter by" },
    { name: "page", description: "Page number (default: 1)" },
    { name: "limit", description: "Items per page (default: 20, max: 50)" },
  ],
  responseSchema: {
    200: z.object({
      problems: z.array(z.object({
        id: z.string(), title: z.string(), slug: z.string(),
        difficulty: z.string(), tags: z.array(z.string()),
        _count: z.object({ submissions: z.number() }),
      })),
      total: z.number(), page: z.number(), limit: z.number(),
    }),
  },
  includeFiles: ["../services/prisma.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  const { difficulty, tags, page = "1", limit = "20" } = req.queryParams as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const where: any = { isActive: true };
  if (difficulty) where.difficulty = difficulty.toUpperCase();
  if (tags) where.tags = { hasSome: tags.split(",").map((t) => t.trim()) };

  const [problems, total] = await Promise.all([
    prisma.problem.findMany({
      where, skip, take: limitNum,
      select: { id: true, title: true, slug: true, difficulty: true, tags: true, _count: { select: { submissions: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.problem.count({ where }),
  ]);

  logger.info("Problems listed", { page: pageNum, count: problems.length });
  return { status: 200, body: { problems, total, page: pageNum, limit: limitNum } };
};
