import { hashStringToSeed, mulberry32 } from '../game/rng';

export type QuestMetric = 'scoreTotal' | 'clearsTotal' | 'gamesPlayed' | 'shufflesUsedTotal' | 'bestCombo' | 'piecesPlacedTotal';

export interface QuestTemplate {
  id: string;
  metric: QuestMetric;
  target: number;
  /** Shuffle charges banked when claimed. 0 for a theme-reward quest — its reward is the theme unlock itself, not shuffles. */
  reward: number;
  description: string;
  /** When set, claiming this quest permanently unlocks the given limited-time board theme (see theme/boardThemes.ts) instead of/alongside banking shuffle charges. */
  rewardThemeId?: string;
}

export interface QuestInstance extends QuestTemplate {
  progress: number;
  claimed: boolean;
}

// One quest is drawn from each pool per day, so every day has exactly one
// easy/medium/hard quest instead of a fully random (and possibly all-easy or
// all-hard) mix.
const EASY_POOL: QuestTemplate[] = [
  { id: 'easy-play1', metric: 'gamesPlayed', target: 1, reward: 1, description: 'Play 1 game' },
  { id: 'easy-clears8', metric: 'clearsTotal', target: 8, reward: 1, description: 'Clear 8 lines or color groups' },
  { id: 'easy-shuffle1', metric: 'shufflesUsedTotal', target: 1, reward: 1, description: 'Use 1 shuffle' },
];

const MEDIUM_POOL: QuestTemplate[] = [
  { id: 'medium-score1200', metric: 'scoreTotal', target: 1200, reward: 2, description: 'Score 1,200 points' },
  { id: 'medium-combo4', metric: 'bestCombo', target: 4, reward: 2, description: 'Reach a x4 combo' },
  { id: 'medium-place25', metric: 'piecesPlacedTotal', target: 25, reward: 2, description: 'Place 25 pieces' },
];

const HARD_POOL: QuestTemplate[] = [
  { id: 'hard-score2500', metric: 'scoreTotal', target: 2500, reward: 3, description: 'Score 2,500 points' },
  { id: 'hard-clears25', metric: 'clearsTotal', target: 25, reward: 3, description: 'Clear 25 lines or color groups' },
  { id: 'hard-combo6', metric: 'bestCombo', target: 6, reward: 3, description: 'Reach a x6 combo' },
];

// A bigger, standalone goal that spans the whole week instead of resetting
// daily — gives the daily quest loop a longer-term "different at week's end"
// layer, entirely automatic (re-picked the moment the calendar rolls into a
// new week, same mechanism as the daily set).
const WEEKLY_POOL: QuestTemplate[] = [
  { id: 'weekly-score8000', metric: 'scoreTotal', target: 8000, reward: 5, description: 'Score 8,000 points this week' },
  { id: 'weekly-clears60', metric: 'clearsTotal', target: 60, reward: 5, description: 'Clear 60 lines or color groups this week' },
  { id: 'weekly-games10', metric: 'gamesPlayed', target: 10, reward: 5, description: 'Play 10 games this week' },
  { id: 'weekly-combo7', metric: 'bestCombo', target: 7, reward: 5, description: 'Reach a x7 combo this week' },
  { id: 'weekly-place150', metric: 'piecesPlacedTotal', target: 150, reward: 5, description: 'Place 150 pieces this week' },
  // Deliberately harder than every quest above (x9 vs the next-hardest x7) —
  // this is the rare slot `pickOne` occasionally lands on instead of a
  // normal shuffle-reward quest, and its reward is a limited-time board
  // theme (see theme/boardThemes.ts) rather than shuffle charges.
  {
    id: 'weekly-legendary-combo9',
    metric: 'bestCombo',
    target: 9,
    reward: 0,
    rewardThemeId: 'gala',
    description: 'Reach a x9 combo this week — unlocks the Obsidian Gala theme',
  },
];

function pickOne(pool: QuestTemplate[], dateStr: string, salt: string): QuestTemplate {
  const random = mulberry32(hashStringToSeed(`${dateStr}:${salt}`));
  return pool[Math.floor(random() * pool.length)];
}

/** Deterministic per-day quest set — same 3 quests all day, fresh again the next. */
export function selectDailyQuests(dateStr: string): QuestInstance[] {
  const templates = [pickOne(EASY_POOL, dateStr, 'easy'), pickOne(MEDIUM_POOL, dateStr, 'medium'), pickOne(HARD_POOL, dateStr, 'hard')];
  return templates.map((template) => ({ ...template, progress: 0, claimed: false }));
}

/** Deterministic per-week quest — same goal all week (keyed by that week's Monday), a different one the next. */
export function selectWeeklyQuest(weekStartDateStr: string): QuestInstance {
  const template = pickOne(WEEKLY_POOL, weekStartDateStr, 'weekly');
  return { ...template, progress: 0, claimed: false };
}

export interface GameResultStats {
  score: number;
  clears: number;
  bestCombo: number;
  shufflesUsed: number;
  piecesPlaced: number;
}

/** Folds one finished game's stats into a quest's running total (or best-in-game, for `bestCombo`). */
export function applyResultToQuest(quest: QuestInstance, result: GameResultStats): QuestInstance {
  if (quest.claimed) return quest;
  const delta: Record<QuestMetric, number> = {
    scoreTotal: result.score,
    clearsTotal: result.clears,
    gamesPlayed: 1,
    shufflesUsedTotal: result.shufflesUsed,
    piecesPlacedTotal: result.piecesPlaced,
    bestCombo: result.bestCombo,
  };
  const next = quest.metric === 'bestCombo' ? Math.max(quest.progress, delta.bestCombo) : quest.progress + delta[quest.metric];
  return { ...quest, progress: Math.min(next, quest.target) };
}
