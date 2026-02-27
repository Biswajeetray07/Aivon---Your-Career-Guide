import type { ApiRouteConfig, StepHandler } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";

export const config: ApiRouteConfig = {
  type: "api",
  name: "HealthCheck",
  path: "/api/health",
  method: "GET",
  emits: [],
  flows: ["diagnostics-flow"],
  responseSchema: {
    200: z.object({
      status: z.string(),
      database: z.string(),
      time: z.string(),
      node_env: z.string(),
    }),
    500: z.object({
      status: z.string(),
      error: z.string(),
    }),
  },
};

export const handler: StepHandler<typeof config> = async (req, { logger }) => {
  let dbStatus = "Checking...";
  try {
    // Attempt a ultra-fast query to verify DB connectivity
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "Connected";
  } catch (err: any) {
    logger.error("Health check DB fail", { error: err.message });
    dbStatus = `Disconnected: ${err.message}`;
    return {
        status: 500,
        body: {
            status: "Error",
            error: `DB Connection failed: ${err.message}`
        }
    };
  }

  return {
    status: 200,
    body: {
      status: "Operational",
      database: dbStatus,
      time: new Date().toISOString(),
      node_env: process.env.NODE_ENV || "development",
    },
  };
};
