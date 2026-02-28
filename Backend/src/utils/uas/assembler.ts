/**
 * UAS Assembler — Builds the final executable code file (Python + JavaScript)
 *
 * Dynamically assembles:
 *   [auto imports] → [helper classes] → [adapters] → [normalizers] → [user code] → [harness]
 */

import type { ProblemSpec, DSAType } from "./types";
import { resolveAdapters } from "./resolver";
import {
  PYTHON_AUTO_IMPORTS,
  PYTHON_HELPERS,
  PYTHON_ADAPTERS,
  PYTHON_NORMALIZERS,
} from "./helpers/python";
import {
  JS_AUTO_IMPORTS,
  JS_HELPERS,
  JS_ADAPTERS,
  JS_NORMALIZERS,
} from "./helpers/javascript";

// ── Conversion maps (per-language, per-type) ────────────────────────────────

const CONV_PY: Record<DSAType, (v: string) => string> = {
  array: (v) => v, string: (v) => v, number: (v) => v,
  boolean: (v) => `bool(${v})`, matrix: (v) => v,
  linked_list: (v) => `__uas_build_linked_list(${v})`,
  doubly_linked_list: (v) => `__uas_build_doubly_linked_list(${v})`,
  binary_tree: (v) => `__uas_build_tree(${v})`,
  bst: (v) => `__uas_build_tree(${v})`,
  nary_tree: (v) => `__uas_build_nary_tree(${v})`,
  graph_adj_list: (v) => `__uas_build_graph_adj(${v})`,
  graph_edge_list: (v) => `__uas_build_graph_edges(${v})`,
  graph_weighted: (v) => `__uas_build_graph_weighted(${v})`,
  intervals: (v) => v, heap: (v) => `list(${v})`, any: (v) => v,
};

const CONV_JS: Record<DSAType, (v: string) => string> = {
  array: (v) => v, string: (v) => v, number: (v) => v,
  boolean: (v) => `Boolean(${v})`, matrix: (v) => v,
  linked_list: (v) => `__uas_build_linked_list(${v})`,
  doubly_linked_list: (v) => `__uas_build_doubly_linked_list(${v})`,
  binary_tree: (v) => `__uas_build_tree(${v})`,
  bst: (v) => `__uas_build_tree(${v})`,
  nary_tree: (v) => `__uas_build_nary_tree(${v})`,
  graph_adj_list: (v) => `__uas_build_graph_adj(${v})`,
  graph_edge_list: (v) => `__uas_build_graph_edges(${v})`,
  graph_weighted: (v) => `__uas_build_graph_weighted(${v})`,
  intervals: (v) => v, heap: (v) => `[...${v}]`, any: (v) => v,
};

// ── Public API ──────────────────────────────────────────────────────────────

export function assembleCode(userCode: string, spec: ProblemSpec, language: string): string {
  const lang = language.toLowerCase();
  if (lang === "python" || lang === "python3") return assemblePython(userCode, spec);
  if (lang === "javascript" || lang === "typescript") return assembleJS(userCode, spec);
  return userCode;
}

// ── Python Assembler ────────────────────────────────────────────────────────

function assemblePython(userCode: string, spec: ProblemSpec): string {
  const bundle = resolveAdapters(spec);
  const helpers = bundle.requiredHelpers
    .map((h: string) => PYTHON_HELPERS[h as keyof typeof PYTHON_HELPERS])
    .join("\n");

  const argLines = spec.inputSpec.map((field, idx) => {
    const conv = CONV_PY[field.type] ?? ((v: string) => v);
    return `        ${field.name} = ${conv(`lines[${idx}]`)}`;
  });
  const callArgs = bundle.argNames.join(", ");

  const harness = `
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
        result = __obj.${spec.functionName}(${callArgs})
        print(${bundle.outputNormalizer})
    except Exception:
        sys.stderr.write(traceback.format_exc())
        sys.exit(1)
`;

  return [PYTHON_AUTO_IMPORTS, helpers, PYTHON_ADAPTERS, PYTHON_NORMALIZERS, userCode.trim(), harness].join("\n");
}

// ── JavaScript Assembler ────────────────────────────────────────────────────

function assembleJS(userCode: string, spec: ProblemSpec): string {
  const bundle = resolveAdapters(spec);
  const helpers = bundle.requiredHelpers
    .map((h: string) => JS_HELPERS[h as keyof typeof JS_HELPERS] || "")
    .join("\n");

  const argLines = spec.inputSpec.map((field, idx) => {
    const conv = CONV_JS[field.type] ?? ((v: string) => v);
    return `  const ${field.name} = ${conv(`args[${idx}]`)};`;
  });
  const callArgs = bundle.argNames.join(", ");

  // JS output normalizer — determine from outputSpec type
  const outputExpr = getJSOutputNormalizer(spec.outputSpec.type);

  const harness = `
(function __main() {
  const __lines = require('fs').readFileSync(0, 'utf-8').trim().split('\\n').filter(Boolean);
  const args = __lines.map(line => { try { return JSON.parse(line); } catch(e) { return line; } });
  try {
${argLines.join("\n")}
    const __obj = new Solution();
    const result = __obj.${spec.functionName}(${callArgs});
    process.stdout.write(${outputExpr} + '\\n');
  } catch(e) {
    process.stderr.write((e && e.stack ? e.stack : String(e)) + '\\n');
    process.exit(1);
  }
})();
`;

  return [JS_AUTO_IMPORTS, helpers, JS_ADAPTERS, JS_NORMALIZERS, userCode.trim(), harness].join("\n");
}

function getJSOutputNormalizer(type: DSAType): string {
  switch (type) {
    case "linked_list": return "__uas_format(result)";
    case "binary_tree":
    case "bst": return "__uas_format(result)";
    case "nary_tree": return "__uas_format(result)";
    default: return "__uas_format(result)";
  }
}
