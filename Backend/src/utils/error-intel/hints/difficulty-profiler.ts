import type { DifficultyProfile } from "./types";

export function profileDifficulty(
  problemDifficulty: "EASY" | "MEDIUM" | "HARD" | string
): DifficultyProfile {
  
  const diff = problemDifficulty.toUpperCase();

  if (diff === "HARD") {
    return {
      level: "hard",
      expectedStruggle: 60,
      hintAggressiveness: 0.7 // Escalates faster on hard problems
    };
  }

  if (diff === "MEDIUM") {
    return {
      level: "medium",
      expectedStruggle: 40,
      hintAggressiveness: 0.5
    };
  }

  // DEFAULT EASY
  return {
    level: "easy",
    expectedStruggle: 20,
    hintAggressiveness: 0.3 // Escalates slower on easy problems to encourage thought
  };
}
