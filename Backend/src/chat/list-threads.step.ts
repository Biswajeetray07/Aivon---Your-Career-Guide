import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";

export const config: ApiRouteConfig = {
  type: "api",
  name: "ListChatThreads",
  path: "/api/chat/threads",
  method: "GET",
  emits: [],
  middleware: [authMiddleware()],
  responseSchema: {
    200: z.object({
      threads: z.array(z.object({
        id: z.string(),
        title: z.string().nullable(),
        createdAt: z.any(),
        updatedAt: z.any()
      }))
    }),
    401: z.object({ error: z.string() })
  },
  includeFiles: ["../services/prisma.ts", "../middlewares/auth.middleware.ts"],
};

export const handler: any = async (req: any) => {
  const userId = req.headers["x-user-id"] as string;
  const problemId = req.query?.problemId || "general_chat";

  const threads = await prisma.chatThread.findMany({
    where: { 
      userId,
      problemId: problemId === "all" ? undefined : problemId
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return { status: 200, body: { threads } };
};
