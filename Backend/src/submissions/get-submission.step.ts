import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";

export const config: ApiRouteConfig = {
  type: "api",
  name: "GetSubmission",
  path: "/api/submissions/:id",
  method: "GET",
  emits: [],
  flows: ["submission-flow"],
  middleware: [authMiddleware()],
  responseSchema: {
    200: z.object({}) as any,
    404: z.object({ error: z.string() }),
  },
  includeFiles: ["../services/prisma.ts", "../utils/jwt.ts", "../middlewares/auth.middleware.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  try {
    const submissionId = req.pathParams?.id as string;
    const userId = req.headers["x-user-id"] as string;

    const submission = await prisma.submission.findFirst({
      where: { id: submissionId, userId },
      include: { problem: { select: { id: true, title: true, slug: true } } },
    });

    if (!submission) return { status: 404, body: { error: "Submission not found" } };

    logger.info("Submission fetched", { submissionId });
    return { status: 200, body: submission };
  } catch (err: any) {
    logger.error("Get submission failed", { error: err.message });
    return { status: 500, body: { error: "Internal server error fetching submission" } };
  }
};

