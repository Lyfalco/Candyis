export const POINTS_PER_PLACED_CELL = 2;
export const POINTS_PER_CLEARED_CELL = 10;
export const STREAK_BONUS_PER_LEVEL = 20;
export const MAX_TRACKED_STREAK = 20;

export interface ScoreBreakdown {
  placementScore: number;
  clearScore: number;
  streakBonus: number;
  total: number;
}

export function scorePlacement(cellsPlaced: number): number {
  return cellsPlaced * POINTS_PER_PLACED_CELL;
}

export function scoreClear(cellsCleared: number, groupCount: number, streakLevel: number): ScoreBreakdown {
  const clearScore = cellsCleared * POINTS_PER_CLEARED_CELL * Math.max(1, groupCount);
  const streakBonus = streakLevel * STREAK_BONUS_PER_LEVEL;
  return {
    placementScore: 0,
    clearScore,
    streakBonus,
    total: clearScore + streakBonus,
  };
}
