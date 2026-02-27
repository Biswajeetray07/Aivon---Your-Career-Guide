import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";

export const config: ApiRouteConfig = {
  type: "api",
  name: "GetUserRating",
  path: "/api/user/rating",
  method: "GET",
  emits: [],
  flows: ["stats-flow"],
  middleware: [authMiddleware()],
  bodySchema: z.object({}),
  responseSchema: {
    200: z.object({
      rating: z.number(),
      rank: z.number(),
      percentile: z.number(),
      totalUsers: z.number(),
    }),
    404: z.object({ error: z.string() }),
  },
  includeFiles: ["../services/prisma.ts", "../utils/jwt.ts", "../middlewares/auth.middleware.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return { status: 401, body: { error: "Unauthorized" } };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { rating: true },
    });

    if (!user) return { status: 404, body: { error: "User not found" } };

    // Calculate rank and percentile
    const [totalUsers, usersAbove] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { rating: { gt: user.rating } } }),
    ]);

    const rank = usersAbove + 1;
    const percentile = totalUsers > 1
      ? Math.round(((totalUsers - rank) / (totalUsers - 1)) * 100)
      : 100;

    logger.info("Rating fetched", { userId, rating: user.rating, rank });

    return {
      status: 200,
      body: {
        rating: user.rating,
        rank,
        percentile,
        totalUsers,
      },
    };
  } catch (err: any) {
    logger.error("Failed to fetch rating", { error: err.message });
    return { status: 500, body: { error: "Internal error" } };
  }
};
