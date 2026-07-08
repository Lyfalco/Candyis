import AsyncStorage from '@react-native-async-storage/async-storage';
import { QuestInstance } from './quests';

const STORAGE_KEY = 'candyis:progression';

export interface ProgressionState {
  lastLoginDate: string | null;
  /** Consecutive days played, resets to 1 on a gap — drives which day of the 7-day reward cycle is next. */
  currentStreak: number;
  /** Longest streak ever reached — monotonic, so the streak-gated theme unlock can't be lost to a later gap. */
  longestStreak: number;
  /** Date the daily reward was last claimed; compared against today to know if today's is still available. */
  dailyRewardClaimedDate: string | null;
  /** Shuffle charges banked from claimed rewards/quests, applied once to the next game's starting hand. */
  pendingBonusShuffleCharges: number;
  /** Lifetime completed-quest count — monotonic, drives the quest-gated theme unlock. */
  totalQuestsCompleted: number;
  /** Date the current 3 quests were generated for. */
  questsDate: string | null;
  quests: QuestInstance[];
  /** The Monday ('YYYY-MM-DD') the current weekly quest was generated for — rolls over automatically the moment the calendar crosses into a new week. */
  weekStartDate: string | null;
  weeklyQuest: QuestInstance | null;
  /** Cumulative score across every game ever finished — drives the account Level, entirely independent of `bestScore` (which only tracks the single best run). */
  lifetimeScore: number;
  /** Every weekly quest id ever claimed, append-only — lets a `weeklyQuest`-gated theme stay unlocked forever once earned, even after that quest later rotates out and a different one becomes the active weekly quest. */
  completedWeeklyQuestIds: string[];
}

export function makeDefaultProgressionState(): ProgressionState {
  return {
    lastLoginDate: null,
    currentStreak: 0,
    longestStreak: 0,
    dailyRewardClaimedDate: null,
    pendingBonusShuffleCharges: 0,
    totalQuestsCompleted: 0,
    questsDate: null,
    quests: [],
    weekStartDate: null,
    weeklyQuest: null,
    lifetimeScore: 0,
    completedWeeklyQuestIds: [],
  };
}

export async function loadProgressionState(): Promise<ProgressionState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return makeDefaultProgressionState();
    return { ...makeDefaultProgressionState(), ...JSON.parse(raw) };
  } catch {
    return makeDefaultProgressionState();
  }
}

export async function saveProgressionState(state: ProgressionState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
