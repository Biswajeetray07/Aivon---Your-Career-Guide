/**
 * UAS Assembler — Builds the final executable code file
 *
 * Dynamically assembles:
 *   [auto imports]
 *   [helper classes]
 *   [adapter functions]
 *   [normalizer functions]
 *   [user code]
 *   [test harness with per-arg type conversion]
 *
 * This replaces the old static template file system for problems with inputSpec.
 */

import type { ProblemSpec, DSAType } from "./types";
import { resolveAdapters } from "./resolver";
import type { AdapterBundle } from "./types";
import {
  PYTHON_AUTO_IMPORTS,
  PYTHON_HELPERS,
  PYTHON_ADAPTERS,
  PYTHON_NORMALIZERS,
} from "./helpers/python";

// Python conversion call per DSA type — used directly in harness generation
// This avoids the old bug where builder.replace(name, ...) would corrupt
// adapter function names when variable names were substrings (e.g., "l" in "linked_list")
const HARNESS_CONVERSION: Record<DSAType, (expr: string) => string> = {
  array:              (v) => v,
  string:             (v) => v,
  number:             (v) => v,
  boolean:            (v) => `bool(${v})`,
  matrix:             (v) => v,
  linked_list:        (v) => `__uas_build_linked_list(${v})`,
  doubly_linked_list: (v) => `__uas_build_doubly_linked_list(${v})`,
  binary_tree:        (v) => `__uas_build_tree(${v})`,
  bst:                (v) => `__uas_build_tree(${v})`,
  nary_tree:          (v) => `__uas_build_nary_tree(${v})`,
  graph_adj_list:     (v) => `__uas_build_graph_adj(${v})`,
  graph_edge_list:    (v) => `__uas_build_graph_edges(${v})`,
  graph_weighted:     (v) => `__uas_build_graph_weighted(${v})`,
  intervals:          (v) => v,
  heap:               (v) => `list(${v})`,
  any:                (v) => v,
};

/**
 * Assemble a complete, executable Python file for a problem.
 *
 * @param userCode    The Solution class code from the user
 * @param spec        The full ProblemSpec (inputSpec, outputSpec, functionName)
 * @param language    Currently only "python" is supported via UAS
 * @returns           A fully assembled Python file ready for Judge0
 */
export function assembleCode(
  userCode: string,
  spec: ProblemSpec,
  language: string
): string {
  if (language !== "python" && language !== "python3") {
    return userCode;
  }

  const bundle = resolveAdapters(spec);

  const imports = PYTHON_AUTO_IMPORTS;

  const helpers = bundle.requiredHelpers
    .map((h: string) => PYTHON_HELPERS[h as keyof typeof PYTHON_HELPERS])
    .join("\n");

  const adapters = PYTHON_ADAPTERS;
  const normalizers = PYTHON_NORMALIZERS;

  const cleanUserCode = userCode.trim();

  const harness = buildHarness(spec, bundle);

  return [
    imports,
    helpers,
    adapters,
    normalizers,
    cleanUserCode,
    harness,
  ].join("\n");
}

// ─── Private: Harness Generator ───────────────────────────────────────────────

function buildHarness(spec: ProblemSpec, bundle: ReturnType<typeof resolveAdapters>): string {
  const { argNames, outputNormalizer } = bundle;
  const fnName = spec.functionName;

  // Build per-argument conversion lines using HARNESS_CONVERSION directly
  // with lines[idx] as the expression — no string replacement needed
  const argLines = spec.inputSpec.map((field, idx) => {
    const converterFn = HARNESS_CONVERSION[field.type] ?? ((v: string) => v);
    const expr = converterFn(`lines[${idx}]`);
    return `        ${field.name} = ${expr}`;
  });

  const callArgs = argNames.join(", ");

  return `
if __name__ == '__main__':
    __raw = sys.stdin.read().strip()
    __raw_lines = [l.strip() for l in __raw.splitlines() if l.strip()]
    lines = []
    for __line in __raw_lines:
        try:
            lines.append(json.loads(__line))
        except Exception:
            lines.append(__line)
    try:
${argLines.join("\n")}
        __obj = Solution()
        result = __obj.${fnName}(${callArgs})
        print(${outputNormalizer})
    except Exception:
        sys.stderr.write(traceback.format_exc())
        sys.exit(1)
`;
}
