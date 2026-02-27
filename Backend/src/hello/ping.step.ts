import type { ApiRouteConfig, StepHandler } from "motia";
import { z } from "zod";

export const config: ApiRouteConfig = {
  type: "api",
  name: "Ping",
  path: "/api/ping",
  method: "GET",
  emits: [],
  flows: ["diagnostics-flow"],
  responseSchema: {
    200: z.object({
      status: z.string(),
      time: z.string(),
    })
  },
};

export const handler: StepHandler<typeof config> = async () => {
  return {
    status: 200,
    body: {
      status: "Pong",
      time: new Date().toISOString(),
    },
  };
};
