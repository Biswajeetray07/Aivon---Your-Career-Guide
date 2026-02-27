import type { NormalizedOutput, DiffSignal, DetectorResult } from "../types";

export function detectPrecision(
  expected: NormalizedOutput,
  actual: NormalizedOutput,
  diff: DiffSignal
): DetectorResult | null {
  // If no numeric delta is calculable, or token counts differ, it's not a clear precision issue
  if (diff.numericDelta === undefined || expected.tokens.length !== actual.tokens.length) return null;

  // Let's use a tolerance of 0.01 for "close but not exactly right" float values
  const tolerance = 0.01;

  if (diff.numericDelta > 0 && diff.numericDelta <= tolerance) {
    return {
      cause: "FLOAT_PRECISION",
      confidence: 0.9,
      evidence: [
        "Your output is extremely close to the expected value but differs by a tiny fractional amount.",
        "Ensure you are using `double` and not `float`, or check if you are flooring/rounding prematurely."
      ]
    };
  }

  // Also check if one is printing with more decimal places
  // e.g. "3.14" vs "3.1415"
  const expectedValueStr = String(expected.numericTokens[0]);
  const actualValueStr = String(actual.numericTokens[0]);

  if (expectedValueStr.includes(".") && actualValueStr.includes(".")) {
      const expDecimals = expectedValueStr.split(".")[1].length;
      const actDecimals = actualValueStr.split(".")[1].length;
      if (expDecimals !== actDecimals && expectedValueStr.startsWith(actualValueStr) || actualValueStr.startsWith(expectedValueStr)) {
          return {
              cause: "FLOAT_PRECISION_FORMAT",
              confidence: 0.85,
              evidence: [
                  "Your numeric answer appears mathematically correct but is formatted with the wrong number of decimal places."
              ]
          }
      }
  }

  return null;
}
