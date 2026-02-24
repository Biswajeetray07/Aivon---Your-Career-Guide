import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import jwt from "jsonwebtoken";

const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  provider: z.string(),
  providerAccountId: z.string(),
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "OAuthUpsert",
  path: "/api/auth/oauth-upsert",
  method: "POST",
  emits: [],
  flows: ["auth-flow"],
  bodySchema,
  responseSchema: {
    200: z.object({ user: z.object({ id: z.string(), email: z.string() }) }),
    400: z.object({ error: z.string() }),
  },
  includeFiles: ["../services/prisma.ts", "../utils/jwt.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  try {
    const { email, name, avatar, provider, providerAccountId } = bodySchema.parse(req.body);

    // Find or create user by email (merging across providers)
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || null,
          avatar: avatar || null,
          provider,
          onboardingCompleted: false,
          goals: [],
        },
      });
      logger.info("New OAuth user created", { userId: user.id, provider });
    } else {
      // Update avatar/name if not already set
      await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(avatar && !user.avatar ? { avatar } : {}),
          ...(name && !user.name ? { name } : {}),
          ...(provider && !user.provider ? { provider } : {}),
        },
      });
    }

    // Upsert the Account link
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: { provider, providerAccountId },
      },
      update: {},
      create: {
        userId: user.id,
        type: "oauth",
        provider,
        providerAccountId,
      },
    });

    logger.info("OAuth upsert complete", { userId: user.id, provider });
    return { status: 200, body: { user: { id: user.id, email: user.email } } };
  } catch (err: any) {
    logger.error("OAuth upsert failed", { error: err.message });
    return { status: 400, body: { error: err.message ?? "OAuth upsert failed" } };
  }
};
