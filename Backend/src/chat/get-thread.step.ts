import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";

export const config: ApiRouteConfig = {
  type: "api",
  name: "GetChatThread",
  path: "/api/chat/threads/:id",
  method: "GET",
  emits: [],
  middleware: [authMiddleware()],
  responseSchema: {
    200: z.object({
      thread: z.object({
        id: z.string(),
        title: z.string().nullable(),
        createdAt: z.any(),
        messages: z.array(z.object({
          role: z.string(),
          content: z.string(),
          createdAt: z.any()
        }))
      })
    }),
    404: z.object({ error: z.string() }),
    401: z.object({ error: z.string() })
  },
  includeFiles: ["../services/prisma.ts", "../middlewares/auth.middleware.ts"],
};

export const handler: any = async (req: any) => {
  const userId = req.headers["x-user-id"] as string;
  const { id } = (req.pathParams || req.params || {});

  const thread = await prisma.chatThread.findUnique({
    where: { id, userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!thread) {
    return { status: 404, body: { error: "Thread not found" } };
  }

  return { status: 200, body: { thread } };
};
