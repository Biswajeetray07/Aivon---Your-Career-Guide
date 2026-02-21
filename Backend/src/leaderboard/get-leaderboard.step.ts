import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";

export const config: ApiRouteConfig = {
  type: "api",
  name: "GetLeaderboard",
  path: "/api/leaderboard",
  method: "GET",
  emits: [],
  flows: ["leaderboard-flow"],
  queryParams: [
    { name: "limit", description: "Number of users to return (default: 20, max: 100)" },
  ],
  responseSchema: {
    200: z.object({
      leaderboard: z.array(z.object({
        rank: z.number(), userId: z.string(), name: z.string().nullable(),
        email: z.string(), rating: z.number(), solved: z.number(),
      })),
    }),
  },
  includeFiles: ["../services/prisma.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  const limit = Math.min(100, parseInt((req.queryParams.limit as string) ?? "20"));

  // Count distinct accepted problems per user
  const topUsers = await prisma.user.findMany({
    take: limit,
    orderBy: [{ rating: "desc" }],
    select: {
      id: true, name: true, email: true, rating: true,
      submissions: { where: { status: "ACCEPTED" }, distinct: ["problemId"], select: { problemId: true } },
    },
  });

  const leaderboard = topUsers.map((u: any, i: number) => ({
    rank: i + 1,
    userId: u.id,
    name: u.name,
    email: u.email,
    rating: u.rating,
    solved: u.submissions.length,
  }));

  logger.info("Leaderboard generated", { count: leaderboard.length });
  return { status: 200, body: { leaderboard } };
};
