import type { EventConfig } from "motia";
import prisma from "../services/prisma";
import { calculateEloChange } from "../utils/elo";

export const config: EventConfig = {
  type: "event",
  name: "UpdateUserStats",
  description: "Updates user rating via ELO system and solved problem counts after a submission completes",
  subscribes: ["submission-complete"],
  emits: [],
  flows: ["submission-flow"],
  includeFiles: ["../services/prisma.ts", "../utils/elo.ts"],
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

  const pushUpdate = async (topic: string, event: string, data: any) => {
    try {
      const port = process.env.PORT || "3000";
      await fetch(`http://localhost:${port}/emit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, event, payload: data }),
      });
    } catch (err) {
      logger.warn(`Failed to push real-time update to ${topic}`, { err: String(err) });
    }
  };

  const isAccepted = status === "ACCEPTED" || status === "Accepted";

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { problem: { select: { difficulty: true } } },
    });

    if (!submission) {
      logger.error("Submission not found in UpdateUserStats", { submissionId });
      return;
    }

    const difficulty = submission.problem?.difficulty || "MEDIUM";

    // Check if this is the user's first accepted solve for this problem
    const previousAccepted = isAccepted
      ? await prisma.submission.count({
          where: {
            userId,
            problemId: submission.problemId,
            status: { in: ["ACCEPTED", "Accepted"] },
            id: { not: submissionId },
          },
        })
      : 1;

    const isFirstSolve = isAccepted && previousAccepted === 0;

    // Get current rating
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { rating: true, name: true },
    });

    if (!user) {
      logger.error("User not found", { userId });
      return;
    }

    // Calculate ELO change
    const { newRating, delta } = calculateEloChange(
      user.rating,
      difficulty,
      isAccepted,
      isFirstSolve
    );

    // Only update if there's a change
    if (delta !== 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { rating: newRating },
      });

      logger.info("ELO rating updated", {
        userId,
        difficulty,
        isAccepted,
        isFirstSolve,
        oldRating: user.rating,
        newRating,
        delta,
      });

      // Leaderboard real-time update
      await pushUpdate("leaderboard", "leaderboard_update", {
        userId,
        name: user.name,
        newRating,
        delta,
      });
    }

    // Personal profile event
    await pushUpdate(`user_${userId}`, "stats_updated", {
      status,
      rating: delta !== 0 ? newRating : user.rating,
      delta,
    });

    // Marketing analytics event
    if (isAccepted) {
      await pushUpdate("marketing_stats", "system_activity", {
        type: "submission_solved",
        problemId: submission.problemId,
      });
    }
  } catch (err: any) {
    logger.error("Failed to update user stats", { error: err.message, submissionId });
  }
};
