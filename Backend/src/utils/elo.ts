/**
 * ELO-like rating system for Aivon DSA Platform.
 *
 * Difficulty-weighted:
 *   EASY   → +10 (accepted) / -3 (failed)
 *   MEDIUM → +20 (accepted) / -5 (failed)
 *   HARD   → +30 (accepted) / -5 (failed)
 *
 * First-time solve bonus: +5 extra
 * Floor: 0 (rating cannot go negative)
 */

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

const ACCEPTED_GAINS: Record<Difficulty, number> = {
  EASY: 10,
  MEDIUM: 20,
  HARD: 30,
};

const FAILURE_PENALTIES: Record<Difficulty, number> = {
  EASY: 3,
  MEDIUM: 5,
  HARD: 5,
};

const FIRST_SOLVE_BONUS = 5;

export function calculateEloChange(
  currentRating: number,
  difficulty: string,
  isAccepted: boolean,
  isFirstSolve: boolean
): { newRating: number; delta: number } {
  const diff = (difficulty.toUpperCase() as Difficulty) || 'MEDIUM';

  let delta: number;

  if (isAccepted) {
    delta = ACCEPTED_GAINS[diff] ?? ACCEPTED_GAINS.MEDIUM;
    if (isFirstSolve) delta += FIRST_SOLVE_BONUS;
  } else {
    delta = -(FAILURE_PENALTIES[diff] ?? FAILURE_PENALTIES.MEDIUM);
  }

  const newRating = Math.max(0, currentRating + delta);

  return { newRating, delta: newRating - currentRating };
}
