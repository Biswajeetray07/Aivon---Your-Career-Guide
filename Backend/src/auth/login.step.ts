import type { ApiRouteConfig, StepHandler } from "motia";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "../services/prisma";
import { signJwt } from "../utils/jwt";
import { authMiddleware } from "../middlewares/auth.middleware";
import { rateLimitMiddleware } from "../middlewares/rateLimit.middleware";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "AuthLogin",
  path: "/api/auth/login",
  method: "POST",
  emits: [],
  flows: ["auth-flow"],
  middleware: [rateLimitMiddleware(60000, 10, "IP")], // 10 logins per minute per IP
  bodySchema,
  responseSchema: {
    200: z.object({ token: z.string(), user: z.object({ id: z.string(), email: z.string(), name: z.string().nullable(), role: z.string(), rating: z.number() }) }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    429: z.object({ error: z.string() }),
  },
  includeFiles: ["../services/prisma.ts", "../utils/jwt.ts", "../middlewares/rateLimit.middleware.ts"],
};

export const handler: StepHandler<typeof config> = async (req, { logger }) => {
  try {
    const { email, password } = bodySchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { status: 401, body: { error: "Invalid email or password" } };

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return { status: 401, body: { error: "Invalid email or password" } };

    const token = signJwt({ userId: user.id, email: user.email, role: user.role });
    logger.info("User logged in", { userId: user.id });

    return { status: 200, body: { token, user: { id: user.id, email: user.email, name: user.name, role: user.role, rating: user.rating } } };
  } catch (err: any) {
    logger.error("Login failed", { error: err.message });
    return { status: 400, body: { error: err.message ?? "Login failed" } };
  }
};
