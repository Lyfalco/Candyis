import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_BEST_KEY = 'candyis:deviceBestScore';
const userBestKey = (userId: string) => `candyis:userBestScore:${userId}`;
const pendingKey = (userId: string) => `candyis:pendingScore:${userId}`;

async function readNumber(key: string): Promise<number> {
  const raw = await AsyncStorage.getItem(key);
  const value = raw === null ? NaN : Number(raw);
  return Number.isFinite(value) ? value : 0;
}

/** Stores `score` under `key` only if it beats what's already there; returns the resulting max. */
async function bumpStoredMax(key: string, score: number): Promise<number> {
  const current = await readNumber(key);
  const next = Math.max(current, score);
  if (next !== current) await AsyncStorage.setItem(key, String(next));
  return next;
}

/** Best score for this device, independent of any signed-in account — what a guest sees offline. */
export const getLocalBestScore = (): Promise<number> => readNumber(DEVICE_BEST_KEY);
export const saveLocalBestScore = (score: number): Promise<number> => bumpStoredMax(DEVICE_BEST_KEY, score);

/** Best score cached locally for a specific account, so it survives a relaunch with no network. */
export const getUserBestScore = (userId: string): Promise<number> => readNumber(userBestKey(userId));
export const saveUserBestScore = (userId: string, score: number): Promise<number> =>
  bumpStoredMax(userBestKey(userId), score);

/** A score confirmed locally but not yet written to Firestore (submitScore failed, e.g. offline). */
export async function getPendingScore(userId: string): Promise<number | null> {
  const raw = await AsyncStorage.getItem(pendingKey(userId));
  return raw === null ? null : Number(raw);
}

export async function setPendingScore(userId: string, score: number | null): Promise<void> {
  if (score === null) {
    await AsyncStorage.removeItem(pendingKey(userId));
  } else {
    await AsyncStorage.setItem(pendingKey(userId), String(score));
  }
}
