import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";

export const config: ApiRouteConfig = {
  type: "api",
  name: "UpdateChatThread",
  path: "/api/chat/threads/:id",
  method: "PATCH",
  emits: [],
  middleware: [authMiddleware()],
  bodySchema: z.object({
    title: z.string().min(1).max(100),
  }),
  responseSchema: {
    200: z.object({ success: z.boolean() }),
    404: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
  },
  includeFiles: ["../services/prisma.ts", "../middlewares/auth.middleware.ts"],
};

export const handler: any = async (req: any) => {
  const userId = req.headers["x-user-id"] as string;
  const { id } = (req.pathParams || req.params || {});
  const { title } = req.body;

  const thread = await prisma.chatThread.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!thread || thread.userId !== userId) {
    return { status: 404, body: { error: "Thread not found" } };
  }

  await prisma.chatThread.update({
    where: { id },
    data: { title },
  });

  return { status: 200, body: { success: true } };
};
