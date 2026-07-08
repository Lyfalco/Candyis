/** Lifetime score needed per account Level — deliberately separate from bestScore/rank, so grinding many modest games still advances an account-wide sense of progress instead of only ever mattering when it beats a single personal best. */
export const SCORE_PER_LEVEL = 20000;

/** How many levels share one badge design before the next tier of artwork kicks in. */
export const LEVELS_PER_BADGE_FAMILY = 20;

export function levelForLifetimeScore(lifetimeScore: number): number {
  return Math.floor(Math.max(0, lifetimeScore) / SCORE_PER_LEVEL) + 1;
}

/** Score already banked toward the *current* level (0..SCORE_PER_LEVEL-1). */
export function scoreIntoLevel(lifetimeScore: number): number {
  return Math.max(0, lifetimeScore) % SCORE_PER_LEVEL;
}

export function scoreToNextLevel(lifetimeScore: number): number {
  return SCORE_PER_LEVEL - scoreIntoLevel(lifetimeScore);
}

/** 0-indexed badge family — a new look every LEVELS_PER_BADGE_FAMILY levels (1-20 => 0, 21-40 => 1, ...). */
export function levelBadgeFamily(level: number): number {
  return Math.floor((level - 1) / LEVELS_PER_BADGE_FAMILY);
}
