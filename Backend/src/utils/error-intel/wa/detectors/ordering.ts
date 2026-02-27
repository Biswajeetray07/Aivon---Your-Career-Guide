import type { NormalizedOutput, DiffSignal, DetectorResult } from "../types";

export function detectOrdering(
  expected: NormalizedOutput,
  actual: NormalizedOutput,
  diff: DiffSignal
): DetectorResult | null {
  // If lengths don't match, it's not simply an ordering issue
  if (diff.lengthDelta !== 0 || expected.tokens.length === 0) return null;

  const sortedExpected = [...expected.tokens].sort().join(",");
  const sortedActual = [...actual.tokens].sort().join(",");

  if (sortedExpected === sortedActual) {
    // Values match perfectly, but order is wrong
    
    // Check if it's perfectly reversed
    const reversedActual = [...actual.tokens].reverse().join(",");
    const isReversed = reversedActual === expected.tokens.join(",");

    return {
      cause: "ORDERING_MISMATCH",
      confidence: 0.95,
      evidence: [
        isReversed 
          ? "Your output contains all the correct elements, but they are printed in completely reverse order."
          : "Your output contains exactly the right elements, but they are in the wrong order."
      ]
    };
  }

  return null;
}
