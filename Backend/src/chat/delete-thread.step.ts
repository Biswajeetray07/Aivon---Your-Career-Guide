import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";

export const config: ApiRouteConfig = {
  type: "api",
  name: "DeleteChatThread",
  path: "/api/chat/threads/:id",
  method: "DELETE",
  emits: [],
  middleware: [authMiddleware()],
  responseSchema: {
    200: z.object({ success: z.boolean() }),
    404: z.object({ error: z.string() }),
    401: z.object({ error: z.string() })
  },
  includeFiles: ["../services/prisma.ts", "../middlewares/auth.middleware.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  const userId = req.headers["x-user-id"] as string;
  const { id } = (req.pathParams || req.params || {});

  logger.info("Chat thread deletion attempt", { threadId: id, userId });

  const thread = await prisma.chatThread.findUnique({
    where: { id, userId }
  });

  if (!thread) {
    logger.warn("Thread not found for deletion", { threadId: id, userId });
    return { status: 404, body: { error: "Thread not found" } };
  }

  try {
    await prisma.chatThread.delete({
      where: { id }
    });
    logger.info("Chat thread deleted successfully", { threadId: id });
    return { status: 200, body: { success: true } };
  } catch (err: any) {
    logger.error("Failed to delete chat thread", { error: err.message, threadId: id });
    return { status: 500, body: { error: "Internal server error" } };
  }
};
