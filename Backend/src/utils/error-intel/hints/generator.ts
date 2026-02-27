import type { HintSet } from "../wa/types";

export type AdaptiveHints = {
  level1?: string;
  level2?: string;
  level3?: string;
  level4?: string;
  level5?: string;
};

export function generateAdaptiveHints(
  baseHints: HintSet,
  unlockedLevel: number
): AdaptiveHints {
  
  const hints: AdaptiveHints = {};

  if (unlockedLevel >= 1) hints.level1 = baseHints.level1;
  if (unlockedLevel >= 2) hints.level2 = baseHints.level2;
  if (unlockedLevel >= 3) hints.level3 = baseHints.level3;
  if (unlockedLevel >= 4) hints.level4 = "Ensure mid calculation and boundary updates avoid infinite loops. Trace with pen and paper."; // Example placeholder for stronger hint
  if (unlockedLevel >= 5) hints.level5 = "Full Solution Reveal Available (Requires Manual Explicit Request)";

  return hints;
}
