import type { DetectorResult } from "./types";

const PRIORITY_WEIGHTS: Record<string, number> = {
  "FORMAT_MISMATCH": 1.0,
  "CASE_MISMATCH": 0.95,
  "ORDERING_MISMATCH": 0.9,
  "OFF_BY_ONE": 0.85,
  "FLOAT_PRECISION": 0.8,
  "FLOAT_PRECISION_FORMAT": 0.78,
  "INTEGER_OVERFLOW": 0.75,
  "EDGE_CASE_MISS": 0.7,
  "PARTIAL_LOGIC_ERROR": 0.6
};

export function rankRootCause(detectors: DetectorResult[]): DetectorResult {
  if (detectors.length === 0) {
    return {
      cause: "GENERIC_WA",
      confidence: 1.0,
      evidence: ["Your output did not match the expected result, but no specific heuristic was strongly identified."]
    };
  }

  // Calculate final score = confidence * weight
  let bestDetector = detectors[0];
  let highestScore = -1;

  for (const det of detectors) {
      const weight = PRIORITY_WEIGHTS[det.cause] || 0.5;
      const score = det.confidence * weight;

      if (score > highestScore) {
          highestScore = score;
          bestDetector = det;
      }
  }

  return bestDetector;
}
