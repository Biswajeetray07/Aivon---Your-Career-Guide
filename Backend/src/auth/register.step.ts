import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "../services/prisma";
import { signJwt } from "../utils/jwt";
import { rateLimitMiddleware } from "../middlewares/rateLimit.middleware";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  name: z.string().optional(),
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "AuthRegister",
  path: "/api/auth/register",
  method: "POST",
  emits: [],
  flows: ["auth-flow"],
  middleware: [rateLimitMiddleware(3600000, 5, "IP")], // 5 registrations per hour per IP
  bodySchema,
  responseSchema: {
    201: z.object({ token: z.string(), user: z.object({ id: z.string(), email: z.string(), name: z.string().nullable(), role: z.string() }) }),
    400: z.object({ error: z.string() }),
    409: z.object({ error: z.string() }),
    429: z.object({ error: z.string() }),
  },
  includeFiles: ["../services/prisma.ts", "../utils/jwt.ts", "../middlewares/rateLimit.middleware.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  try {
    const { email, password, name } = bodySchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { status: 409, body: { error: "Email already registered" } };

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { email, passwordHash, name } });

    const token = signJwt({ userId: user.id, email: user.email, role: user.role });
    logger.info("User registered", { userId: user.id });

    return { status: 201, body: { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } } };
  } catch (err: any) {
    logger.error("Register failed", { error: err.message });
    return { status: 400, body: { error: err.message ?? "Registration failed" } };
  }
};
