import type { PatternDef } from "./types";

export const cppPatterns: PatternDef[] = [
  {
    id: "CPP_MISSING_SEMICOLON",
    regex: /error:\s*expected\s*['"]?;['"]?/i,
    errorType: "SyntaxError",
    shortExplanation: "Missing semicolon.",
    probableCause: "Statement not properly terminated.",
    severity: "high"
  },
  {
    id: "CPP_UNDEFINED_REFERENCE",
    regex: /undefined reference to/i,
    errorType: "LinkerError",
    shortExplanation: "Undefined reference during linking.",
    probableCause: "Function declared but not defined or missing library.",
    severity: "high"
  },
  {
    id: "CPP_NO_MATCHING_FUNCTION",
    regex: /no matching function for call to/i,
    errorType: "FunctionSignatureMismatch",
    shortExplanation: "No matching function found.",
    probableCause: "Incorrect parameters passed to function.",
    severity: "medium"
  },
  {
    id: "CPP_SEGFAULT",
    regex: /(segmentation fault|core dumped)/i,
    errorType: "SegmentationFault",
    shortExplanation: "Invalid memory access occurred.",
    probableCause: "Dereferencing null or out-of-bounds pointer.",
    severity: "high"
  },
  {
    id: "CPP_VECTOR_RANGE",
    regex: /vector::_M_range_check/i,
    errorType: "OutOfRange",
    shortExplanation: "Vector index out of range.",
    probableCause: "Accessing vector with invalid index.",
    severity: "high"
  }
];
