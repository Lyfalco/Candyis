import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { PALETTE } from '../theme/colors';
import { useAuth } from '../auth/AuthContext';
import { RankBadge } from '../components/RankBadge';
import { WeekendEventBanner } from '../components/WeekendEventBanner';
import { getRankForScore } from '../ranking/tiers';
import { isWeekendEvent } from '../progression/weekendEvent';

interface Props {
  bestScore: number;
  hasDailyBadge: boolean;
  /** Whether a previously exited/unfinished run can be picked back up. */
  hasSavedGame: boolean;
  onPlay: () => void;
  onContinue: () => void;
  onScoreboard: () => void;
  onDaily: () => void;
  onProfile: () => void;
  onHowToPlay: () => void;
}

/**
 * Soft, off-palette color blobs behind the content — echoes the app icon's
 * own radial glow instead of a flat background.
 *
 * Deliberately sized in real pixels (via useWindowDimensions) rather than
 * percentage cx/cy/r on the Circles: percentage-based geometry combined with
 * width="100%"/height="100%" props left the SVG's internal coordinate system
 * out of sync with its actual laid-out box on some devices, which is what
 * made the glow look clipped along one edge instead of blending off-screen.
 * Explicit pixel values + a matching viewBox removes that ambiguity entirely.
 */
function BackdropGlow() {
  const { width, height } = useWindowDimensions();
  const topR = Math.max(width, height) * 0.42;
  const bottomR = Math.max(width, height) * 0.38;

  return (
    <Svg style={StyleSheet.absoluteFill} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <RadialGradient id="glowTop" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={PALETTE.magicGlow} stopOpacity={0.35} />
          <Stop offset="1" stopColor={PALETTE.magicGlow} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="glowBottom" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={PALETTE.accent} stopOpacity={0.25} />
          <Stop offset="1" stopColor={PALETTE.accent} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={width * 0.88} cy={height * 0.06} r={topR} fill="url(#glowTop)" />
      <Circle cx={width * 0.06} cy={height * 0.96} r={bottomR} fill="url(#glowBottom)" />
    </Svg>
  );
}

function PressableCard({
  onPress,
  icon,
  label,
  tint,
  badge,
}: {
  onPress: () => void;
  icon: string;
  label: string;
  tint: string;
  badge?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={[styles.cardIcon, { backgroundColor: tint }]}>
        <Text style={styles.cardIconText}>{icon}</Text>
        {badge && <View style={styles.cardBadgeDot} />}
      </View>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardChevron}>›</Text>
    </Pressable>
  );
}

export function MenuScreen({
  bestScore,
  hasDailyBadge,
  hasSavedGame,
  onPlay,
  onContinue,
  onScoreboard,
  onDaily,
  onProfile,
  onHowToPlay,
}: Props) {
  const { user } = useAuth();
  const rank = getRankForScore(bestScore);

  return (
    <LinearGradient colors={[PALETTE.backgroundGradientTop, PALETTE.backgroundGradientBottom]} style={styles.root}>
      <BackdropGlow />

      <View style={styles.hero}>
        <View style={styles.iconFrame}>
          <Image source={require('../../assets/icon.png')} style={styles.iconImage} />
        </View>
        <Text style={styles.title}>Candyis</Text>
        <Text style={styles.subtitle}>Place blocks. Match candy. Chase the leaderboard.</Text>
      </View>

      {isWeekendEvent() && <WeekendEventBanner />}

      <View style={styles.rankCard}>
        <View style={styles.rankCardLeft}>
          <RankBadge tier={rank.tier} tierIndex={rank.tierIndex} size={50} />
          <View style={styles.rankTextGroup}>
            <Text style={styles.rankLabel}>YOUR LEAGUE</Text>
            <Text style={styles.rankName}>
              {rank.tier.name}
              {rank.division ? ` ${rank.division}` : ''}
            </Text>
          </View>
        </View>
        <View style={styles.rankDivider} />
        <View style={styles.rankCardRight}>
          <Text style={styles.rankLabel}>🏆 BEST</Text>
          <Text style={styles.bestScoreValue}>{bestScore}</Text>
        </View>
      </View>

      <View style={styles.menu}>
        <Pressable
          onPress={hasSavedGame ? onContinue : onPlay}
          style={({ pressed }) => [styles.playPressable, pressed && styles.playPressed]}
        >
          <LinearGradient
            colors={[PALETTE.accent, PALETTE.accentSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.playButton}
          >
            <Text style={styles.playIcon}>▶</Text>
            <Text style={styles.playButtonText}>{hasSavedGame ? 'CONTINUE' : 'PLAY'}</Text>
          </LinearGradient>
        </Pressable>

        {hasSavedGame && (
          <Pressable
            onPress={onPlay}
            style={({ pressed }) => [styles.newGamePressable, pressed && styles.playPressed]}
          >
            <LinearGradient
              colors={[PALETTE.accent, PALETTE.accentSecondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.playButton}
            >
              <Text style={styles.playIcon}>↻</Text>
              <Text style={styles.playButtonText}>START NEW GAME</Text>
            </LinearGradient>
          </Pressable>
        )}

        <PressableCard onPress={onScoreboard} icon="🏆" label="Scoreboard" tint="#FFE3A3" />
        <PressableCard onPress={onDaily} icon="🎁" label="Daily & Quests" tint="#C7F2E3" badge={hasDailyBadge} />
        <PressableCard
          onPress={onProfile}
          icon="👤"
          label={user ? `Profile · ${user.displayName}` : 'Profile'}
          tint="#D9CCFF"
        />
        <PressableCard onPress={onHowToPlay} icon="📖" label="How to Play" tint="#FFD9E8" />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconFrame: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: PALETTE.surface,
    padding: 6,
    marginBottom: 16,
    shadowColor: 'rgba(108, 79, 224, 0.35)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 8,
  },
  iconImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: PALETTE.textPrimary,
    textShadowColor: 'rgba(120,92,200,0.25)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: PALETTE.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  rankCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.surface,
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 28,
    shadowColor: PALETTE.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  rankCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankTextGroup: {
    marginLeft: 12,
  },
  rankDivider: {
    width: 1,
    height: '80%',
    backgroundColor: PALETTE.boardBorder,
    marginHorizontal: 14,
  },
  rankCardRight: {
    alignItems: 'flex-end',
  },
  rankLabel: {
    fontSize: 11,
    letterSpacing: 1,
    color: PALETTE.textMuted,
    fontWeight: '700',
  },
  rankName: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '800',
    color: PALETTE.textPrimary,
  },
  bestScoreValue: {
    marginTop: 2,
    fontSize: 22,
    fontWeight: '800',
    color: PALETTE.accent,
  },
  menu: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
  },
  playPressable: {
    width: '100%',
  },
  playPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  playButton: {
    width: '100%',
    flexDirection: 'row',
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: 'rgba(255, 111, 160, 0.5)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 6,
  },
  playIcon: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  newGamePressable: {
    width: '100%',
  },
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.surface,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: PALETTE.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBadgeDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PALETTE.accentSecondary,
    borderWidth: 2,
    borderColor: PALETTE.surface,
  },
  cardIconText: {
    fontSize: 17,
  },
  cardLabel: {
    flex: 1,
    color: PALETTE.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  cardChevron: {
    color: PALETTE.textMuted,
    fontSize: 20,
    fontWeight: '700',
    marginRight: 6,
  },
});
