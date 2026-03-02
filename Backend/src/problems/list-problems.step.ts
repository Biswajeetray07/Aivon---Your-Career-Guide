import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import crypto from "crypto";

// ─── In-Memory Cache-Aside Layer ──────────────────────────────────────────────
// Pre-caches paginated problem data in RAM for instant retrieval.
// TTL: 180 seconds. No Redis dependency needed for small datasets.

interface CacheEntry {
  data: any;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 180_000; // 3 minutes

function buildCacheKey(params: Record<string, string | number>): string {
  const sorted = Object.entries(params).sort(([a], [b]) => a.localeCompare(b));
  const raw = sorted.map(([k, v]) => `${k}=${v}`).join("&");
  return `problems:v1:${crypto.createHash("md5").update(raw).digest("hex")}`;
}

function getFromCache(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any): void {
  // Evict stale entries periodically (keep map lean)
  if (cache.size > 200) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now > v.expiresAt) cache.delete(k);
    }
  }
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Route Config ─────────────────────────────────────────────────────────────

export const config: ApiRouteConfig = {
  type: "api",
  name: "ListProblems",
  path: "/api/problems",
  method: "GET",
  emits: [],
  flows: ["problems-flow"],
  queryParams: [
    { name: "difficulty", description: "Filter by difficulty: EASY | MEDIUM | HARD" },
    { name: "tags", description: "Comma-separated tags to filter by" },
    { name: "search", description: "Search term to match against problem title" },
    { name: "page", description: "Page number (default: 1)" },
    { name: "limit", description: "Items per page (default: 20, max: 50)" },
  ],
  responseSchema: {
    200: z.object({
      items: z.array(z.object({
        id: z.string(), title: z.string(), slug: z.string(),
        difficulty: z.string(), tags: z.array(z.string()),
        solveRate: z.number(),
      })),
      total: z.number(), page: z.number(), limit: z.number(), hasMore: z.boolean(),
    }),
  },
  includeFiles: ["../services/prisma.ts"],
};

// ─── Handler ──────────────────────────────────────────────────────────────────

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  const startTime = Date.now();

  try {
    const { difficulty, tags, search, page = "1", limit = "20" } = req.queryParams as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // ── Cache Lookup ────────────────────────────────────────────────────────
    const cacheKey = buildCacheKey({ 
      difficulty: difficulty || "", 
      tags: tags || "", 
      search: search || "", 
      page: pageNum, 
      limit: limitNum 
    });

    const cached = getFromCache(cacheKey);
    if (cached) {
      const latency = Date.now() - startTime;
      logger.info("Problems listed (CACHE HIT)", { page: pageNum, latency: `${latency}ms` });
      return {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
          "X-Cache": "HIT",
          "X-Latency": `${latency}ms`,
        },
        body: cached,
      };
    }

    // ── DB Query ────────────────────────────────────────────────────────────
    const where: any = { isActive: true };
    if (difficulty) where.difficulty = difficulty.toUpperCase();
    if (tags) where.tags = { hasSome: tags.split(",").map((t) => t.trim()) };
    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    const [rawProblems, total] = await Promise.all([
      prisma.problem.findMany({
        where, skip, take: limitNum,
        select: {
          id: true, title: true, slug: true, difficulty: true, tags: true,
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.problem.count({ where }),
    ]);

    // ── Flatten to ProblemCardDTO ────────────────────────────────────────────
    const items = rawProblems.map((p: any) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      difficulty: p.difficulty,
      tags: p.tags || [],
      solveRate: p._count?.submissions > 0 ? Math.round((p._count.submissions / Math.max(1, total)) * 100) : 0,
    }));

    const hasMore = skip + limitNum < total;

    const responseBody = { items, total, page: pageNum, limit: limitNum, hasMore };

    // ── Cache Store ─────────────────────────────────────────────────────────
    setCache(cacheKey, responseBody);

    const latency = Date.now() - startTime;
    if (latency > 100) {
      logger.warn("Slow problems query", { latency: `${latency}ms`, page: pageNum, filters: { difficulty, tags, search } });
    }

    logger.info("Problems listed (CACHE MISS)", { page: pageNum, count: items.length, latency: `${latency}ms` });
    return {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        "X-Cache": "MISS",
        "X-Latency": `${latency}ms`,
      },
      body: responseBody,
    };
  } catch (err: any) {
    logger.error("List problems failed", { error: err.message });
    return { status: 500, body: { error: "Internal server error listing problems" } };
  }
};
