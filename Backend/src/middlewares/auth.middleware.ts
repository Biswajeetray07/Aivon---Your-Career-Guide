import type { ApiMiddleware } from "motia";
import { verifyJwt } from "../utils/jwt";
import prisma from "../services/prisma";

export const authMiddleware = (requiredRole?: "USER" | "ADMIN"): ApiMiddleware<any, any, any> =>
  async (req, _ctx, next) => {
    const authHeader = req.headers["authorization"] as string | undefined;
    if (!authHeader?.startsWith("Bearer ")) {
      return { status: 401, body: { error: "Unauthorized — missing token" } };
    }
    const token = authHeader.slice(7);
    const payload = verifyJwt(token);
    if (!payload) return { status: 401, body: { error: "Unauthorized — invalid token" } };

    // Safety Check: Ensure user still exists in DB (H6 - Prevent Ghost Sessions)
    const userExists = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true }
    });

    if (!userExists) {
      return { status: 401, body: { error: "Unauthorized — session expired or user deleted" } };
    }

    if (requiredRole === "ADMIN" && payload.role !== "ADMIN") {
      return { status: 403, body: { error: "Forbidden — admin only" } };
    }
    (req.headers as any)["x-user-id"] = payload.userId;
    (req.headers as any)["x-user-role"] = payload.role;
    (req.headers as any)["x-user-email"] = payload.email;
    return next();
  };
