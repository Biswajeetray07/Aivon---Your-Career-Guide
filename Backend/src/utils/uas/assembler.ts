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

import type { ProblemSpec } from "./types";
import { resolveAdapters } from "./resolver";
import type { AdapterBundle } from "./types";
import {
  PYTHON_AUTO_IMPORTS,
  PYTHON_HELPERS,
  PYTHON_ADAPTERS,
  PYTHON_NORMALIZERS,
} from "./helpers/python";

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
    // Non-Python falls back to the legacy template system
    return userCode;
  }

  const bundle = resolveAdapters(spec);

  // ── 1. Auto imports ─────────────────────────────────────────────────────────
  const imports = PYTHON_AUTO_IMPORTS;

  // ── 2. Helper classes ────────────────────────────────────────────────────────
  const helpers = bundle.requiredHelpers
    .map((h: string) => PYTHON_HELPERS[h as keyof typeof PYTHON_HELPERS])
    .join("\n");

  // ── 3. Adapter + normalizer utility functions ────────────────────────────────
  // Only inject adapters that are actually needed
  const needsListAdapter   = bundle.requiredHelpers.includes("ListNode") || 
                             bundle.requiredHelpers.includes("DoublyListNode");
  const needsTreeAdapter   = bundle.requiredHelpers.includes("TreeNode");
  const needsNaryAdapter   = bundle.requiredHelpers.includes("NaryNode");
  const needsGraphAdapter  = bundle.argTypes.some((t: string) => 
    t === "graph_adj_list" || t === "graph_edge_list" || t === "graph_weighted"
  );

  // We inject ALL adapters as a single block (cheap, < 1KB)
  // This avoids complex conditional injection
  const adapters = PYTHON_ADAPTERS;
  const normalizers = PYTHON_NORMALIZERS;

  // ── 4. User code ─────────────────────────────────────────────────────────────
  const cleanUserCode = userCode.trim();

  // ── 5. Test harness ────────────────────────────────────────────────────────
  // Generates:
  //   raw = sys.stdin.read()
  //   lines = [json.loads(l) for l in raw.splitlines() if l.strip()]
  //   l1 = __uas_build_linked_list(lines[0])
  //   target = lines[1]
  //   result = Solution().addTwoNumbers(l1, target)
  //   print(__uas_format(result, "linked_list"))

  const harness = buildHarness(spec, bundle);

  // ── Assemble final file ───────────────────────────────────────────────────
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
  const { inputBuilders, argNames, outputNormalizer } = bundle;
  const fnName = spec.functionName;

  // Build the per-line decode + convert section
  const argLines = argNames.map((name: string, idx: number) => {
    const builder = inputBuilders[idx];
    // builder is either the raw name (pass-through) or a call expression
    const isPassThrough = builder === name;
    if (isPassThrough) {
      return `    ${name} = lines[${idx}]`;
    }
    // builder contains the conversion call, e.g. __uas_build_linked_list(lines[0])
    // We need to substitute the variable name with lines[idx]
    const call = builder.replace(name, `lines[${idx}]`);
    return `    ${name} = ${call}`;
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
