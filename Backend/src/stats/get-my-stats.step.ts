import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";

export const config: ApiRouteConfig = {
  type: "api",
  name: "GetMyStats",
  path: "/api/stats/me",
  method: "GET",
  emits: [],
  flows: ["leaderboard-flow"],
  middleware: [authMiddleware()],
  responseSchema: {
    200: z.object({
      totalSolved: z.number(),
      totalSubmissions: z.number(),
      accuracy: z.number(),
      streak: z.number(),
      byDifficulty: z.object({ EASY: z.number(), MEDIUM: z.number(), HARD: z.number() }),
      recentActivity: z.array(z.any()),
    }),
  },
  includeFiles: ["../services/prisma.ts", "../utils/jwt.ts", "../middlewares/auth.middleware.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  try {
    const userId = req.headers["x-user-id"] as string;

    const [totalSubmissions, acceptedSubmissions, recentSubmissions, allSubmissionsDates] = await Promise.all([
      prisma.submission.count({ where: { userId } }),
      prisma.submission.findMany({
        where: { userId, status: "ACCEPTED" },
        distinct: ["problemId"],
        include: { problem: { select: { difficulty: true } } },
      }),
      prisma.submission.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { problem: { select: { title: true, slug: true, difficulty: true } } },
      }),
      prisma.submission.findMany({
        where: { userId },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" }
      }),
    ]);

    const byDifficulty = { EASY: 0, MEDIUM: 0, HARD: 0 };
    for (const s of acceptedSubmissions) {
      byDifficulty[s.problem.difficulty as keyof typeof byDifficulty]++;
    }

    // --- Streak Calculation ---
    const uniqueDatesArray = Array.from(new Set(allSubmissionsDates.map((s: any) => s.createdAt.toISOString().split("T")[0])));
    let streak = 0;
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (uniqueDatesArray.includes(todayStr) || uniqueDatesArray.includes(yesterdayStr)) {
      let indexDate = new Date(uniqueDatesArray.includes(todayStr) ? todayStr : yesterdayStr);
      while (uniqueDatesArray.includes(indexDate.toISOString().split("T")[0])) {
        streak++;
        indexDate.setDate(indexDate.getDate() - 1);
      }
    }

    logger.info("User stats fetched", { userId });
    return {
      status: 200,
      body: {
        totalSolved: acceptedSubmissions.length,
        totalSubmissions,
        accuracy: totalSubmissions ? Math.round((acceptedSubmissions.length / totalSubmissions) * 100) : 0,
        streak,
        byDifficulty,
        recentActivity: recentSubmissions.map((s: any) => ({
          id: s.id, status: s.status, language: s.language, createdAt: s.createdAt.toISOString(), problem: s.problem,
        })),
      },
    };
  } catch (err: any) {
    logger.error("Get my stats failed", { error: err.message });
    return { status: 500, body: { error: "Internal server error fetching stats" } };
  }
};
