export type TierId = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'challenger';

export interface TierDefinition {
  id: TierId;
  name: string;
  /** Cumulative best-score needed to enter this tier. */
  minScore: number;
  /** Gradient colors used for the badge, dark -> light. */
  colors: [string, string];
  glow: string;
  /** Divisions count down from IV (lowest) to I (highest). Master/Challenger have none. */
  hasDivisions: boolean;
}

export const TIERS: TierDefinition[] = [
  { id: 'bronze', name: 'Bronze', minScore: 0, colors: ['#8A5A2B', '#D8985A'], glow: '#C68642', hasDivisions: true },
  { id: 'silver', name: 'Silver', minScore: 1500, colors: ['#8D96A0', '#E7ECF0'], glow: '#C7CDD3', hasDivisions: true },
  { id: 'gold', name: 'Gold', minScore: 4000, colors: ['#C6901E', '#FFE07A'], glow: '#FFD35A', hasDivisions: true },
  { id: 'platinum', name: 'Platinum', minScore: 8000, colors: ['#2E9C8C', '#8FF0DE'], glow: '#5CE4CE', hasDivisions: true },
  { id: 'diamond', name: 'Diamond', minScore: 14000, colors: ['#3E6FCC', '#9CCBFF'], glow: '#6FA9FF', hasDivisions: true },
  { id: 'master', name: 'Master', minScore: 22000, colors: ['#7A2FBF', '#E3B8FF'], glow: '#B15CF6', hasDivisions: false },
  { id: 'challenger', name: 'Challenger', minScore: 30000, colors: ['#FF5757', '#FFD23F'], glow: '#FF8A3D', hasDivisions: false },
];

export const DIVISIONS = ['IV', 'III', 'II', 'I'] as const;

export interface RankInfo {
  tier: TierDefinition;
  tierIndex: number;
  division: (typeof DIVISIONS)[number] | null;
  /** 0..1 progress toward the next division (or next tier, for the top division). */
  progress: number;
  nextTier: TierDefinition | null;
  pointsToNextTier: number | null;
}

export function getRankForScore(score: number): RankInfo {
  let tierIndex = 0;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (score >= TIERS[i].minScore) {
      tierIndex = i;
      break;
    }
  }

  const tier = TIERS[tierIndex];
  const nextTier = TIERS[tierIndex + 1] ?? null;
  const tierSpan = nextTier ? nextTier.minScore - tier.minScore : null;
  const intoTier = score - tier.minScore;

  let division: RankInfo['division'] = null;
  let progress = 0;

  if (tier.hasDivisions && tierSpan) {
    const bandSize = tierSpan / DIVISIONS.length;
    const bandIndex = Math.min(DIVISIONS.length - 1, Math.floor(intoTier / bandSize));
    division = DIVISIONS[bandIndex];
    progress = (intoTier - bandIndex * bandSize) / bandSize;
  } else if (tierSpan) {
    progress = intoTier / tierSpan;
  } else {
    progress = 1;
  }

  return {
    tier,
    tierIndex,
    division,
    progress: Math.max(0, Math.min(1, progress)),
    nextTier,
    pointsToNextTier: nextTier ? Math.max(0, nextTier.minScore - score) : null,
  };
}

/**
 * Score band spanning a tier, used both to query real players and to seed
 * plausible mock competitors. The top tier (Challenger) has no next tier to
 * bound it — it must stay genuinely open-ended (`Infinity`), never a
 * hardcoded ceiling. An earlier version capped it at `minScore + 8000`,
 * which silently excluded any real player scoring above 38,000 from every
 * leaderboard query (`bestScore < max`) — a real, reported bug: a very high
 * scorer simply vanished from the board instead of appearing at the top.
 */
export function tierScoreRange(tier: TierDefinition): { min: number; max: number } {
  const index = TIERS.findIndex((t) => t.id === tier.id);
  const next = TIERS[index + 1];
  return { min: tier.minScore, max: next ? next.minScore - 1 : Infinity };
}

/**
 * One browsable "rung" of the full ladder — a tier on its own (Master,
 * Challenger, which have no divisions) or one specific division within a
 * tier (e.g. Platinum IV). The leaderboard screen used to only let players
 * step tier-by-tier, which meant a tier's divisions (I-IV) were never
 * individually visible — this flattens tiers+divisions into one ordered list
 * so every rung, in every tier, can be browsed.
 */
export interface Rung {
  tier: TierDefinition;
  tierIndex: number;
  division: (typeof DIVISIONS)[number] | null;
}

export const RUNGS: Rung[] = TIERS.flatMap((tier, tierIndex): Rung[] =>
  tier.hasDivisions ? DIVISIONS.map((division): Rung => ({ tier, tierIndex, division })) : [{ tier, tierIndex, division: null }],
);

export function rungScoreRange(rung: Rung): { min: number; max: number } {
  const { min: tierMin, max: tierMax } = tierScoreRange(rung.tier);
  if (!rung.tier.hasDivisions || rung.division === null) {
    return { min: tierMin, max: tierMax };
  }
  const bandSize = (tierMax - tierMin) / DIVISIONS.length;
  const bandIndex = DIVISIONS.indexOf(rung.division);
  return { min: tierMin + bandIndex * bandSize, max: tierMin + (bandIndex + 1) * bandSize };
}

/** Index into `RUNGS` of the rung a given score currently falls in. */
export function getRungIndexForScore(score: number): number {
  const rank = getRankForScore(score);
  return RUNGS.findIndex((rung) => rung.tierIndex === rank.tierIndex && rung.division === rank.division);
}
