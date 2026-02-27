import type { PatternDef } from "./types";

export const javaPatterns: PatternDef[] = [
  {
    id: "JAVA_NPE",
    regex: /NullPointerException/i,
    errorType: "NullPointerException",
    shortExplanation: "Attempted to use a null reference.",
    probableCause: "Object was not initialized before use.",
    severity: "high"
  },
  {
    id: "JAVA_AIOOB",
    regex: /ArrayIndexOutOfBoundsException/i,
    errorType: "ArrayIndexOutOfBoundsException",
    shortExplanation: "Array index is outside valid range.",
    probableCause: "Loop bounds or index calculation is incorrect.",
    severity: "high"
  },
  {
    id: "JAVA_NUMBER_FORMAT",
    regex: /NumberFormatException/i,
    errorType: "NumberFormatException",
    shortExplanation: "Invalid number format.",
    probableCause: "Parsing a non-numeric string as a number.",
    severity: "medium"
  },
  {
    id: "JAVA_CLASS_NOT_FOUND",
    regex: /ClassNotFoundException/i,
    errorType: "ClassNotFoundException",
    shortExplanation: "Required class could not be found.",
    probableCause: "Wrong class name or missing dependency.",
    severity: "medium"
  },
  {
    id: "JAVA_STACK_OVERFLOW",
    regex: /StackOverflowError/i,
    errorType: "StackOverflowError",
    shortExplanation: "Stack overflow due to deep recursion.",
    probableCause: "Recursive call missing termination condition.",
    severity: "high"
  }
];
