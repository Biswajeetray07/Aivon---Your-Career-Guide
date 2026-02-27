import type { NormalizedOutput, DiffSignal, DetectorResult } from "../types";

export function detectWhitespace(
  expected: NormalizedOutput,
  actual: NormalizedOutput,
  diff: DiffSignal
): DetectorResult | null {
  // First, check if the raw outputs are already exactly the same 
  // without any normalization (Should have been accepted, but just in case)
  if (expected.raw === actual.raw) return null;

  // Token-level check: if all tokens are identical but raw strings differ,
  // it's purely a formatting difference (trailing spaces, extra newlines, etc.)
  if (
    expected.tokens.length > 0 &&
    expected.tokens.length === actual.tokens.length &&
    expected.tokens.every((t, i) => t === actual.tokens[i])
  ) {
    return {
      cause: "FORMAT_MISMATCH",
      confidence: 0.99,
      evidence: [
        "Your tokens are perfectly correct, but there is a whitespace/formatting difference (e.g. trailing space or extra newline).",
        "Check for trailing spaces at the end of lines, or missing/extra newlines."
      ]
    };
  }

  // We heavily normalize both sides
  // Remove ALL whitespace and compare the dense strings
  const denseExpected = expected.raw.replace(/\s+/g, "");
  const denseActual = actual.raw.replace(/\s+/g, "");

  if (denseExpected === denseActual && denseExpected.length > 0) {
    return {
      cause: "FORMAT_MISMATCH",
      confidence: 0.98,
      evidence: [
        "Your answer has exactly the right characters, but the spacing or newlines are wrong.",
        "Check for trailing spaces, missing spaces between numbers, or missing newlines."
      ]
    };
  }

  // Check cases sensitivity
  if (denseExpected.toLowerCase() === denseActual.toLowerCase() && denseExpected.length > 0) {
     return {
        cause: "CASE_MISMATCH",
        confidence: 0.95,
        evidence: [
          "Your answer is correct but uses the wrong capitalization (e.g. 'True' instead of 'true')."
        ]
     }
  }

  return null;
}
