import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../auth/AuthContext';
import { friendlyAuthError } from '../auth/errors';
import { RankBadge } from '../components/RankBadge';
import { LevelBadge } from '../components/LevelBadge';
import { getRankForScore } from '../ranking/tiers';
import { levelForLifetimeScore, scoreIntoLevel, scoreToNextLevel, SCORE_PER_LEVEL } from '../progression/levels';
import { pickAvatarImage, uploadAvatar } from '../profile/avatarUpload';
import { PALETTE } from '../theme/colors';
import { BOARD_THEMES, isThemeUnlocked, UnlockStats } from '../theme/boardThemes';

/**
 * Off for now: Firebase Storage isn't enabled on the project yet (needs the
 * Spark -> Blaze plan upgrade, a billing change only the user can make, plus
 * Storage security rules — see the rules snippet in the session log). The
 * upload code/plumbing (avatarUpload.ts, AuthContext.updatePhotoURL,
 * leaderboardService.updatePhotoURL) is intact and already fixed for the
 * earlier hang bug; flip this back on once Storage is actually enabled.
 */
const AVATAR_UPLOAD_ENABLED = false;

interface Props {
  bestScore: number;
  /** Cumulative score across every finished game — drives the account Level, independent of bestScore/rank. */
  lifetimeScore: number;
  selectedThemeId: string;
  unlockStats: UnlockStats;
  onSelectTheme: (themeId: string) => void;
  onBack?: () => void;
}

type EmailMode = 'signIn' | 'signUp';

const DELETE_WARNING =
  'All of your data — score, rank, and profile — will be permanently deleted from our servers. This cannot be undone.';

