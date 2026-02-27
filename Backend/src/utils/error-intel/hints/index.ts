import { computeStruggleScore, type StruggleSignals } from "./struggle-engine";
import { profileDifficulty } from "./difficulty-profiler";
import { estimateUserSkill, type HistoricalSignals } from "./skill-estimator";
import { determineHintLevel } from "./policy-engine";
import { generateAdaptiveHints } from "./generator";
import { getInitialHintState, updateHintState } from "./state-tracker";
import type { HintState } from "./types";
import type { HintSet } from "../wa/types";

export * from "./types";

export { getInitialHintState, updateHintState };

export function executeAdaptiveHintLadder(
  problemDifficulty: string,
  struggleSignals: StruggleSignals,
  baseHints: HintSet,
  currentState: HintState,
  historicalSignals?: HistoricalSignals
) {
  
  const struggleScore = computeStruggleScore(struggleSignals);
  const diffProfile = profileDifficulty(problemDifficulty);
  const userSkill = estimateUserSkill(historicalSignals);

  const unlockedLevel = determineHintLevel(
    struggleScore,
    diffProfile,
    userSkill,
    currentState
  );

  const nextState = updateHintState(currentState, unlockedLevel);
  const visibleHints = generateAdaptiveHints(baseHints, unlockedLevel);

  return {
    struggleScore,
    unlockedLevel,
    visibleHints,
    nextState
  };
}
