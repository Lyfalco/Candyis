import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'candyis:selectedThemeId';

export async function loadSelectedThemeId(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY);
}

export async function saveSelectedThemeId(themeId: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, themeId);
}
