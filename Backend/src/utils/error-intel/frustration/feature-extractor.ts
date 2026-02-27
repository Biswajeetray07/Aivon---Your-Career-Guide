import type { RawFrustrationSignals, FrustrationFeatures } from "./types";

export function extractFeatures(raw: RawFrustrationSignals): FrustrationFeatures {
  // Currently mapping near 1:1, but provides an abstraction layer 
  // to normalize or smooth raw metrics in the future.
  return {
    waStreak: raw.waCount,             // Consecutive WA count
    tleStreak: raw.tleCount,           // Consecutive TLE count
    compileBurst: raw.compileBurstCount, // Multiple CE in quick succession
    timeOnProblemMin: raw.timeOnProblemMinutes,
    idleBursts: raw.idleBurstCount,      // Timeouts/inactivity
    rapidSubmissions: raw.rapidSubmissionCount, 
    editVolatility: raw.editVolatilityHits, // Erratic typing, massive deletes
    negativeSentiment: raw.negativeSentimentScore, // 0 to 1 scale NLP
    hintSpamCount: raw.hintSpamCount
  };
}
