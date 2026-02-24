import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";

const bodySchema = z.object({
  username: z.string().min(3).max(20),
  goals: z.array(z.string()).min(1),
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "CompleteOnboarding",
  path: "/api/auth/complete-onboarding",
  method: "POST",
  emits: [],
  flows: ["auth-flow"],
  middleware: [authMiddleware()],
  bodySchema,
  responseSchema: {
    200: z.object({ success: z.boolean() }),
    400: z.object({ error: z.string() }),
    409: z.object({ error: z.string() }),
  },
  includeFiles: ["../services/prisma.ts", "../utils/jwt.ts", "../middlewares/auth.middleware.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  try {
    const userId = (req as any).userId;
    const { username, goals } = bodySchema.parse(req.body);

    // Check if username is taken
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing && existing.id !== userId) {
      return { status: 409, body: { error: "Username is already taken" } };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        goals,
        onboardingCompleted: true,
      },
    });

    logger.info("Onboarding completed", { userId, username, goals });
    return { status: 200, body: { success: true } };
  } catch (err: any) {
    logger.error("Onboarding failed", { error: err.message });
    return { status: 400, body: { error: err.message ?? "Onboarding failed" } };
  }
};
