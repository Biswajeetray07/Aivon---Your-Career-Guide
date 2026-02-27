import type { HintState } from "./types";

export function getInitialHintState(): HintState {
  return {
    maxLevelUnlocked: 0,
    hintsViewed: [],
    lastHintAt: null
  };
}

export function updateHintState(currentState: HintState, newlyUnlockedLevel: number): HintState {
  if (newlyUnlockedLevel > currentState.maxLevelUnlocked) {
    return {
      ...currentState,
      maxLevelUnlocked: newlyUnlockedLevel,
      lastHintAt: new Date()
    };
  }
  return currentState;
}
