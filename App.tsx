import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Network from 'expo-network';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { MenuScreen } from './src/screens/MenuScreen';
import { GameScreen } from './src/screens/GameScreen';
import { GameState } from './src/hooks/useGameEngine';
import { clearGameState, loadGameState } from './src/storage/gameStateStorage';
import { IntroScreen } from './src/screens/IntroScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { HowToPlayScreen } from './src/screens/HowToPlayScreen';
import { DailyQuestsScreen } from './src/screens/DailyQuestsScreen';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ScoreProfile } from './src/leaderboard/leaderboardService';
import { flushPendingScore, recordScore, resolveInitialBestScore } from './src/leaderboard/offlineSync';
import { PALETTE } from './src/theme/colors';
import { BOARD_THEMES, getThemeById, isThemeUnlocked, UnlockStats } from './src/theme/boardThemes';
import { loadSelectedThemeId, saveSelectedThemeId } from './src/theme/themeStorage';
import { getRankForScore } from './src/ranking/tiers';
import { GameResultStats } from './src/progression/quests';
import {
  claimDailyReward,
  claimQuest,
  claimWeeklyQuest,
  applyGameResult,
  consumePendingBonus,
  isDailyRewardAvailable,
  rollForNewDay,
  rollForNewWeek,
} from './src/progression/progression';
import {
  loadProgressionState,
  makeDefaultProgressionState,
  ProgressionState,
  saveProgressionState,
} from './src/progression/progressionStorage';

// Keep the native splash up until our own JS intro screen has painted its
// first frame — called at module scope (not inside a component/hook), which
// is what the SDK 57 docs recommend, so it's in effect before anything mounts.
void SplashScreen.preventAutoHideAsync();

type Screen = 'menu' | 'game' | 'scoreboard' | 'profile' | 'daily' | 'howToPlay';

function toScoreProfile(user: ReturnType<typeof useAuth>['user']): ScoreProfile | null {
  return user ? { id: user.id, displayName: user.displayName, photoURL: user.photoURL } : null;
}

