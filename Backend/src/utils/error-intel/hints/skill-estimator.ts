import type { UserSkill } from "./types";

export type HistoricalSignals = {
  historicalSolveRate: number; // 0.0 to 1.0
  averageAttempts: number;
};

export function estimateUserSkill(signals?: HistoricalSignals): UserSkill {
  
  if (!signals) {
    // Default fallback to intermediate if no history
    return { level: "intermediate", hintTolerance: 1.0 };
  }

  // Beginner: Low solve rate or very high average attempts
  if (signals.historicalSolveRate < 0.4 || signals.averageAttempts > 5) {
    return { level: "beginner", hintTolerance: 1.2 }; // Higher tolerance means faster hints
  }

  // Advanced: Very high solve rate and low attempts
  if (signals.historicalSolveRate > 0.8 && signals.averageAttempts < 2) {
    return { level: "advanced", hintTolerance: 0.7 }; // Lower tolerance means slower hints
  }

  return { level: "intermediate", hintTolerance: 1.0 };
}
