import type { PatternDef } from "./types";

export const pythonPatterns: PatternDef[] = [
  {
    id: "PY_INDEX_ERROR",
    regex: /IndexError:\s*(.*)/i,
    errorType: "IndexError",
    shortExplanation: "List index is out of range.",
    probableCause: "Code is accessing an index that does not exist in the list.",
    severity: "high"
  },
  {
    id: "PY_KEY_ERROR",
    regex: /KeyError:\s*['"]?(.*?)['"]?\s*$/im,
    errorType: "KeyError",
    shortExplanation: "Dictionary key not found.",
    probableCause: "The code is accessing a dictionary key that does not exist.",
    severity: "medium"
  },
  {
    id: "PY_TYPE_ERROR",
    regex: /TypeError:\s*(.*)/i,
    errorType: "TypeError",
    shortExplanation: "Operation used with incompatible types.",
    probableCause: "Function or operator received values of incorrect type.",
    severity: "medium"
  },
  {
    id: "PY_ZERO_DIVISION",
    regex: /ZeroDivisionError:/i,
    errorType: "ZeroDivisionError",
    shortExplanation: "Division by zero occurred.",
    probableCause: "Denominator becomes zero during execution.",
    severity: "high"
  },
  {
    id: "PY_RECURSION_ERROR",
    regex: /RecursionError:\s*maximum recursion depth exceeded/i,
    errorType: "RecursionError",
    shortExplanation: "Maximum recursion depth exceeded.",
    probableCause: "Recursive function missing proper base case.",
    severity: "high"
  },
  {
    id: "PY_SYNTAX_ERROR",
    regex: /SyntaxError:\s*(.*)/i,
    errorType: "SyntaxError",
    shortExplanation: "Python syntax is invalid.",
    probableCause: "Missing colon, bracket, or indentation issue.",
    severity: "high"
  }
];
