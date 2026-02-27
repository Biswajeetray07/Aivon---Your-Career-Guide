import type { NormalizedOutput, DiffSignal, DetectorResult } from "../types";

// Note: In Stage 4 Context Enricher, we would pass more problem metadata here,
// like `input` string to detect if it's `n=0` or `n=1`.
// For now, we simulate this by analyzing output characteristics.
export function detectEdgeCase(
  expected: NormalizedOutput,
  actual: NormalizedOutput,
  diff: DiffSignal,
  inputStr?: string
): DetectorResult | null {

  const isEdgeCaseInput = inputStr != null && (
    inputStr.trim() === "0" ||
    inputStr.trim() === "[]" ||
    inputStr.trim() === "" ||
    inputStr.trim() === "1" ||
    inputStr.trim().length <= 2
  );

  // Case A: Expected output is trivial ("0", "[]", ""), but user returned something else
  if (
    (expected.raw === "0" || expected.raw === "[]" || expected.raw === "") &&
    actual.raw.length > 0 &&
    expected.raw !== actual.raw
  ) {
    if (isEdgeCaseInput) {
      return {
        cause: "EDGE_CASE_MISS",
        confidence: 0.8,
        evidence: [
          "Your code tripped on a fundamental edge case (like an empty array, n = 0, or base case).",
          "Make sure you handle the absolute minimum constraints immediately at the top of your function before running complex logic."
        ]
      };
    }
  }

  // Case B: User produced NOTHING (empty output) when a result was expected — and input is an edge case
  if (actual.raw === "" && expected.raw.length > 0 && isEdgeCaseInput) {
    return {
      cause: "EDGE_CASE_MISS",
      confidence: 0.85,
      evidence: [
        "Your code produced no output at all for this edge case input.",
        "When input is at its minimum (e.g., n = 0 or n = 1), make sure your code still prints the correct answer instead of silently exiting."
      ]
    };
  }

  return null;
}
