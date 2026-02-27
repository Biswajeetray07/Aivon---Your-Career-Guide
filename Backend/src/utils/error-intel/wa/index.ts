import { normalizeOutput } from "./normalizer";
import { computeDiffSignal } from "./diff-engine";
import { runAllDetectors } from "./detectors/index";
import { rankRootCause } from "./ranker";
import { buildHints } from "./hint-builder";
import type { WARootCauseResult } from "./types";

export * from "./types";

export function analyzeWrongAnswer(
  expectedOutputStr: string,
  actualOutputStr: string,
  inputStr?: string
): WARootCauseResult {
  
  // 1. Normalize
  const expected = normalizeOutput(expectedOutputStr);
  const actual = normalizeOutput(actualOutputStr);

  // 2. Structural Diff
  const diffSignal = computeDiffSignal(expected, actual);

  // 3. Heuristic Detectors
  const detectors = runAllDetectors(expected, actual, diffSignal, inputStr);

  // 4. Ranker
  const rootCause = rankRootCause(detectors);

  // 5. Hint Builder
  const hints = buildHints(rootCause);

  return {
    cause: rootCause.cause,
    confidence: rootCause.confidence,
    humanSummary: rootCause.evidence.join(" "),
    diffSignal,
    hints,
    evidence: rootCause.evidence
  };
}
