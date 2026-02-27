import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import { analyzeError } from "../utils/error-intel/pipeline";

const bodySchema = z.object({
  language: z.string(),
  stdout: z.string().optional().nullable(),
  stderr: z.string().optional().nullable(),
  compileOutput: z.string().optional().nullable(),
  exitCode: z.number().default(0),
  timeMs: z.number().optional(),
  memoryKb: z.number().optional(),
  expectedOutput: z.string().optional().nullable(),
  userOutput: z.string().optional().nullable(),
  testInput: z.string().optional().nullable(),
  judge0StatusId: z.number().optional().default(3), // Default to accepted
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "ErrorIntelAnalyze",
  path: "/api/error-intel/analyze",
  method: "POST",
  emits: [],
  flows: ["error-intel"],
  bodySchema,
  responseSchema: {
    200: z.object({
      category: z.string(),
      confidence: z.number(),
      badge: z.string(),
      humanSummary: z.string(),
      pattern: z.any().optional(),
      enriched: z.any().optional(),
      hints: z.any(),
      raw: z.any()
    }),
    400: z.object({ error: z.string() })
  },
  includeFiles: [
    "../utils/judge-core/verdictClassifier.ts",
    "../utils/judge-core/errorSanitizer.ts",
    "../utils/error-intel/pipeline.ts",
    "../utils/error-intel/patterns/index.ts",
    "../utils/error-intel/patterns/types.ts",
    "../utils/error-intel/patterns/common.ts",
    "../utils/error-intel/patterns/python.ts",
    "../utils/error-intel/patterns/java.ts",
    "../utils/error-intel/patterns/cpp.ts",
    "../utils/error-intel/wa/index.ts",
    "../utils/error-intel/wa/types.ts",
    "../utils/error-intel/wa/normalizer.ts",
    "../utils/error-intel/wa/diff-engine.ts",
    "../utils/error-intel/wa/ranker.ts",
    "../utils/error-intel/wa/hint-builder.ts",
    "../utils/error-intel/wa/detectors/index.ts",
    "../utils/error-intel/wa/detectors/offByOne.ts",
    "../utils/error-intel/wa/detectors/ordering.ts",
    "../utils/error-intel/wa/detectors/whitespace.ts",
    "../utils/error-intel/wa/detectors/precision.ts",
    "../utils/error-intel/wa/detectors/overflow.ts",
    "../utils/error-intel/wa/detectors/edgeCase.ts",
    "../utils/error-intel/wa/detectors/partialLogic.ts",
  ],
};

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  try {
    const data = bodySchema.parse(req.body);

    const isTLE = data.judge0StatusId === 5;
    const isMLE = data.judge0StatusId === 12 || (data.memoryKb && data.memoryKb > 256000); // 256MB heuristic

    // Use passed if expected and user output explicitly match exactly
    const passed = data.expectedOutput && data.userOutput 
        ? data.expectedOutput.trim() === data.userOutput.trim() 
        : data.judge0StatusId === 3;

    const tStart = performance.now();

    const analysis = analyzeError(
      data.language,
      data.judge0StatusId,
      data.stderr || null,
      data.compileOutput || null,
      isTLE as boolean,
      isMLE as boolean,
      data.exitCode,
      passed,
      data.expectedOutput || null,
      data.userOutput || null,
      data.testInput || null
    );

    const tEnd = performance.now();
    logger.info(`Error Intel Analysis completed in ${Math.round(tEnd - tStart)}ms`);

    // Shape response exactly as requested by prompt
    const response = {
      category: analysis.category,
      confidence: analysis.waRootCause ? analysis.waRootCause.confidence : (analysis.pattern ? 0.95 : 0.8),
      badge: analysis.category === "COMPILE_ERROR" ? "red" : 
             analysis.category === "RUNTIME_ERROR" ? "orange" :
             analysis.category === "WRONG_ANSWER" ? "yellow" :
             analysis.category === "TLE" ? "purple" : "green",
      humanSummary: analysis.message,
      pattern: analysis.pattern,
      enriched: analysis.waRootCause ? {
          diffSummary: analysis.waRootCause.humanSummary,
          suspicion: analysis.waRootCause.evidence
      } : undefined,
      hints: analysis.waRootCause ? analysis.waRootCause.hints : {
          level1: analysis.hints[0] || "",
          level2: analysis.hints[1] || "",
          level3: analysis.hints[2] || ""
      },
      raw: {
        stdout: data.stdout || "",
        stderr: analysis.raw || ""
      }
    };

    return { status: 200, body: response };

  } catch (error: any) {
    logger.error("Error Intel Analysis failed", { error: error.message });
    return { status: 400, body: { error: error.message } };
  }
};
