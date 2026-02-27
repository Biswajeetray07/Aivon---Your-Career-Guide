import type { StruggleScore, DifficultyProfile, UserSkill, HintState } from "./types";

export function determineHintLevel(
  struggle: StruggleScore,
  difficulty: DifficultyProfile,
  skill: UserSkill,
  currentState: HintState
): number {
  
  // Base pressure equation: struggle * problemAgro * skillTolerance
  // Ranges roughly from 0 to 100 * 0.7 * 1.2 = ~84 max standard, but can scale higher
  const effectivePressure = struggle.score * difficulty.hintAggressiveness * skill.hintTolerance;

  let computedLevel = 0;

  if (effectivePressure > 95) computedLevel = 5; // allow Level 5 (if explicitly asked later)
  else if (effectivePressure >= 81) computedLevel = 4;
  else if (effectivePressure >= 61) computedLevel = 3;
  else if (effectivePressure >= 41) computedLevel = 2;
  else if (effectivePressure >= 21) computedLevel = 1;
  else computedLevel = 0;

  // Enforce progressive unlocking (cannot skip levels unless logic allows it)
  // For safety, users shouldn't jump from Level 0 straight to Level 4 without going through 1, 2, 3
  // Here we cap the increase to +1 of their max unlocked so far
  const maxAllowedLevel = Math.min(currentState.maxLevelUnlocked + 1, computedLevel);

  return Math.max(0, maxAllowedLevel);
}
