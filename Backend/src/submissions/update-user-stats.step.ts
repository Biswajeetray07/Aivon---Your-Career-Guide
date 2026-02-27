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

  // Helper to push real-time updates to the standalone Socket.IO server
  const pushUpdate = async (topic: string, event: string, payload: any) => {
    const socketUrl = process.env.SOCKET_URL_INTERNAL || "http://localhost:3003";
    try {
      await fetch(`${socketUrl}/emit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, event, payload }),
      });
    } catch (err) {
      logger.warn(`Failed to push real-time update to ${topic}`, { err: String(err) });
    }
  };

  if (status !== "ACCEPTED" && status !== "Accepted") {
    logger.info("Submission not accepted, skipping rating update", { submissionId });
    // Still emit a stats update so their profile unloads any spinners instantly
    await pushUpdate(`user_${userId}`, "stats_updated", { status });
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
      
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          rating: { increment: 10 },
        },
        select: { rating: true, name: true }
      });

      logger.info("User rating updated", { userId, newIncrement: 10 });

      // Emitting Real-Time System Events
      
      // 1. Leaderboard Event
      await pushUpdate("leaderboard", "leaderboard_update", {
         userId,
         name: updatedUser.name,
         newRating: updatedUser.rating,
      });

    } else {
      logger.info("Problem already solved by user. No rating change.", { userId, problemId: submission.problemId });
    }

    // 2. Personal Profile Event
    await pushUpdate(`user_${userId}`, "stats_updated", { status: "ACCEPTED" });

    // 3. Marketing Analytics Event
    await pushUpdate("marketing_stats", "system_activity", {
      type: "submission_solved",
      problemId: submission.problemId
    });

  } catch (err: any) {
    logger.error("Failed to update user stats", { error: err.message, submissionId });
  }
};
