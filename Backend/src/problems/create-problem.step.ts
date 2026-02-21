import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";

const testCaseSchema = z.object({
  input: z.string(),
  expected: z.string(),
  isHidden: z.boolean().default(true),
  order: z.number().default(0),
});

const bodySchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, "slug must be lowercase-kebab"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  description: z.string().min(50),
  starterCode: z.unknown(),   // { javascript: "...", python: "..." }
  entryPoint: z.string(),
  problemType: z.enum(["array", "string", "binary_tree", "linked_list", "matrix", "graph"]).default("array"),
  judgeMode: z.enum(["exact", "unordered", "float", "multiline", "spj"]).default("exact"),
  spjCode: z.string().optional(), // Python checker function for SPJ mode
  tags: z.array(z.string()).default([]),
  examples: z.unknown().optional(),
  constraints: z.string().optional(),
  testCases: z.array(testCaseSchema).min(1),
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "CreateProblem",
  path: "/api/problems",
  method: "POST",
  emits: [],
  flows: ["problems-flow"],
  middleware: [authMiddleware("ADMIN")],
  bodySchema,
  responseSchema: {
    201: z.object({ id: z.string(), title: z.string(), slug: z.string() }),
    400: z.object({ error: z.string() }),
    403: z.object({ error: z.string() }),
    409: z.object({ error: z.string() }),
  },
  includeFiles: ["../services/prisma.ts", "../utils/jwt.ts", "../middlewares/auth.middleware.ts"],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  try {
    const data = bodySchema.parse(req.body);
    const { testCases, ...problemData } = data;

    const exists = await prisma.problem.findUnique({ where: { slug: problemData.slug } });
    if (exists) return { status: 409, body: { error: "A problem with this slug already exists" } };

    const problem = await prisma.problem.create({
      data: {
        ...problemData,
        starterCode: problemData.starterCode as any,
        examples: (problemData.examples ?? []) as any,
        testCases: { createMany: { data: testCases } },
      },
    });

    logger.info("Problem created", { problemId: problem.id, title: problem.title });
    return { status: 201, body: { id: problem.id, title: problem.title, slug: problem.slug } };
  } catch (err: any) {
    logger.error("Create problem failed", { error: err.message });
    return { status: 400, body: { error: err.message ?? "Failed to create problem" } };
  }
};
