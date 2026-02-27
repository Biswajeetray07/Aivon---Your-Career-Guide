import type { NormalizedOutput, DiffSignal, DetectorResult } from "../types";
import { detectOffByOne } from "./offByOne";
import { detectOrdering } from "./ordering";
import { detectWhitespace } from "./whitespace";
import { detectPrecision } from "./precision";
import { detectOverflow } from "./overflow";
import { detectEdgeCase } from "./edgeCase";
import { detectPartialLogic } from "./partialLogic";

export function runAllDetectors(
  expected: NormalizedOutput,
  actual: NormalizedOutput,
  diff: DiffSignal,
  inputStr?: string
): DetectorResult[] {
  const results: DetectorResult[] = [];

  const add = (res: DetectorResult | null) => {
    if (res) results.push(res);
  };

  add(detectWhitespace(expected, actual, diff)); // Often highest priority if just format
  add(detectOrdering(expected, actual, diff));
  add(detectOffByOne(expected, actual, diff));
  add(detectPrecision(expected, actual, diff));
  add(detectOverflow(expected, actual, diff));
  add(detectEdgeCase(expected, actual, diff, inputStr));
  add(detectPartialLogic(expected, actual, diff));

  return results;
}
