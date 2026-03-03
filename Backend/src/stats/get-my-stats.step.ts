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
      resumeTarget: z.any().optional(),
      pathMode: z.string().optional(),
    }),
  },
  includeFiles: ["../services/prisma.ts", "../utils/jwt.ts", "../middlewares/auth.middleware.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  try {
    const userId = req.headers["x-user-id"] as string;

    const [totalSubmissions, acceptedSubmissions, recentSubmissions, allSubmissionsDates, latestFailedSubmission, recentSolvedForTags] = await Promise.all([
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
      // For Resume Target
      prisma.submission.findFirst({
        where: { userId, status: { not: "ACCEPTED" } },
        orderBy: { createdAt: "desc" },
        include: { problem: { select: { title: true, slug: true, difficulty: true } } }
      }),
      // For Path Mode (derive from recently solved topics)
      prisma.submission.findMany({
        where: { userId, status: "ACCEPTED" },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { problem: { select: { tags: true } } }
      })
    ]);

    const byDifficulty = { EASY: 0, MEDIUM: 0, HARD: 0 };
    for (const s of acceptedSubmissions) {
      byDifficulty[s.problem.difficulty as keyof typeof byDifficulty]++;
    }

    // --- Streak Calculation (Timezone-Aware) ---
    // Extract unique ISO date strings shifted to local offset for accurate consecutive checking,
    // assuming midnight resets instead of strict 24hr blocks.
    const uniqueDatesArray = Array.from(new Set(
      allSubmissionsDates.map((s: any) => {
        const d = new Date(s.createdAt);
        // Using local ISO components rather than strict UTC mapping
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })
    ));

    let streak = 0;
    const todayLocal = new Date();
    const todayStr = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`;
    
    const yesterdayLocal = new Date();
    yesterdayLocal.setDate(todayLocal.getDate() - 1);
    const yesterdayStr = `${yesterdayLocal.getFullYear()}-${String(yesterdayLocal.getMonth() + 1).padStart(2, '0')}-${String(yesterdayLocal.getDate()).padStart(2, '0')}`;

    if (uniqueDatesArray.includes(todayStr) || uniqueDatesArray.includes(yesterdayStr)) {
      let indexDate = new Date(uniqueDatesArray.includes(todayStr) ? todayLocal : yesterdayLocal);
      let indexStr = `${indexDate.getFullYear()}-${String(indexDate.getMonth() + 1).padStart(2, '0')}-${String(indexDate.getDate()).padStart(2, '0')}`;
      
      while (uniqueDatesArray.includes(indexStr)) {
        streak++;
        indexDate.setDate(indexDate.getDate() - 1);
        indexStr = `${indexDate.getFullYear()}-${String(indexDate.getMonth() + 1).padStart(2, '0')}-${String(indexDate.getDate()).padStart(2, '0')}`;
      }
    }

    let pathMode = "Algorithm Essentials";
    if (recentSolvedForTags && recentSolvedForTags.length > 0) {
      const tagCounts: Record<string, number> = {};
      recentSolvedForTags.forEach((s: any) => {
        if (s.problem.tags && Array.isArray(s.problem.tags)) {
           s.problem.tags.forEach((t: string) => tagCounts[t] = (tagCounts[t] || 0) + 1);
        }
      });
      const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0];
      if (topTag) {
        pathMode = `${topTag[0]} Fundamentals`;
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
        resumeTarget: latestFailedSubmission ? latestFailedSubmission.problem : undefined,
        pathMode,
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