/** React Native's Alert.alert is a no-op on react-native-web, so web needs the browser's own confirm(). */
function confirmDeleteAccount(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`Delete Account?\n\n${DELETE_WARNING}`));
  }
  return new Promise((resolve) => {
    Alert.alert('Delete Account?', DELETE_WARNING, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export function ProfileScreen({ bestScore, lifetimeScore, selectedThemeId, unlockStats, onSelectTheme, onBack }: Props) {
  const {
    user,
    signUpWithEmail,
    signInWithEmail,
    continueAsGuest,
    signOut,
    deleteAccount,
    updateDisplayName,
    updatePhotoURL,
    isLoading,
  } = useAuth();
  const rank = getRankForScore(bestScore);
  const level = levelForLifetimeScore(lifetimeScore);
  const levelProgressPct = Math.round((scoreIntoLevel(lifetimeScore) / SCORE_PER_LEVEL) * 100);

  const [emailMode, setEmailMode] = useState<EmailMode>('signIn');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const handleChangeAvatar = async () => {
    if (!user) return;
    setAvatarError(null);
    try {
      const picked = await pickAvatarImage();
      if ('canceled' in picked) return;
      setUploadingAvatar(true);
      const photoURL = await uploadAvatar(user.id, picked.uri);
      await updatePhotoURL(photoURL);
    } catch (err) {
      setAvatarError(friendlyAuthError(err));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [themeHint, setThemeHint] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    const confirmed = await confirmDeleteAccount();
    if (!confirmed) return;
    try {
      await deleteAccount();
    } catch (err) {
      setDeleteError(friendlyAuthError(err));
    }
  };

  const startEditingName = () => {
    setNameDraft(user?.displayName ?? '');
    setNameError(null);
    setEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameError('Enter a username.');
      return;
    }
    if (trimmed === user?.displayName) {
      setEditingName(false);
      return;
    }
    setNameError(null);
    setSavingName(true);
    try {
      await updateDisplayName(trimmed);
      setEditingName(false);
    } catch (err) {
      setNameError(friendlyAuthError(err));
    } finally {
      setSavingName(false);
    }
  };

  const handleEmailSubmit = async () => {
    setError(null);
    try {
      if (emailMode === 'signUp') {
        if (!displayName.trim()) {
          setError('Enter a username.');
          return;
        }
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.titleRow}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹ Menu</Text>
          </Pressable>
        )}
        <Text style={styles.title}>Profile</Text>
      </View>

      {user ? (
        <View style={styles.card}>
          {AVATAR_UPLOAD_ENABLED ? (
            <Pressable onPress={handleChangeAvatar} disabled={uploadingAvatar} style={styles.avatarWrap}>
              {user.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{user.displayName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.avatarEditIcon}>📷</Text>
                )}
              </View>
            </Pressable>
          ) : (
            <View style={styles.avatarWrap}>
              {user.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{user.displayName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>
          )}
          {AVATAR_UPLOAD_ENABLED && avatarError && <Text style={styles.errorText}>{avatarError}</Text>}
          {editingName ? (
            <View style={styles.nameEditWrap}>
              <TextInput
                style={styles.nameInput}
                value={nameDraft}
                onChangeText={setNameDraft}
                placeholder="Username"
                placeholderTextColor={PALETTE.textMuted}
                autoCapitalize="none"
                autoFocus
                editable={!savingName}
              />
              <View style={styles.nameEditActions}>
                <Pressable style={styles.nameCancelButton} onPress={() => setEditingName(false)} disabled={savingName}>
                  <Text style={styles.nameCancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.nameSaveButton, savingName && styles.buttonDisabled]}
                  onPress={handleSaveName}
                  disabled={savingName}
                >
                  <Text style={styles.nameSaveButtonText}>{savingName ? '…' : 'Save'}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.nameRow} onPress={startEditingName}>
              <Text style={styles.name}>{user.displayName}</Text>
              <Text style={styles.nameEditIcon}>✎</Text>
            </Pressable>
          )}
          {nameError && <Text style={styles.errorText}>{nameError}</Text>}
          <Text style={styles.provider}>
            {user.provider === 'guest' ? 'Playing as a guest' : 'Signed in with email'}
          </Text>

          <View style={styles.rankCard}>
            <RankBadge tier={rank.tier} tierIndex={rank.tierIndex} size={84} />
            <Text style={styles.rankName}>
              {rank.tier.name}
              {rank.division ? ` ${rank.division}` : ''}
            </Text>
            {rank.nextTier ? (
              <>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.round(rank.progress * 100)}%` }]} />
                </View>
                <Text style={styles.rankHint}>
                  {rank.pointsToNextTier} pts to {rank.nextTier.name}
                </Text>
              </>
            ) : (
              <Text style={styles.rankHint}>Top rank reached</Text>
            )}
          </View>

          <View style={styles.levelCard}>
            <LevelBadge level={level} size={72} />
            <Text style={styles.levelName}>Level {level}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, styles.levelProgressFill, { width: `${levelProgressPct}%` }]} />
            </View>
            <Text style={styles.rankHint}>
              {scoreToNextLevel(lifetimeScore)} pts to Level {level + 1}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Best Score</Text>
            <Text style={styles.statValue}>{bestScore}</Text>
          </View>

          <View style={styles.themeSection}>
            <Text style={styles.themeSectionLabel}>BOARD THEME</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeRow}>
              {BOARD_THEMES.map((themeOption) => {
                const unlocked = isThemeUnlocked(themeOption, unlockStats);
                const selected = themeOption.id === selectedThemeId;
                return (
                  <Pressable
                    key={themeOption.id}
                    style={styles.themeItem}
                    onPress={() => {
                      if (unlocked) {
                        setThemeHint(null);
                        onSelectTheme(themeOption.id);
                      } else if (themeOption.requirement.type !== 'default') {
                        setThemeHint(`${themeOption.name}: ${themeOption.requirement.label}`);
                      }
                    }}
                  >
                    <LinearGradient
                      colors={themeOption.swatch}
                      style={[styles.themeSwatch, selected && styles.themeSwatchSelected]}
                    >
                      {!unlocked && <Text style={styles.themeLockIcon}>🔒</Text>}
                      {selected && unlocked && <Text style={styles.themeCheckIcon}>✓</Text>}
                    </LinearGradient>
                    <Text style={styles.themeName} numberOfLines={1}>
                      {themeOption.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {themeHint && <Text style={styles.themeHintText}>{themeHint}</Text>}
          </View>

          <Pressable style={styles.signOutButton} onPress={signOut}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </Pressable>

          {deleteError && <Text style={styles.errorText}>{deleteError}</Text>}

          <Pressable style={styles.deleteButton} onPress={handleDeleteAccount} disabled={isLoading}>
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.prompt}>Sign in to save your score and compete on the leaderboard.</Text>

          {emailMode === 'signUp' && (
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={PALETTE.textMuted}
              autoCapitalize="none"
              value={displayName}
              onChangeText={setDisplayName}
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={PALETTE.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={PALETTE.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable style={[styles.button, styles.emailButton]} onPress={handleEmailSubmit}>
            <Text style={styles.buttonText}>{emailMode === 'signUp' ? 'Create Account' : 'Sign In'}</Text>
          </Pressable>

          <Pressable onPress={() => setEmailMode((m) => (m === 'signUp' ? 'signIn' : 'signUp'))}>
            <Text style={styles.switchModeText}>
              {emailMode === 'signUp' ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Text>
          </Pressable>

          <Pressable style={styles.guestButton} onPress={() => continueAsGuest()}>
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
          </Pressable>

          {isLoading && <Text style={styles.loading}>Signing in…</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PALETTE.background,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 4,
  },
  backButtonText: {
    color: PALETTE.textMuted,
    fontWeight: '700',
    fontSize: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: PALETTE.textPrimary,
  },
  card: {
    width: '100%',
    backgroundColor: PALETTE.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: PALETTE.cardShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 4,
  },
  avatarWrap: {
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PALETTE.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PALETTE.magic,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: PALETTE.surface,
  },
  avatarEditIcon: {
    fontSize: 12,
  },
  name: {
    fontSize: 19,
    fontWeight: '700',
    color: PALETTE.textPrimary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameEditIcon: {
    fontSize: 13,
    color: PALETTE.textMuted,
  },
  nameEditWrap: {
    width: '100%',
    marginBottom: 4,
  },
  nameInput: {
    width: '100%',
    backgroundColor: PALETTE.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: PALETTE.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Buttons sit below the input rather than beside it — an inline row of
  // input+Save+Cancel didn't leave enough room for all three at once and
  // Cancel ended up clipped past the card edge on narrower phones.
  nameEditActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  nameSaveButton: {
    backgroundColor: PALETTE.accent,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  nameSaveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  nameCancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nameCancelButtonText: {
    color: PALETTE.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  provider: {
    fontSize: 13,
    color: PALETTE.textMuted,
    marginBottom: 16,
  },
  rankCard: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: PALETTE.surfaceMuted,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  rankName: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: '800',
    color: PALETTE.textPrimary,
  },
  levelCard: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: PALETTE.surfaceMuted,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  levelName: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: '800',
    color: PALETTE.textPrimary,
  },
  levelProgressFill: {
    backgroundColor: PALETTE.magic,
  },
  progressTrack: {
    marginTop: 10,
    width: '80%',
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E2DCF5',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PALETTE.accent,
    borderRadius: 999,
  },
  rankHint: {
    marginTop: 6,
    fontSize: 12,
    color: PALETTE.textMuted,
    fontWeight: '600',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: PALETTE.surfaceMuted,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statLabel: {
    color: PALETTE.textMuted,
    fontWeight: '600',
  },
  statValue: {
    color: PALETTE.accent,
    fontWeight: '800',
  },
  themeSection: {
    width: '100%',
    marginBottom: 8,
  },
  themeSectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    color: PALETTE.textMuted,
    fontWeight: '700',
    marginBottom: 10,
  },
  themeRow: {
    gap: 14,
    paddingBottom: 4,
  },
  themeItem: {
    alignItems: 'center',
    width: 64,
  },
  themeSwatch: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeSwatchSelected: {
    borderColor: PALETTE.accent,
  },
  themeLockIcon: {
    fontSize: 16,
  },
  themeCheckIcon: {
    fontSize: 18,
    fontWeight: '800',
    color: PALETTE.magic,
  },
  themeName: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE.textMuted,
    textAlign: 'center',
  },
  themeHintText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: PALETTE.accentSecondary,
    textAlign: 'center',
  },
  signOutButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  signOutButtonText: {
    color: PALETTE.accentSecondary,
    fontWeight: '700',
  },
  deleteButton: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  deleteButtonText: {
    color: '#C0392B',
    fontWeight: '600',
    fontSize: 12,
  },
  prompt: {
    fontSize: 14,
    color: PALETTE.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: 12,
  },
  emailButton: {
    backgroundColor: PALETTE.accent,
    marginTop: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  input: {
    width: '100%',
    backgroundColor: PALETTE.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
    color: PALETTE.textPrimary,
    fontSize: 14,
  },
  errorText: {
    color: PALETTE.accentSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  switchModeText: {
    color: PALETTE.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 16,
    textAlign: 'center',
  },
  guestButton: {
    paddingVertical: 10,
  },
  guestButtonText: {
    color: PALETTE.textMuted,
    fontWeight: '600',
  },
  loading: {
    marginTop: 8,
    color: PALETTE.accent,
    fontWeight: '600',
  },
});
