import type { FrustrationFeatures, FrustrationState } from "./types";

export function computeFrustrationScore(features: FrustrationFeatures): number {
  // score = waStreak * 6 + tleStreak * 7 + rapidSubmissions * 5 + timeOnProblemMin * 0.4 + negativeSentiment * 15 + hintSpamCount * 8
  
  let rawScore =
    (features.waStreak * 6) +
    (features.tleStreak * 7) +
    (features.compileBurst * 3) + 
    (features.rapidSubmissions * 5) +
    (features.timeOnProblemMin * 0.4) +
    (features.editVolatility * 2) +
    (features.negativeSentiment * 15) + // Multiplier on 0-1 scale means max 15 points
    (features.hintSpamCount * 8);

  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

export function classifyFrustrationLevel(score: number): "calm" | "mild" | "high" | "critical" {
  if (score >= 76) return "critical"; // rage risk
  if (score >= 51) return "high";
  if (score >= 26) return "mild";
  return "calm";
}
