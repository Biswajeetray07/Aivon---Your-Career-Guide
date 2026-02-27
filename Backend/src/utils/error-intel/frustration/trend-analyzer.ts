import type { FrustrationState, FrustrationTrend } from "./types";

export function getInitialFrustrationState(): FrustrationState {
  return {
    score: 0,
    level: "calm",
    trend: { currentScore: 0, trend: "stable", velocity: 0 },
    lastScore: 0,
    lastUpdated: null,
    interventionsDelivered: 0,
    lastInterventionAt: null
  };
}

export function computeTrend(
  currentScore: number,
  previousState: FrustrationState,
  minutesSinceLastUpdate: number
): FrustrationTrend {
  
  const velocity = minutesSinceLastUpdate > 0 
    ? (currentScore - previousState.lastScore) / minutesSinceLastUpdate
    : (currentScore - previousState.lastScore);

  let trend: "rising" | "stable" | "falling" = "stable";

  // If score jumped more than 10 points per minute, definitely rising fast
  if (velocity >= 10 || currentScore - previousState.lastScore >= 15) {
     trend = "rising";
  } else if (velocity <= -5 || currentScore - previousState.lastScore <= -10) {
     trend = "falling";
  }

  return {
    currentScore,
    trend,
    velocity
  };
}
