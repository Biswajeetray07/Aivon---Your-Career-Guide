import { classifyVerdict } from "../judge-core/verdictClassifier";
import { sanitizeError } from "../judge-core/errorSanitizer";
import { matchPatterns } from "./patterns/index";
import { analyzeWrongAnswer, type WARootCauseResult } from "./wa/index";

export type ErrorIntelResult = {
  isError: boolean;
  category: string; // e.g. COMPILE_ERROR, RUNTIME_ERROR, WRONG_ANSWER, TLE, MLE
  errorType: string | null; // e.g. IndexError, NullPointerException
  line: number | null;
  message: string | null;
  hints: string[];
  pattern?: ReturnType<typeof matchPatterns>;
  waRootCause?: WARootCauseResult;
  raw?: string | null;
};

// Stage 1 & 2 & 3: Normalize, Classify, Pattern Match
export function analyzeError(
  language: string,
  judge0StatusId: number,
  stderr: string | null,
  compileOutput: string | null,
  timeLimitExceeded: boolean,
  memoryLimitExceeded: boolean,
  exitCode: number,
  passed: boolean | undefined,
  expectedOutput?: string | null,
  actualOutput?: string | null,
  testInput?: string | null
): ErrorIntelResult {
  
  const rawExec = {
    judge0StatusId,
    stderr: stderr || "",
    compileOutput: compileOutput || "",
    timedOut: timeLimitExceeded,
    memoryExceeded: memoryLimitExceeded,
    exitCode,
    stdout: "",
    signal: null,
    timeMs: 0,
    memoryKb: 0
  };

  const { verdict, errorMessage } = classifyVerdict({
    compileError: compileOutput,
    exec: rawExec,
    outputMatch: passed,
  });

  // Stage 3: High-Precision Pattern Matcher
  const matchedPattern = matchPatterns(language, stderr || errorMessage || "");
  
  const cleanError = sanitizeError(errorMessage || stderr, language, judge0StatusId);

  let category = "RUNTIME_ERROR";
  if (verdict === "Compile Error") category = "COMPILE_ERROR";
  else if (verdict === "Time Limit Exceeded") category = "TLE";
  else if (verdict === "Memory Limit Exceeded") category = "MLE";
  else if (verdict === "Wrong Answer") category = "WRONG_ANSWER";

  if (verdict === "Accepted") {
    return { isError: false, category: "ACCEPTED", errorType: null, line: null, message: null, hints: [] };
  }

  const errorType = matchedPattern?.errorType || (category === "COMPILE_ERROR" ? "SyntaxError" : (cleanError.errorType || null));

  let waRootCause: WARootCauseResult | undefined;
  if (category === "WRONG_ANSWER" && expectedOutput != null && actualOutput != null) {
      waRootCause = analyzeWrongAnswer(expectedOutput, actualOutput, testInput || undefined);
  }

  // Stage 5: Hint Engine
  const hints = waRootCause 
      ? [waRootCause.hints.level1, waRootCause.hints.level2, waRootCause.hints.level3].filter(Boolean)
      : generateDeterministicHints(category, language, errorType, cleanError.message, matchedPattern);

  return {
    isError: !passed,
    category,
    errorType,
    line: cleanError.line,
    message: waRootCause ? waRootCause.humanSummary : (matchedPattern?.shortExplanation || cleanError.message),
    hints,
    pattern: matchedPattern,
    waRootCause,
    raw: stderr || cleanError.raw
  };
}

// Stage 5: Hint Engine
function generateDeterministicHints(category: string, language: string, errorType: string | null, errorMessage: string | null, patternMatched: ReturnType<typeof matchPatterns>): string[] {
  const hints: string[] = [];

  if (category === "COMPILE_ERROR") {
    hints.push("Look closely at the line indicated in the error message for missing semicolons, parentheses, or typos.");
  } else if (category === "TLE") {
    hints.push("Your code is taking too long to execute. Consider optimizing your loops and recursive calls.");
    hints.push("Are you using nested loops (O(N^2)) when a single loop or a hash map (O(N)) would suffice?");
  } else if (category === "MLE") {
    hints.push("Your code is using too much memory. Check if you are allocating very large arrays unnecessarily.");
  } else if (category === "WRONG_ANSWER") {
    hints.push("Your output did not match the expected result for this test case.");
    hints.push("Double-check boundary conditions (e.g., empty inputs, very large standard inputs, negative numbers).");
  }

  // Use the advanced pattern metadata if available
  if (patternMatched) {
      hints.push(`Diagnosis: ${patternMatched.probableCause}`);
      // Only push explanation if it differs significantly from cause to avoid spam
      if (patternMatched.shortExplanation && patternMatched.shortExplanation !== patternMatched.probableCause) {
          hints.push(patternMatched.shortExplanation);
      }
  } else if (errorType) {
    if (errorType === "IndexError" || errorType.includes("OutOfBounds")) {
      hints.push("You are trying to access an array index that doesn't exist. Remember that arrays are 0-indexed.");
      hints.push("Check your loop bounds carefully: `for (int i = 0; i <= arr.length; i++)` will cause an out of bounds error on the last iteration.");
    } else if (errorType === "NullPointerException" || errorType === "TypeError") {
      hints.push("You are trying to perform an operation on a `null` or `undefined` value.");
      hints.push("Add a check to ensure the variable exists before accessing its properties (e.g., `if (node !== null)`).");
    } else if (errorType === "RecursionError" || errorType === "StackOverflowError") {
      hints.push("Infinite recursion detected. Ensure your recursive function has a valid Base Case that stops the recursive calls.");
    } else if (errorType === "KeyError") {
      hints.push("You are trying to access a dictionary/map key that hasn't been added yet.");
      hints.push("Use `.get(key)` or `key in map` to safely check if it exists first.");
    }
  }

  return hints;
}