function Root() {
  const { user, isAuthResolved } = useAuth();
  const netState = Network.useNetworkState();
  const [screen, setScreen] = useState<Screen>('menu');
  const [bestScore, setBestScore] = useState(0);
  const [bestScoreResolved, setBestScoreResolved] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  const [progression, setProgression] = useState<ProgressionState>(makeDefaultProgressionState());
  const [progressionLoaded, setProgressionLoaded] = useState(false);
  const [selectedThemeId, setSelectedThemeIdState] = useState('classic');
  const [gameStartBonusCharges, setGameStartBonusCharges] = useState(0);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [resumeState, setResumeState] = useState<GameState | null>(null);
  // Forces GameScreen to fully remount for each fresh "Play"/"Continue" press
  // (it holds its own long-lived reducer state internally) instead of only
  // reusing the mount from a previous session still parked on 'game'.
  const [gameSessionKey, setGameSessionKey] = useState(0);

  // Re-checks for a resumable run every time the menu is shown — covers both
  // app boot and backing out of an in-progress game (which is exactly when a
  // new saved run appears).
  const refreshSavedGameFlag = useCallback(() => {
    void loadGameState().then((saved) => setHasSavedGame(saved !== null));
  }, []);

  const goToMenu = useCallback(() => {
    setScreen('menu');
    refreshSavedGameFlag();
  }, [refreshSavedGameFlag]);
  const handleIntroDone = useCallback(() => setIntroDone(true), []);

  // Restore the best score on launch / sign-in: merges the device-local score
  // (works fully offline, e.g. for guests), this account's cached score, and
  // Firestore's copy when reachable. Never resets progress to 0 when offline.
  // Gated on `isAuthResolved` so it runs against the real persisted sign-in
  // state instead of racing it — this also doubles as the intro screen's
  // "server data has arrived" signal.
  // A hard timeout guarantees the intro screen can never hang forever if
  // Firestore is slow/unreachable (e.g. a flaky network) — it just moves on
  // with whatever local score it already has.
  useEffect(() => {
    if (!isAuthResolved) return;
    let cancelled = false;
    const giveUp = setTimeout(() => {
      if (!cancelled) setBestScoreResolved(true);
    }, 6000);
    resolveInitialBestScore(toScoreProfile(user))
      .then((best) => {
        if (cancelled) return;
        setBestScore((prev) => Math.max(prev, best));
      })
      .finally(() => {
        if (!cancelled) setBestScoreResolved(true);
        clearTimeout(giveUp);
      });
    return () => {
      cancelled = true;
      clearTimeout(giveUp);
    };
  }, [user, isAuthResolved]);

  // Whenever connectivity is (re)confirmed, retry any score that couldn't
  // reach Firestore earlier. No-op if nothing is pending.
  useEffect(() => {
    const profile = toScoreProfile(user);
    if (!profile || !netState.isConnected || netState.isInternetReachable === false) return;
    void flushPendingScore(profile);
  }, [user, netState.isConnected, netState.isInternetReachable]);

  // Daily login streak + today's quest set + the standing weekly quest + the
  // equipped board theme are all local, device-only state (no account
  // needed) — loaded once on boot, rolled forward to today/this week if the
  // calendar has moved on since last launch, and persisted back if anything
  // changed. Both rollovers are automatic on every future launch too — there
  // is no step here that ever needs a manual refresh or a new app version.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loadedProgression, loadedThemeId] = await Promise.all([loadProgressionState(), loadSelectedThemeId()]);
      if (cancelled) return;
      const rolledDay = rollForNewDay(loadedProgression);
      const rolled = rollForNewWeek(rolledDay);
      if (rolled !== loadedProgression) void saveProgressionState(rolled);
      setProgression(rolled);
      if (loadedThemeId) setSelectedThemeIdState(loadedThemeId);
      setProgressionLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Whether a run left in progress last session can be picked back up —
  // checked once at boot so the menu's "Continue" affordance is correct
  // immediately, without waiting for the player to first visit the menu.
  useEffect(() => {
    refreshSavedGameFlag();
  }, [refreshSavedGameFlag]);

  const rank = getRankForScore(bestScore);
  const unlockStats: UnlockStats = {
    bestScore,
    tierIndex: rank.tierIndex,
    longestStreak: progression.longestStreak,
    totalQuestsCompleted: progression.totalQuestsCompleted,
    completedWeeklyQuestIds: progression.completedWeeklyQuestIds,
  };
  const selectedTheme = getThemeById(selectedThemeId);
  const theme = isThemeUnlocked(selectedTheme, unlockStats) ? selectedTheme : BOARD_THEMES[0];
  const hasDailyBadge =
    isDailyRewardAvailable(progression) ||
    progression.quests.some((q) => q.progress >= q.target && !q.claimed) ||
    (progression.weeklyQuest !== null &&
      progression.weeklyQuest.progress >= progression.weeklyQuest.target &&
      !progression.weeklyQuest.claimed);

  const handleGameOver = useCallback(
    (stats: GameResultStats) => {
      setBestScore((prev) => Math.max(prev, stats.score));
      void recordScore(toScoreProfile(user), stats.score);
      const next = applyGameResult(progression, stats);
      setProgression(next);
      void saveProgressionState(next);
    },
    [user, progression],
  );

  const handlePlay = useCallback(() => {
    const { state: cleared, charges } = consumePendingBonus(progression);
    setGameStartBonusCharges(charges);
    setProgression(cleared);
    void saveProgressionState(cleared);
    // A fresh board always discards whatever run was previously in progress
    // — otherwise the next "Continue" would resurrect a game the player just
    // chose to abandon.
    void clearGameState();
    setResumeState(null);
    setGameSessionKey((k) => k + 1);
    setScreen('game');
  }, [progression]);

  const handleContinue = useCallback(() => {
    void loadGameState().then((saved) => {
      if (!saved) return;
      setResumeState(saved);
      setGameStartBonusCharges(0);
      setGameSessionKey((k) => k + 1);
      setScreen('game');
    });
  }, []);

  const handleClaimDailyReward = useCallback(() => {
    const next = claimDailyReward(progression);
    setProgression(next);
    void saveProgressionState(next);
  }, [progression]);

  const handleClaimQuest = useCallback(
    (questId: string) => {
      const next = claimQuest(progression, questId);
      setProgression(next);
      void saveProgressionState(next);
    },
    [progression],
  );

  const handleClaimWeeklyQuest = useCallback(() => {
    const next = claimWeeklyQuest(progression);
    setProgression(next);
    void saveProgressionState(next);
  }, [progression]);

  const handleSelectTheme = useCallback((themeId: string) => {
    setSelectedThemeIdState(themeId);
    void saveSelectedThemeId(themeId);
  }, []);

  // The SafeAreaView itself (not just its child) switches to the intro's dark
  // background while booting — otherwise the status-bar/home-indicator safe
  // area strips would stay the menu's cream color and show as a seam around
  // the dark intro screen.
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: introDone ? PALETTE.background : PALETTE.splashBackground }]}>
      <StatusBar style={introDone ? 'dark' : 'light'} />
      {!introDone ? (
        <IntroScreen ready={isAuthResolved && bestScoreResolved && progressionLoaded} onDone={handleIntroDone} />
      ) : (
        <>
          {screen === 'menu' && (
            <MenuScreen
              bestScore={bestScore}
              hasDailyBadge={hasDailyBadge}
              hasSavedGame={hasSavedGame}
              onPlay={handlePlay}
              onContinue={handleContinue}
              onScoreboard={() => setScreen('scoreboard')}
              onDaily={() => setScreen('daily')}
              onProfile={() => setScreen('profile')}
              onHowToPlay={() => setScreen('howToPlay')}
            />
          )}
          {screen === 'game' && (
            <ErrorBoundary key={`game-${gameSessionKey}`} onReset={goToMenu}>
              <GameScreen
                bestScore={bestScore}
                startingShuffleCharges={gameStartBonusCharges}
                initialState={resumeState ?? undefined}
                theme={theme}
                onGameOver={handleGameOver}
                onExit={goToMenu}
              />
            </ErrorBoundary>
          )}
          {screen === 'scoreboard' && <LeaderboardScreen currentUserBestScore={bestScore} onBack={goToMenu} />}
          {screen === 'daily' && (
            <DailyQuestsScreen
              progression={progression}
              onClaimDailyReward={handleClaimDailyReward}
              onClaimQuest={handleClaimQuest}
              onClaimWeeklyQuest={handleClaimWeeklyQuest}
              onBack={goToMenu}
            />
          )}
          {screen === 'profile' && (
            <ProfileScreen
              bestScore={bestScore}
              lifetimeScore={progression.lifetimeScore}
              selectedThemeId={theme.id}
              unlockStats={unlockStats}
              onSelectTheme={handleSelectTheme}
              onBack={goToMenu}
            />
          )}
          {screen === 'howToPlay' && <HowToPlayScreen onBack={goToMenu} />}
        </>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
