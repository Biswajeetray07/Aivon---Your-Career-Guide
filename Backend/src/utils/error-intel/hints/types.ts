export type StruggleScore = {
  score: number; // 0–100
  level: "low" | "medium" | "high" | "critical";
};

export type DifficultyProfile = {
  level: "easy" | "medium" | "hard";
  expectedStruggle: number;
  hintAggressiveness: number;
};

export type UserSkill = {
  level: "beginner" | "intermediate" | "advanced";
  hintTolerance: number;
};

export type HintState = {
  maxLevelUnlocked: number;
  hintsViewed: number[];
  lastHintAt: Date | null;
};
