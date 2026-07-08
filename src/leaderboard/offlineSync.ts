import {
  getLocalBestScore,
  getPendingScore,
  getUserBestScore,
  saveLocalBestScore,
  saveUserBestScore,
  setPendingScore,
} from '../storage/scoreStorage';
import { ScoreProfile, fetchBestScore, submitScore } from './leaderboardService';

/**
 * Called on every game over. Always saves locally first (works fully offline,
 * for guests and signed-in players alike), then tries Firestore. If that
 * fails — no network — the score is kept as "pending" so it can be retried
 * the next time connectivity is confirmed (see flushPendingScore).
 */
export async function recordScore(profile: ScoreProfile | null, score: number): Promise<void> {
  await saveLocalBestScore(score);
  if (!profile) return;

  await saveUserBestScore(profile.id, score);
  const synced = await submitScore(profile, score);
  await setPendingScore(profile.id, synced ? null : score);
}

/** Retries a score left over from a previous offline session, if any. No-op if nothing is pending. */
export async function flushPendingScore(profile: ScoreProfile): Promise<void> {
  const pending = await getPendingScore(profile.id);
  if (pending === null) return;

  const synced = await submitScore(profile, pending);
  if (synced) await setPendingScore(profile.id, null);
}

/**
 * Resolves the best score to show on load, merging every source we have: the
 * device-local score (covers guests / pre-sign-in offline play), this
 * account's locally cached score, and whatever Firestore has (if reachable).
 * If the merged result beats the server's copy, pushes it up (or queues it).
 */
export async function resolveInitialBestScore(profile: ScoreProfile | null): Promise<number> {
  const deviceBest = await getLocalBestScore();
  if (!profile) return deviceBest;

  const [userLocalBest, serverBest] = await Promise.all([getUserBestScore(profile.id), fetchBestScore(profile.id)]);
  const best = Math.max(deviceBest, userLocalBest, serverBest);
  await saveUserBestScore(profile.id, best);

  if (best > serverBest) {
    const synced = await submitScore(profile, best);
    await setPendingScore(profile.id, synced ? null : best);
  } else {
    await flushPendingScore(profile);
  }

  return best;
}
