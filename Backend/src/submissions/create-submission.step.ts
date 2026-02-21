import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";

const bodySchema = z.object({
  problemId: z.string(),
  language: z.string(),
  code: z.string().min(1),
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "CreateSubmission",
  path: "/api/submissions",
  method: "POST",
  emits: ["execute-submission"],
  flows: ["submission-flow"],
  middleware: [authMiddleware()],
  bodySchema,
  responseSchema: {
    202: z.object({ submissionId: z.string(), status: z.string() }),
    400: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
  },
  includeFiles: ["../services/prisma.ts", "../utils/jwt.ts", "../middlewares/auth.middleware.ts"],
};

export const handler: any = async (req: any, { emit, logger }: { emit: any; logger: any }) => {
  try {
    const { problemId, language, code } = bodySchema.parse(req.body);
    const userId = req.headers["x-user-id"] as string;

    const problem = await prisma.problem.findUnique({ where: { id: problemId, isActive: true } });
    if (!problem) return { status: 404, body: { error: "Problem not found" } };

    const submission = await prisma.submission.create({
      data: { userId, problemId, language, code, status: "QUEUED" },
    });

    // Push to async execution queue
    await (emit as any)({ topic: "execute-submission", data: { submissionId: submission.id } });

    logger.info("Submission queued", { submissionId: submission.id, userId, problemId });
    return { status: 202, body: { submissionId: submission.id, status: "QUEUED" } };
  } catch (err: any) {
    logger.error("Submit failed", { error: err.message });
    return { status: 400, body: { error: err.message ?? "Submission failed" } };
  }
};
