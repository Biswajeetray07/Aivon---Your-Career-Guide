import type { ApiRouteConfig } from "motia";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";
import { z } from "zod";

export const config: ApiRouteConfig = {
  type: "api",
  name: "ArenaAPI",
  description: "Handles Arena matchmaking queue, match details, and match submissions",
  path: "/api/arena/:action",
  method: "POST",
  emits: [],
  flows: ["submission-flow"],
  middleware: [authMiddleware()],
  includeFiles: ["../services/prisma.ts", "../middlewares/auth.middleware.ts"],
};

// In-memory matchmaking queue (simple for MVP)
const matchQueue: { userId: string; joinedAt: number }[] = [];

const pushSocketEvent = async (topic: string, event: string, payload: any) => {
  const socketUrl = process.env.SOCKET_URL_INTERNAL || "http://localhost:3003";
  try {
    await fetch(`${socketUrl}/emit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, event, payload }),
    });
  } catch (err) {
    console.warn(`[Arena] Socket push failed for ${topic}`, err);
  }
};

export const handler: any = async (
  req: any,
  { logger }: { logger: any }
) => {
  const userId = req.headers["x-user-id"] as string | undefined;
  const action = req.pathParams?.action;

  if (!userId) {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  // ─── JOIN QUEUE ─────────────────────────────────────────────
  if (action === "queue") {
    // Check if already in queue
    const alreadyQueued = matchQueue.find(q => q.userId === userId);
    if (alreadyQueued) {
      return { status: 200, body: { status: "ALREADY_QUEUED" } };
    }

    matchQueue.push({ userId, joinedAt: Date.now() });
    logger.info("[Arena] User joined queue", { userId, queueSize: matchQueue.length });

    // Try to match immediately
    if (matchQueue.length >= 2) {
      const player1 = matchQueue.shift()!;
      const player2 = matchQueue.shift()!;

      // Pick a random problem
      const problemCount = await prisma.problem.count({ where: { isActive: true } });
      const skip = Math.floor(Math.random() * Math.max(problemCount, 1));
      const problem = await prisma.problem.findFirst({
        where: { isActive: true },
        skip,
        select: { id: true, title: true, slug: true, difficulty: true },
      });

      if (!problem) {
        // Put them back
        matchQueue.unshift(player1, player2);
        return { status: 200, body: { status: "QUEUED", message: "No problems available" } };
      }

      const match = await prisma.arenaMatch.create({
        data: {
          status: "ACTIVE",
          problemId: problem.id,
          player1Id: player1.userId,
          player2Id: player2.userId,
        },
      });

      logger.info("[Arena] Match created!", { matchId: match.id, p1: player1.userId, p2: player2.userId, problem: problem.title });

      // Notify both players
      const matchPayload = {
        matchId: match.id,
        problemSlug: problem.slug,
        problemTitle: problem.title,
        difficulty: problem.difficulty,
      };

      await pushSocketEvent(`user_${player1.userId}`, "arena_matched", { ...matchPayload, opponentId: player2.userId });
      await pushSocketEvent(`user_${player2.userId}`, "arena_matched", { ...matchPayload, opponentId: player1.userId });

      return { status: 200, body: { status: "MATCHED", ...matchPayload } };
    }

    return { status: 200, body: { status: "QUEUED", queuePosition: matchQueue.length } };
  }

  // ─── GET MATCH ──────────────────────────────────────────────
  if (action === "match") {
    const { matchId } = z.object({ matchId: z.string() }).parse(req.body);

    const match = await prisma.arenaMatch.findUnique({
      where: { id: matchId },
      include: {
        problem: { select: { id: true, title: true, slug: true, difficulty: true } },
        player1: { select: { id: true, name: true, rating: true } },
        player2: { select: { id: true, name: true, rating: true } },
      },
    });

    if (!match) {
      return { status: 404, body: { error: "Match not found" } };
    }

    return { status: 200, body: { match } };
  }

  // ─── SUBMIT IN MATCH ────────────────────────────────────────
  if (action === "submit") {
    const { matchId, language, code } = z.object({
      matchId: z.string(),
      language: z.string(),
      code: z.string(),
    }).parse(req.body);

    const match = await prisma.arenaMatch.findUnique({ where: { id: matchId } });
    if (!match || match.status === "COMPLETED") {
      return { status: 400, body: { error: "Match not active" } };
    }

    const isPlayer1 = match.player1Id === userId;
    const isPlayer2 = match.player2Id === userId;
    if (!isPlayer1 && !isPlayer2) {
      return { status: 403, body: { error: "Not a participant" } };
    }

    // Create a regular submission (reuse existing judge pipeline)
    const submission = await prisma.submission.create({
      data: {
        userId,
        problemId: match.problemId,
        language,
        code,
        status: "QUEUED",
      },
    });

    logger.info("[Arena] Match submission created", { matchId, submissionId: submission.id, player: isPlayer1 ? "P1" : "P2" });

    // Notify the match room about submission
    await pushSocketEvent(`arena_match_${matchId}`, "arena_progress", {
      player: isPlayer1 ? "player1" : "player2",
      userId,
      event: "SUBMITTED",
    });

    return { status: 200, body: { submissionId: submission.id, status: "QUEUED" } };
  }

  // ─── LEAVE QUEUE ────────────────────────────────────────────
  if (action === "leave") {
    const idx = matchQueue.findIndex(q => q.userId === userId);
    if (idx !== -1) {
      matchQueue.splice(idx, 1);
      logger.info("[Arena] User left queue", { userId });
    }
    return { status: 200, body: { status: "LEFT_QUEUE" } };
  }

  // ─── GET STATS ──────────────────────────────────────────────
  if (action === "stats") {
    // A user might be player1 or player2
    const matchesAsP1 = await prisma.arenaMatch.findMany({ where: { player1Id: userId, status: "COMPLETED" } });
    const matchesAsP2 = await prisma.arenaMatch.findMany({ where: { player2Id: userId, status: "COMPLETED" } });
    const allMatches = [...matchesAsP1, ...matchesAsP2];

    const totalMatches = allMatches.length;
    const wins = allMatches.filter(m => m.winnerId === userId).length;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    return { status: 200, body: { totalMatches, wins, winRate } };
  }

  return { status: 400, body: { error: "Unknown action" } };
};
