/**
 * UAS Signature Validator
 *
 * Pre-execution guard that validates user code structure before sending to Judge0.
 * Checks class name, method name, and parameter count to prevent confusing runtime errors.
 */

import type { InputField } from "./types";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a Python submission's structure before execution.
 *
 * @param userCode   Raw user code
 * @param entryPoint Expected method name (e.g., "twoSum")
 * @param inputSpec  Expected input fields (for parameter count validation)
 * @param language   Submission language
 * @returns          Validation result with error message if invalid
 */
export function validateSignature(
  userCode: string,
  entryPoint: string,
  inputSpec: InputField[] | null,
  language: string
): ValidationResult {
  const lang = language.toLowerCase();

  if (lang === "python" || lang === "python3") {
    return validatePython(userCode, entryPoint, inputSpec);
  }

  if (lang === "javascript" || lang === "typescript") {
    return validateJavaScript(userCode, entryPoint, inputSpec);
  }

  // Unknown languages pass through
  return { valid: true };
}

// ── Python Validation ───────────────────────────────────────────────────────

function validatePython(
  code: string,
  entryPoint: string,
  inputSpec: InputField[] | null
): ValidationResult {
  // Strip comments and strings for cleaner matching
  const stripped = stripPythonComments(code);

  // 1. Check for class Solution
  if (!stripped.includes("class Solution")) {
    return {
      valid: false,
      error: `Missing 'class Solution'. Your code must define a 'class Solution' with a method '${entryPoint}'.`,
    };
  }

  // 2. Check for method definition
  const defRegex = new RegExp(
    `def\\s+${escapeRegex(entryPoint)}\\s*\\(`,
    "m"
  );
  if (!defRegex.test(stripped)) {
    return {
      valid: false,
      error: `Missing method '${entryPoint}'. Your 'Solution' class must define a method named '${entryPoint}'.`,
    };
  }

  // 3. Check parameter count (if inputSpec available)
  if (inputSpec && inputSpec.length > 0) {
    const paramRegex = new RegExp(
      `def\\s+${escapeRegex(entryPoint)}\\s*\\(([^)]*?)\\)`,
      "m"
    );
    const match = stripped.match(paramRegex);
    if (match) {
      const rawParams = match[1];
      // Count params (excluding 'self')
      const params = rawParams
        .split(",")
        .map(p => p.trim())
        .filter(p => p && p !== "self");
      const expected = inputSpec.length;
      if (params.length !== expected) {
        return {
          valid: false,
          error: `Method '${entryPoint}' has ${params.length} parameter(s) (${params.join(", ")}), but the problem expects ${expected} parameter(s) (${inputSpec.map(f => f.name).join(", ")}).`,
        };
      }
    }
  }

  return { valid: true };
}

// ── JavaScript Validation ───────────────────────────────────────────────────

function validateJavaScript(
  code: string,
  entryPoint: string,
  inputSpec: InputField[] | null
): ValidationResult {
  // Strip comments for cleaner matching
  const stripped = stripJSComments(code);

  // 1. Check for class Solution or function-based
  const hasSolution = /class\s+Solution/.test(stripped);
  const hasFn = new RegExp(`(function\\s+${escapeRegex(entryPoint)}|${escapeRegex(entryPoint)}\\s*[=(])`).test(stripped);

  if (!hasSolution && !hasFn) {
    return {
      valid: false,
      error: `Missing 'class Solution' or a function named '${entryPoint}'.`,
    };
  }

  // 2. Check method exists in class
  if (hasSolution) {
    const methodRegex = new RegExp(`${escapeRegex(entryPoint)}\\s*\\(`);
    if (!methodRegex.test(stripped)) {
      return {
        valid: false,
        error: `Your 'Solution' class must define a method named '${entryPoint}'.`,
      };
    }
  }

  return { valid: true };
}

// ── Utility ─────────────────────────────────────────────────────────────────

function stripPythonComments(code: string): string {
  // Remove single-line comments
  return code.replace(/#[^\n]*/g, "");
}

function stripJSComments(code: string): string {
  // Remove single-line and multi-line comments
  return code
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
