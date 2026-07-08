import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { LeaderboardEntry } from './types';

export interface ScoreProfile {
  id: string;
  displayName: string;
  photoURL: string | null;
}

/**
 * Persists the player's best score to Firestore (users/{uid}). Security rules
 * enforce this field can only increase and only the signed-in owner may write it.
 * Returns false (instead of throwing) on failure — e.g. offline — so callers can
 * queue the score for a later retry.
 */
export async function submitScore(profile: ScoreProfile, score: number): Promise<boolean> {
  const ref = doc(db, 'users', profile.id);
  try {
    const snap = await getDoc(ref);
    const existingBest = snap.exists() ? ((snap.data().bestScore as number) ?? 0) : 0;
    await setDoc(
      ref,
      {
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        bestScore: Math.max(existingBest, score),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return true;
  } catch (error) {
    console.warn('submitScore failed', error);
    return false;
  }
}

/**
 * Permanently removes the player's leaderboard document. Unlike submitScore,
 * failures here are NOT swallowed — the caller (account deletion) needs to
 * know if this didn't actually happen.
 */
export async function deleteUserData(userId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId));
}

/**
 * Syncs a renamed profile to the leaderboard doc immediately, rather than
 * waiting for the next score submission to incidentally overwrite the stale
 * name. Re-reads and re-writes `bestScore` (unchanged) alongside it, mirroring
 * submitScore's shape, since the security rules validate that field on every
 * write and a brand-new player (no doc yet) would otherwise write one without it.
 */
export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);
  const existingBest = snap.exists() ? ((snap.data().bestScore as number) ?? 0) : 0;
  await setDoc(ref, { displayName, bestScore: existingBest, updatedAt: serverTimestamp() }, { merge: true });
}

/**
 * Syncs a newly-uploaded avatar to the leaderboard doc immediately, mirroring
 * `updateDisplayName` — re-reads and re-writes `bestScore` unchanged so a
 * brand-new player (no doc yet) doesn't write one without it (security rules
 * validate that field on every write).
 */
export async function updatePhotoURL(userId: string, photoURL: string): Promise<void> {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);
  const existingBest = snap.exists() ? ((snap.data().bestScore as number) ?? 0) : 0;
  await setDoc(ref, { photoURL, bestScore: existingBest, updatedAt: serverTimestamp() }, { merge: true });
}

export async function fetchBestScore(userId: string): Promise<number> {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    return snap.exists() ? ((snap.data().bestScore as number) ?? 0) : 0;
  } catch {
    return 0;
  }
}

const MOCK_NAMES = ['Ava', 'Liam', 'Zoe', 'Ethan', 'Mia', 'Noah', 'Chloe', 'Lucas', 'Ivy', 'Owen', 'Maya', 'Finn'];

export interface ScoreRange {
  min: number;
  max: number;
}

/** Synthetic span used only for spreading out mock scores in the open-ended top rung (Challenger) — cosmetic, not a real ceiling; real players there are never excluded by it (see `fetchLeaderboard`). */
const UNBOUNDED_RUNG_MOCK_SPAN = 8000;

/** Fills out an otherwise-empty rung with plausible mock competitors, seeded so results are stable across reloads. */
function buildMockEntries(range: ScoreRange, seedKey: string, count = 12): LeaderboardEntry[] {
  const span = Number.isFinite(range.max) ? Math.max(1, range.max - range.min) : UNBOUNDED_RUNG_MOCK_SPAN;
  return Array.from({ length: count }, (_, i) => {
    const t = 1 - i / count;
    const score = Math.round(range.min + span * t * 0.92 + ((i * 53) % 61));
    return {
      rank: 0,
      userId: `mock-${seedKey}-${i}`,
      displayName: MOCK_NAMES[(i + seedKey.length) % MOCK_NAMES.length],
      photoURL: null,
      score,
    };
  });
}

export interface CurrentUserEntry {
  id: string;
  displayName: string;
  photoURL: string | null;
  score: number;
}

/**
 * Real Firestore users in the given score range, topped up with mock
 * competitors so a brand-new league/division never looks empty. `bestScore`
 * range filter + matching orderBy needs no composite index. `seedKey`
 * (e.g. "platinum-III") just keeps the mock entries stable across reloads —
 * it isn't a query parameter.
 */
export async function fetchLeaderboard(
  range: ScoreRange,
  seedKey: string,
  currentUser?: CurrentUserEntry | null,
): Promise<LeaderboardEntry[]> {
  const { min, max } = range;
  let realEntries: LeaderboardEntry[] = [];

  try {
    // The top rung (Challenger) is genuinely open-ended (`max === Infinity`)
    // — Firestore has no "unbounded" operator, so the upper-bound clause is
    // simply omitted there instead of passing it a magic-number ceiling that
    // would silently hide any real player above it again.
    const q = Number.isFinite(max)
      ? query(
          collection(db, 'users'),
          where('bestScore', '>=', min),
          where('bestScore', '<', max),
          orderBy('bestScore', 'desc'),
          limit(20),
        )
      : query(collection(db, 'users'), where('bestScore', '>=', min), orderBy('bestScore', 'desc'), limit(20));
    const snap = await getDocs(q);
    realEntries = snap.docs
      .filter((d) => !currentUser || d.id !== currentUser.id)
      .map((d) => ({
        rank: 0,
        userId: d.id,
        displayName: (d.data().displayName as string) ?? 'Player',
        photoURL: (d.data().photoURL as string | null) ?? null,
        score: (d.data().bestScore as number) ?? 0,
      }));
  } catch (error) {
    console.warn('fetchLeaderboard query failed, showing mock data only', error);
  }

  const entries = [...buildMockEntries(range, seedKey), ...realEntries];

  if (currentUser && currentUser.score >= min && currentUser.score < max) {
    entries.push({
      rank: 0,
      userId: currentUser.id,
      displayName: currentUser.displayName,
      photoURL: currentUser.photoURL,
      score: currentUser.score,
      isCurrentUser: true,
    });
  }

  return entries.sort((a, b) => b.score - a.score).map((entry, i) => ({ ...entry, rank: i + 1 }));
}
