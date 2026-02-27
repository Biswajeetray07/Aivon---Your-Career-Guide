import type { PatternDef } from "./types";
import { pythonPatterns } from "./python";
import { javaPatterns } from "./java";
import { cppPatterns } from "./cpp";
import { commonPatterns } from "./common";

export * from "./types";

export function matchPatterns(
  language: string,
  stderr: string
): PatternDef | null {
  if (!stderr) return null;
  
  const libs: PatternDef[] = [
    ...commonPatterns,
    ...(language.toLowerCase().includes("py") ? pythonPatterns : []),
    ...(language.toLowerCase().includes("java") ? javaPatterns : []),
    ...(language.toLowerCase().includes("cpp") || language.toLowerCase().includes("c++") ? cppPatterns : []),
  ];

  for (const p of libs) {
    if (p.regex.test(stderr)) {
        return p;
    }
  }

  return null;
}
