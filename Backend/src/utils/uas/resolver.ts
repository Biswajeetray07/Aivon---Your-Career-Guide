/**
 * UAS Resolver — Maps ProblemSpec → AdapterBundle
 * 
 * Given a problem's inputSpec and outputSpec, determines which
 * helper classes are needed and what conversion calls to make per argument.
 */

import type { DSAType, InputField, OutputSpec, ProblemSpec, AdapterBundle, HelperType } from "./types";

// Which helpers are required per DSA type
const HELPER_MAP: Partial<Record<DSAType, HelperType[]>> = {
  linked_list:       ["ListNode"],
  doubly_linked_list:["DoublyListNode"],
  binary_tree:       ["TreeNode"],
  bst:               ["TreeNode"],
  nary_tree:         ["NaryNode"],
};

// Which helper class is needed for output serialization
const OUTPUT_HELPER_MAP: Partial<Record<DSAType, HelperType[]>> = {
  linked_list:        ["ListNode"],
  doubly_linked_list: ["DoublyListNode"],
  binary_tree:        ["TreeNode"],
  bst:                ["TreeNode"],
  nary_tree:          ["NaryNode"],
};

// Python conversion call per DSA type — applied to each argument
const CONVERSION_MAP: Record<DSAType, (varName: string) => string> = {
  array:              (v) => v,                                        // pass-through
  string:             (v) => v,                                        // pass-through
  number:             (v) => v,                                        // pass-through
  boolean:            (v) => `bool(${v})`,
  matrix:             (v) => v,                                        // already 2D list
  linked_list:        (v) => `__uas_build_linked_list(${v})`,
  doubly_linked_list: (v) => `__uas_build_doubly_linked_list(${v})`,
  binary_tree:        (v) => `__uas_build_tree(${v})`,
  bst:                (v) => `__uas_build_tree(${v})`,
  nary_tree:          (v) => `__uas_build_nary_tree(${v})`,
  graph_adj_list:     (v) => `__uas_build_graph_adj(${v})`,
  graph_edge_list:    (v) => `__uas_build_graph_edges(${v})`,
  graph_weighted:     (v) => `__uas_build_graph_weighted(${v})`,
  intervals:          (v) => v,                                        // already list of [start, end]
  heap:               (v) => `list(${v})`,
  any:                (v) => v,                                        // raw pass-through
};

/**
 * Resolve a ProblemSpec into an AdapterBundle.
 * This determines which helpers to inject, which converters to use per arg,
 * and how to serialize the output.
 */
export function resolveAdapters(spec: ProblemSpec): AdapterBundle {
  const requiredHelperSet = new Set<HelperType>();

  // Collect helpers needed for each input
  for (const field of spec.inputSpec) {
    const helpers = HELPER_MAP[field.type as DSAType] ?? [];
    helpers.forEach((h: HelperType) => requiredHelperSet.add(h));
  }

  // Collect helpers needed for output
  const outHelpers = OUTPUT_HELPER_MAP[spec.outputSpec.type] ?? [];
  outHelpers.forEach((h) => requiredHelperSet.add(h));

  // Build per-argument converter call strings
  const inputBuilders = spec.inputSpec.map((field) => {
    const converterFn = CONVERSION_MAP[field.type] ?? ((v: string) => v);
    return converterFn(field.name);
  });

  // Build output normalizer call
  const outputNormalizer = `__uas_format(result, "${spec.outputSpec.type}")`;

  return {
    requiredHelpers: Array.from(requiredHelperSet),
    inputBuilders,
    outputNormalizer,
    argNames: spec.inputSpec.map((f) => f.name),
    argTypes: spec.inputSpec.map((f) => f.type),
  };
}

/**
 * Determine which helpers are needed from just an inputSpec array.
 * Used when outputSpec is not yet available (e.g., for partial validation).
 */
export function getRequiredHelpers(inputSpec: InputField[], outputType?: DSAType): HelperType[] {
  const set = new Set<HelperType>();

  for (const field of inputSpec) {
    const helpers = HELPER_MAP[field.type] ?? [];
    helpers.forEach((h) => set.add(h));
  }

  if (outputType) {
    const helpers = OUTPUT_HELPER_MAP[outputType] ?? [];
    helpers.forEach((h) => set.add(h));
  }

  return Array.from(set);
}

