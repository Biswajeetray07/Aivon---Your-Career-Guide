import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";

export const config: ApiRouteConfig = {
  type: "api",
  name: "AuthSession",
  path: "/api/auth/me",
  method: "GET",
  emits: [],
  flows: ["auth-flow"],
  middleware: [authMiddleware()],
  responseSchema: {
    200: z.object({ user: z.object({ id: z.string(), email: z.string(), name: z.string().nullable(), role: z.string(), rating: z.number(), createdAt: z.string() }) }),
    401: z.object({ error: z.string() }),
  },
  includeFiles: ["../services/prisma.ts", "../utils/jwt.ts", "../middlewares/auth.middleware.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { status: 401, body: { error: "User not found" } };

    return { status: 200, body: { user: { id: user.id, email: user.email, name: user.name, role: user.role, rating: user.rating, createdAt: user.createdAt.toISOString() } } };
  } catch (err: any) {
    logger.error("Session check failed", { error: err.message });
    return { status: 401, body: { error: "Unauthorized" } };
  }
};
