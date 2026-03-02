import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import { getJudgeMetrics } from "../utils/judge-core/judge-metrics";
import { authMiddleware } from "../middlewares/auth.middleware";

export const config: ApiRouteConfig = {
  type: "api",
  name: "JudgeHealth",
  description: "Returns real-time operational metrics for the judge subsystem",
  path: "/api/judge/health",
  method: "GET",
  emits: [],
  flows: ["system-ops-flow"],
  middleware: [authMiddleware()], 
  responseSchema: {
    200: z.object({
      status: z.string(),
      uptimeSeconds: z.number(),
      totalExecutions: z.number(),
      byExecutionPath: z.object({
        uas: z.number(),
        legacy: z.number(),
      }),
      byVerdict: z.record(z.string(), z.number()),
      byLanguage: z.record(z.string(), z.number()),
      runtimeHistograms: z.object({
        p50: z.number(),
        p95: z.number(),
        p99: z.number(),
        avg: z.number(),
      }),
      anomalies: z.object({
        slowExecutions: z.number(),
        outputLimitExceeded: z.number(),
        internalErrors: z.number(),
      }),
    }),
    403: z.object({ error: z.string() })
  },
  includeFiles: [
    "../utils/judge-core/judge-metrics.ts",
    "../utils/jwt.ts",
    "../middlewares/auth.middleware.ts",
  ],
};

export const handler: any = async (req: any, { logger }: any) => {
  try {
    // Only allow admins to view judge health
    if (req.user?.role !== "ADMIN") {
      return { status: 403, body: { error: "Forbidden. Admin access required." } };
    }

    const metrics = getJudgeMetrics();

    logger.info("Judge health metrics fetched", { totalExecutions: metrics.totalExecutions });

    return {
      status: 200,
      body: {
        status: "ok",
        ...metrics
      },
    };
  } catch (err: any) {
    logger.error("Failed to fetch judge health", { error: err.message });
    return {
      status: 500,
      body: { error: "Internal Server Error" },
    };
  }
};
