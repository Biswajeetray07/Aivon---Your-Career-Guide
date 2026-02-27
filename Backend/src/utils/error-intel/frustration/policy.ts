import type { FrustrationState } from "./types";

export type InterventionAction = {
  shouldIntervene: boolean;
  actionType: "none" | "soft_nudge" | "hint_recommendation" | "debug_assist" | "take_a_break";
  message?: string;
};

export function determineIntervention(
  currentState: FrustrationState,
  skillLevel: "beginner" | "intermediate" | "advanced" = "intermediate"
): InterventionAction {

  // Cooldown / Anti-spam check (e.g. 5 minutes)
  if (currentState.lastInterventionAt) {
    const minsSince = (new Date().getTime() - currentState.lastInterventionAt.getTime()) / 60000;
    if (minsSince < 5) return { shouldIntervene: false, actionType: "none" };
  }

  // Beginner gets help earlier
  const isBeginner = skillLevel === "beginner";
  const isAdvanced = skillLevel === "advanced";
  
  if (currentState.level === "calm") {
    return { shouldIntervene: false, actionType: "none" };
  }

  if (currentState.level === "mild") {
     if (isAdvanced) return { shouldIntervene: false, actionType: "none" };
     if (currentState.trend.trend === "rising") {
        return {
           shouldIntervene: true,
           actionType: "soft_nudge",
           message: "You're getting closer. Want to look at the edge cases?"
        };
     }
  }

  if (currentState.level === "high") {
      return {
          shouldIntervene: true,
          actionType: "hint_recommendation",
          message: "Looks like you're stuck on a tricky part. I have a targeted hint ready for you."
      };
  }

  if (currentState.level === "critical") {
      // Rage risk
      return {
          shouldIntervene: true,
          actionType: isAdvanced ? "debug_assist" : "take_a_break",
          message: isAdvanced 
              ? "Let the AI Assistant trace the exact failure point for you." 
              : "This problem is notoriously tricky. Take a short 2-minute stretch break, or I can unlock the next step for you."
      };
  }

  return { shouldIntervene: false, actionType: "none" };
}
