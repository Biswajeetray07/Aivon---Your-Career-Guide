import type { EventConfig } from "motia";
import prisma from "../services/prisma";

export const config: EventConfig = {
  type: "event",
  name: "UpdateUserStats",
  description: "Updates user rating and solved problem counts after a submission completes",
  subscribes: ["submission-complete"],
  emits: [],
  flows: ["submission-flow"],
  includeFiles: ["../services/prisma.ts"],
};

export const handler: any = async (
  payload: any,
  { logger }: { logger: any }
) => {
  let submissionId, status, userId;
  try {
    submissionId = payload?.data?.submissionId || payload?.submissionId;
    status = payload?.data?.status || payload?.status;
    userId = payload?.data?.userId || payload?.userId;
    if (!submissionId || !status || !userId) {
      throw new Error(`Invalid payload, missing required fields: ${JSON.stringify(payload)}`);
    }
  } catch (e: any) {
    logger.error("UpdateUserStats init failed (Malformatted payload)", { error: e.message });
    return;
  }

  logger.info("UpdateUserStats triggered", { submissionId, status, userId });

  if (status !== "ACCEPTED" && status !== "Accepted") {
    logger.info("Submission not accepted, skipping rating update", { submissionId });
    return;
  }

  try {
    // Basic Rating Logic: +10 for each unique problem solved
    // Check if this is the first time the user solved this problem
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { problem: true },
    });

    if (!submission) {
      logger.error("Submission not found in UpdateUserStats", { submissionId });
      return;
    }

    const previousAccepted = await prisma.submission.count({
      where: {
        userId,
        problemId: submission.problemId,
        status: { in: ["ACCEPTED", "Accepted"] },
        id: { not: submissionId },
      },
    });

    if (previousAccepted === 0) {
      logger.info("First time solved! Updating rating.", { userId, problemId: submission.problemId });
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          rating: { increment: 10 },
        },
      });

      logger.info("User rating updated", { userId, newIncrement: 10 });
    } else {
      logger.info("Problem already solved by user. No rating change.", { userId, problemId: submission.problemId });
    }
  } catch (err: any) {
    logger.error("Failed to update user stats", { error: err.message, submissionId });
  }
};
