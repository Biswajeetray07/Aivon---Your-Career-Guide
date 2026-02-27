import type { NormalizedOutput, DiffSignal, DetectorResult } from "../types";

export function detectOffByOne(
  expected: NormalizedOutput,
  actual: NormalizedOutput,
  diff: DiffSignal
): DetectorResult | null {
  // Trigger Signals: lengthDelta = ±1
  const isLengthOffByOne = Math.abs(diff.lengthDelta) === 1;

  // Trigger Signals: numeric offset by ±1 (if arrays match length)
  const isNumericOffByOne = diff.numericDelta === 1 && expected.numericTokens.length === actual.numericTokens.length;

  if (isLengthOffByOne && diff.prefixMatchRatio > 0.8) {
    return {
      cause: "OFF_BY_ONE",
      confidence: 0.9,
      evidence: [
        "Your output length is exactly 1 element off from the expected length.",
        "The start of your output matches expected, diverging only at the end."
      ]
    };
  }

  if (isNumericOffByOne) {
    return {
       cause: "OFF_BY_ONE",
       confidence: 0.85,
       evidence: [
         "Your numeric output is exactly 1 unit away from expected (e.g. n vs n-1)."
       ]
    };
  }

  return null;
}
