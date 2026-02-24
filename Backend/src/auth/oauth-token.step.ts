import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import jwt from "jsonwebtoken";

const bodySchema = z.object({
  email: z.string().email(),
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "OAuthToken",
  path: "/api/auth/oauth-token",
  method: "POST",
  emits: [],
  flows: ["auth-flow"],
  bodySchema,
  responseSchema: {
    200: z.object({ token: z.string(), user: z.object({ id: z.string(), email: z.string(), name: z.string().nullable() }) }),
    404: z.object({ error: z.string() }),
    400: z.object({ error: z.string() }),
  },
  includeFiles: ["../services/prisma.ts", "../utils/jwt.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  try {
    const { email } = bodySchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true, rating: true },
    });

    if (!user) {
      return { status: 404, body: { error: "User not found" } };
    }

    const secret = process.env.JWT_SECRET || "aivon-secret-change-me";
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: "7d" }
    );

    logger.info("OAuth token issued", { userId: user.id });
    return {
      status: 200,
      body: { token, user: { id: user.id, email: user.email, name: user.name } },
    };
  } catch (err: any) {
    logger.error("OAuth token generation failed", { error: err.message });
    return { status: 400, body: { error: err.message ?? "Token generation failed" } };
  }
};
