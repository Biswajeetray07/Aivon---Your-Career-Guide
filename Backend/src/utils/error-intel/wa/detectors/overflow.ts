import type { NormalizedOutput, DiffSignal, DetectorResult } from "../types";

export function detectOverflow(
  expected: NormalizedOutput,
  actual: NormalizedOutput,
  diff: DiffSignal
): DetectorResult | null {
  // We need numeric outputs
  if (expected.numericTokens.length === 0 || actual.numericTokens.length === 0) return null;

  // Typical integer limits
  const INT_MAX = 2147483647;

  let suspicionPoints = 0;
  
  for (let i = 0; i < Math.min(expected.numericTokens.length, actual.numericTokens.length); i++) {
     const exp = expected.numericTokens[i];
     const act = actual.numericTokens[i];

     // If expected is a very large positive number (> INT_MAX/2) and actual is negative
     if (exp > (INT_MAX / 2) && act < 0) {
        suspicionPoints += 2;
     }

     // If expected is very large and actual is completely mathematically divergent but the rest matches
     if (exp > INT_MAX && act < INT_MAX) {
         suspicionPoints += 1;
     }
  }

  if (suspicionPoints >= 2) {
    return {
      cause: "INTEGER_OVERFLOW",
      confidence: 0.85,
      evidence: [
        "Your code produced a negative number where a massive positive number was expected.",
        "This strongly indicates an Integer Overflow. Use 64-bit integers (`long long` in C++, `long` in Java)."
      ]
    };
  }

  return null;
}
