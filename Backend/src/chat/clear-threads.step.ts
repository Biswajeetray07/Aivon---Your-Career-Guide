import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";

export const config: ApiRouteConfig = {
  type: "api",
  name: "ClearChatThreads",
  path: "/api/chat/threads",
  method: "DELETE",
  emits: [],
  middleware: [authMiddleware()],
  responseSchema: {
    200: z.object({ success: z.boolean(), count: z.number() }),
    401: z.object({ error: z.string() })
  },
  includeFiles: ["../services/prisma.ts", "../middlewares/auth.middleware.ts"],
};

export const handler: any = async (req: any) => {
  const userId = req.headers["x-user-id"] as string;

  const result = await prisma.chatThread.deleteMany({
    where: { userId }
  });

  return { status: 200, body: { success: true, count: result.count } };
};
