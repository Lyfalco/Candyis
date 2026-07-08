import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState } from '../hooks/useGameEngine';

const STORAGE_KEY = 'candyis:savedGame:v1';

/** Persists the in-progress run so it can be resumed after the app is closed and reopened. */
export async function saveGameState(state: GameState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Best-effort — losing an in-progress save just means "Continue" won't
    // be offered next launch, never worth crashing the running game over.
  }
}

export async function loadGameState(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export async function clearGameState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op — a failed clear is harmless, the next save just overwrites it
  }
}
