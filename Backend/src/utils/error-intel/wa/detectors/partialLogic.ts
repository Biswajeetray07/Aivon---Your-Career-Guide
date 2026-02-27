import type { NormalizedOutput, DiffSignal, DetectorResult } from "../types";

export function detectPartialLogic(
  expected: NormalizedOutput,
  actual: NormalizedOutput,
  diff: DiffSignal
): DetectorResult | null {
  
  // If lengths differ drastically, it might be a partial logic failure (e.g. loops stopped early)
  
  // A string prefix match ratio > 0.6 but diverging heavily afterwards
  if (diff.prefixMatchRatio > 0.6 && diff.firstMismatchIndex !== -1 && diff.lengthDelta !== 0) {
      if (actual.tokens.length < expected.tokens.length) {
          return {
             cause: "PARTIAL_LOGIC_ERROR",
             confidence: 0.75,
             evidence: [
                 "Your output is correct for the first half, but it suddenly terminates or skips the rest of the elements.",
                 "Check your loop exit conditions (did you `break` early? did your pointer reach the end prematurely?)."
             ]
          };
      }
  }

  return null;
}
