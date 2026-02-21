import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";

export const config: ApiRouteConfig = {
  type: "api",
  name: "MySubmissions",
  path: "/api/submissions/my",
  method: "GET",
  emits: [],
  flows: ["submission-flow"],
  middleware: [authMiddleware()],
  responseSchema: {
    200: z.object({
      submissions: z.array(z.object({
        id: z.string(), status: z.string(), language: z.string(),
        runtime: z.number().nullable(), memory: z.number().nullable(), createdAt: z.string(),
        problem: z.object({ id: z.string(), title: z.string(), slug: z.string(), difficulty: z.string() }),
      })),
    }),
  },
  includeFiles: ["../services/prisma.ts", "../utils/jwt.ts", "../middlewares/auth.middleware.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  const userId = req.headers["x-user-id"] as string;

  const submissions = await prisma.submission.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { problem: { select: { id: true, title: true, slug: true, difficulty: true } } },
  });

  logger.info("My submissions listed", { userId, count: submissions.length });
  return {
    status: 200,
    body: {
      submissions: submissions.map((s: any) => ({
        id: s.id, status: s.status, language: s.language,
        runtime: s.runtime, memory: s.memory, createdAt: s.createdAt.toISOString(),
        problem: s.problem,
      })),
    },
  };
};
