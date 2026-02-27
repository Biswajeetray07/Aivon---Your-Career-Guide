import type { PatternDef } from "./types";

export const commonPatterns: PatternDef[] = [
  {
    id: "COMMON_TLE",
    regex: /(time limit exceeded|timed out)/i,
    errorType: "TimeLimitExceeded",
    shortExplanation: "Program exceeded time limit.",
    probableCause: "Algorithm complexity too high.",
    severity: "high"
  },
  {
    id: "COMMON_MLE",
    regex: /(memory limit exceeded|out of memory)/i,
    errorType: "MemoryLimitExceeded",
    shortExplanation: "Program exceeded memory limit.",
    probableCause: "Data structures too large or memory leak.",
    severity: "high"
  },
  {
    id: "COMMON_RUNTIME_ERROR",
    regex: /runtime error/i,
    errorType: "RuntimeError",
    shortExplanation: "Program crashed during execution.",
    probableCause: "Unhandled exception or invalid operation.",
    severity: "medium"
  }
];
