import type { NormalizedOutput, DiffSignal } from "./types";

export function computeDiffSignal(
  expected: NormalizedOutput,
  actual: NormalizedOutput
): DiffSignal {
  const exTokens = expected.tokens;
  const acTokens = actual.tokens;

  const lengthDelta = acTokens.length - exTokens.length;
  const lineCountDelta = actual.lines.length - expected.lines.length;

  let firstMismatchIndex = -1;
  const minLen = Math.min(exTokens.length, acTokens.length);

  for (let i = 0; i < minLen; i++) {
    if (exTokens[i] !== acTokens[i]) {
      firstMismatchIndex = i;
      break;
    }
  }

  // If one is a prefix of the other
  if (firstMismatchIndex === -1 && lengthDelta !== 0) {
    firstMismatchIndex = minLen;
  } else if (firstMismatchIndex === -1 && lengthDelta === 0) {
    // Exact match on tokens
    firstMismatchIndex = exTokens.length;
  }

  // Prefix Match Ratio
  const prefixMatchRatio = exTokens.length > 0 ? (firstMismatchIndex / Math.max(exTokens.length, acTokens.length)) : 0;

  // Suffix Match Ratio
  let suffixMatchCount = 0;
  for (let i = 0; i < minLen; i++) {
    if (exTokens[exTokens.length - 1 - i] === acTokens[acTokens.length - 1 - i]) {
      suffixMatchCount++;
    } else {
      break;
    }
  }
  const suffixMatchRatio = exTokens.length > 0 ? (suffixMatchCount / Math.max(exTokens.length, acTokens.length)) : 0;

  // Numeric delta (if arrays are exactly 1 element numeric)
  let numericDelta: number | undefined = undefined;
  if (expected.numericTokens.length === 1 && actual.numericTokens.length === 1) {
    numericDelta = Math.abs(expected.numericTokens[0] - actual.numericTokens[0]);
  }

  return {
    firstMismatchIndex,
    lengthDelta,
    lineCountDelta,
    numericDelta,
    prefixMatchRatio,
    suffixMatchRatio,
  };
}
