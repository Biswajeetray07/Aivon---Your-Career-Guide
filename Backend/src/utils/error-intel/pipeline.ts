import { classifyVerdict } from "../judge-core/verdictClassifier";
import { sanitizeError } from "../judge-core/errorSanitizer";

export type ErrorIntelResult = {
  isError: boolean;
  category: string; // e.g. COMPILE_ERROR, RUNTIME_ERROR, WRONG_ANSWER, TLE, MLE
  errorType: string | null; // e.g. IndexError, NullPointerException
  line: number | null;
  message: string | null;
  hints: string[];
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
  outputMatch: boolean | undefined
): ErrorIntelResult {
  
  const rawExec = {
    judge0StatusId,
    stderr: stderr || "",
    compileOutput: compileOutput || "",
    timeMs: 0,
    memoryKb: 0,
    timedOut: timeLimitExceeded,
    memoryExceeded: memoryLimitExceeded,
    exitCode,
    stdout: "",
    signal: null
  };

  const { verdict, errorMessage } = classifyVerdict({
    compileError: compileOutput,
    exec: rawExec,
    outputMatch
  });

  if (verdict === "Accepted") {
    return { isError: false, category: "ACCEPTED", errorType: null, line: null, message: null, hints: [] };
  }

  const sanitized = sanitizeError(errorMessage || stderr, language, judge0StatusId);
  const hints = generateDeterministicHints(verdict, sanitized.errorType, language);

  let category = "RUNTIME_ERROR";
  if (verdict === "Compile Error") category = "COMPILE_ERROR";
  else if (verdict === "Time Limit Exceeded") category = "TLE";
  else if (verdict === "Memory Limit Exceeded") category = "MLE";
  else if (verdict === "Wrong Answer") category = "WRONG_ANSWER";

  return {
    isError: true,
    category,
    errorType: sanitized.errorType,
    line: sanitized.line,
    message: sanitized.message,
    hints
  };
}

// Stage 5: Hint Engine
function generateDeterministicHints(verdict: string, errorType: string | null, language: string): string[] {
  const hints: string[] = [];
  
  if (verdict === "Time Limit Exceeded") {
    hints.push("Your code took too long to execute. This usually means an infinite loop or an inefficient algorithm (like O(N^2) where O(N) is expected).");
    hints.push("Check your `while` loop conditions. Ensure your pointers or loop indices are actually updating.");
  }
  
  if (verdict === "Memory Limit Exceeded") {
    hints.push("Your code consumed too much memory. Check if you are allocating unnecessarily massive arrays or doing infinite recursion building up the call stack.");
  }
  
  if (verdict === "Compile Error") {
    if (language === "c++" || language === "java") {
      hints.push("Check for missing semicolons `;`, unmatched brackets `{}`, or incorrect type declarations.");
    } else {
      hints.push("Look closely at the line number reported. Syntax errors often occur on the line immediately preceding the reported line.");
    }
  }

  if (errorType) {
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
