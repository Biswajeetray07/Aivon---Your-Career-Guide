import { extractFeatures } from "./feature-extractor";
import { computeFrustrationScore, classifyFrustrationLevel } from "./scorer";
import { getInitialFrustrationState, computeTrend } from "./trend-analyzer";
import { determineIntervention } from "./policy";
import type { RawFrustrationSignals, FrustrationState, FrustrationTrend } from "./types";

export * from "./types";
export { getInitialFrustrationState };

export function evaluateFrustration(
  rawSignals: RawFrustrationSignals,
  previousState: FrustrationState,
  skillLevel: "beginner" | "intermediate" | "advanced" = "intermediate"
) {

  const features = extractFeatures(rawSignals);
  const rawScore = computeFrustrationScore(features);
  
  const now = new Date();
  let minsSinceUpdate = 0;
  if (previousState.lastUpdated) {
     minsSinceUpdate = (now.getTime() - previousState.lastUpdated.getTime()) / 60000;
  }

  const trend = computeTrend(rawScore, previousState, minsSinceUpdate);
  const level = classifyFrustrationLevel(rawScore);

  const updatedState: FrustrationState = {
    ...previousState,
    score: rawScore,
    level,
    trend,
    lastScore: rawScore,
    lastUpdated: now
  };

  const intervention = determineIntervention(updatedState, skillLevel);

  if (intervention.shouldIntervene) {
      updatedState.lastInterventionAt = now;
      updatedState.interventionsDelivered += 1;
  }

  return {
    state: updatedState,
    intervention
  };
}
