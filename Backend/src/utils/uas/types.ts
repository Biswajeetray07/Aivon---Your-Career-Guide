/**
 * UAS Types — Universal Adapter System
 * 
 * Defines the strict type system for per-problem metadata that drives
 * deterministic input transformation and output normalization.
 */

// ── DSA Types ─────────────────────────────────────────────────────────────────

export type DSAType =
  | "array"
  | "string"
  | "number"
  | "boolean"
  | "matrix"
  | "linked_list"
  | "doubly_linked_list"
  | "binary_tree"
  | "bst"
  | "nary_tree"
  | "graph_adj_list"
  | "graph_edge_list"
  | "graph_weighted"
  | "intervals"
  | "heap"
  | "any"; // Pass-through — JSON decoded but not transformed

// ── Problem Spec ──────────────────────────────────────────────────────────────

export interface InputField {
  /** Parameter name (e.g. "l1", "root", "nums") */
  name: string;
  /** How to deserialize this parameter */
  type: DSAType;
}

export interface OutputSpec {
  /** How to serialize the return value back to string */
  type: DSAType;
  /** For float outputs: tolerance window (default 1e-5) */
  floatTolerance?: number;
}

export interface ProblemSpec {
  problemId: string;
  language: "python" | "javascript";
  /** Function name on the Solution class */
  functionName: string;
  /** Ordered list of input parameters */
  inputSpec: InputField[];
  /** How to interpret the return value */
  outputSpec: OutputSpec;
}

// ── Adapter Bundle ─────────────────────────────────────────────────────────────

export type HelperType =
  | "ListNode"
  | "TreeNode"
  | "NaryNode"
  | "DoublyListNode";

export interface AdapterBundle {
  /** Helper class definitions required by this problem */
  requiredHelpers: HelperType[];
  /** Python function bodies for building each input argument */
  inputBuilders: string[];
  /** Python snippet to serialize the return value */
  outputNormalizer: string;
  /** Labels for each argument, used in the test harness */
  argNames: string[];
  /** Ordered DSA types for each arg, used for conversion calls */
  argTypes: DSAType[];
}
