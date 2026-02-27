import type { StruggleScore } from "./types";

export type StruggleSignals = {
  waCount: number;
  tleCount: number;
  timeSpentMinutes: number;
  repeatedSubmissions: number;
};

export function computeStruggleScore(signals: StruggleSignals): StruggleScore {
  // score = WA_count * 5 + TLE_count * 6 + time_minutes * 0.5 + repeated_submissions * 8
  
  let rawScore = 
    (signals.waCount * 5) + 
    (signals.tleCount * 6) + 
    (signals.timeSpentMinutes * 0.5) + 
    (signals.repeatedSubmissions * 8);

  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  let level: "low" | "medium" | "high" | "critical" = "low";
  if (score >= 75) level = "critical";
  else if (score >= 50) level = "high";
  else if (score >= 25) level = "medium";

  return {
    score,
    level
  };
}
