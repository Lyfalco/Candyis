import { isDayBefore, mondayOfWeek, todayString } from './dateUtils';
import { ProgressionState } from './progressionStorage';
import { applyResultToQuest, GameResultStats, selectDailyQuests, selectWeeklyQuest } from './quests';

/** Bonus starting shuffle charges granted per day of the 7-day cycle (day 7 loops back to day 1's amount). */
export const DAILY_REWARD_TABLE = [1, 1, 2, 1, 2, 1, 3];

export function dayInCycle(currentStreak: number): number {
  return ((Math.max(1, currentStreak) - 1) % DAILY_REWARD_TABLE.length) + 1;
}

export function rewardForStreak(currentStreak: number): number {
  return DAILY_REWARD_TABLE[dayInCycle(currentStreak) - 1];
}

/**
 * Called once per app boot: rolls the login streak forward and regenerates
 * the day's quests if the calendar date has moved on since the stored
 * state. A no-op (returns `state` unchanged) if it's still the same day —
 * safe to call unconditionally on every launch.
 */
export function rollForNewDay(state: ProgressionState, today: string = todayString()): ProgressionState {
  if (state.lastLoginDate === today) return state;

  const keptStreak = state.lastLoginDate !== null && isDayBefore(state.lastLoginDate, today);
  const currentStreak = keptStreak ? state.currentStreak + 1 : 1;

  return {
    ...state,
    lastLoginDate: today,
    currentStreak,
    longestStreak: Math.max(state.longestStreak, currentStreak),
    questsDate: today,
    quests: selectDailyQuests(today),
  };
}

/**
 * Called once per app boot alongside `rollForNewDay`: regenerates the
 * standalone weekly quest the moment the calendar crosses into a new week
 * (Monday), fully automatically — no code change or manual reset ever
 * needed for it to keep producing a different goal week after week.
 */
export function rollForNewWeek(state: ProgressionState, weekStart: string = mondayOfWeek()): ProgressionState {
  if (state.weekStartDate === weekStart) return state;
  return { ...state, weekStartDate: weekStart, weeklyQuest: selectWeeklyQuest(weekStart) };
}

/** Folds a finished game's stats into today's quest progress (and the standing weekly quest, if any), and banks its score toward the account Level. Call after every game over. */
export function applyGameResult(state: ProgressionState, result: GameResultStats): ProgressionState {
  return {
    ...state,
    quests: state.quests.map((quest) => applyResultToQuest(quest, result)),
    weeklyQuest: state.weeklyQuest ? applyResultToQuest(state.weeklyQuest, result) : state.weeklyQuest,
    lifetimeScore: state.lifetimeScore + result.score,
  };
}

export function isDailyRewardAvailable(state: ProgressionState, today: string = todayString()): boolean {
  return state.dailyRewardClaimedDate !== today;
}

export function claimDailyReward(state: ProgressionState, today: string = todayString()): ProgressionState {
  if (!isDailyRewardAvailable(state, today)) return state;
  return {
    ...state,
    dailyRewardClaimedDate: today,
    pendingBonusShuffleCharges: state.pendingBonusShuffleCharges + rewardForStreak(state.currentStreak),
  };
}

export function claimQuest(state: ProgressionState, questId: string): ProgressionState {
  const quest = state.quests.find((q) => q.id === questId);
  if (!quest || quest.claimed || quest.progress < quest.target) return state;

  return {
    ...state,
    totalQuestsCompleted: state.totalQuestsCompleted + 1,
    pendingBonusShuffleCharges: state.pendingBonusShuffleCharges + quest.reward,
    quests: state.quests.map((q) => (q.id === questId ? { ...q, claimed: true } : q)),
  };
}

export function claimWeeklyQuest(state: ProgressionState): ProgressionState {
  const quest = state.weeklyQuest;
  if (!quest || quest.claimed || quest.progress < quest.target) return state;

  return {
    ...state,
    totalQuestsCompleted: state.totalQuestsCompleted + 1,
    pendingBonusShuffleCharges: state.pendingBonusShuffleCharges + quest.reward,
    weeklyQuest: { ...quest, claimed: true },
    completedWeeklyQuestIds: state.completedWeeklyQuestIds.includes(quest.id)
      ? state.completedWeeklyQuestIds
      : [...state.completedWeeklyQuestIds, quest.id],
  };
}

/** Consumes the banked bonus so it's applied to exactly one game's starting hand. */
export function consumePendingBonus(state: ProgressionState): { state: ProgressionState; charges: number } {
  return { state: { ...state, pendingBonusShuffleCharges: 0 }, charges: state.pendingBonusShuffleCharges };
}
