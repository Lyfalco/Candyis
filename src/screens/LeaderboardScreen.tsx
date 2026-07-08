import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchLeaderboard } from '../leaderboard/leaderboardService';
import { LeaderboardEntry } from '../leaderboard/types';
import { getRungIndexForScore, RUNGS, rungScoreRange } from '../ranking/tiers';
import { RankBadge } from '../components/RankBadge';
import { useAuth } from '../auth/AuthContext';
import { PALETTE } from '../theme/colors';

interface Props {
  currentUserBestScore: number;
  onBack?: () => void;
}

/** Stable key for seeding mock entries + as a React key when jumping between rungs. */
function rungKey(rungIndex: number): string {
  const rung = RUNGS[rungIndex];
  return rung.division ? `${rung.tier.id}-${rung.division}` : rung.tier.id;
}

export function LeaderboardScreen({ currentUserBestScore, onBack }: Props) {
  const { user } = useAuth();
  const myRungIndex = useMemo(() => getRungIndexForScore(currentUserBestScore), [currentUserBestScore]);
  const [rungIndex, setRungIndex] = useState(myRungIndex);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const rung = RUNGS[rungIndex];
  const isOwnRung = rungIndex === myRungIndex;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const range = rungScoreRange(rung);
    const currentUserEntry =
      isOwnRung && user
        ? { id: user.id, displayName: user.displayName, photoURL: user.photoURL, score: currentUserBestScore }
        : null;
    fetchLeaderboard(range, rungKey(rungIndex), currentUserEntry).then((result) => {
      if (!cancelled) {
        setEntries(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [rungIndex, rung, isOwnRung, user, currentUserBestScore]);

  const canGoLower = rungIndex > 0;
  const canGoHigher = rungIndex < RUNGS.length - 1;

  return (
    <View style={styles.root}>
      <View style={styles.titleRow}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹ Menu</Text>
          </Pressable>
        )}
        <Text style={styles.title}>Scoreboard</Text>
      </View>

      <View style={styles.tierHeader}>
        <Pressable
          disabled={!canGoLower}
          onPress={() => setRungIndex((i) => i - 1)}
          style={[styles.arrowButton, !canGoLower && styles.arrowButtonDisabled]}
        >
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>

        <View style={styles.tierCenter}>
          <RankBadge tier={rung.tier} tierIndex={rung.tierIndex} size={64} />
          <Text style={styles.tierName}>
            {rung.tier.name}
            {rung.division ? ` ${rung.division}` : ''}
          </Text>
          {isOwnRung ? (
            <Text style={styles.tierSubtitle}>Your League</Text>
          ) : (
            <Pressable onPress={() => setRungIndex(myRungIndex)}>
              <Text style={styles.tierJumpBack}>Back to your league</Text>
            </Pressable>
          )}
        </View>

        <Pressable
          disabled={!canGoHigher}
          onPress={() => setRungIndex((i) => i + 1)}
          style={[styles.arrowButton, !canGoHigher && styles.arrowButtonDisabled]}
        >
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshing={loading}
        renderItem={({ item }) => (
          <View style={[styles.row, item.isCurrentUser && styles.rowHighlight]}>
            <Text style={styles.rank}>#{item.rank}</Text>
            {item.photoURL ? (
              <Image source={{ uri: item.photoURL }} style={styles.rowAvatarImage} />
            ) : (
              <View style={styles.rowAvatar}>
                <Text style={styles.rowAvatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.name}>{item.displayName}</Text>
            <Text style={styles.score}>{item.score}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PALETTE.background,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
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
    color: PALETTE.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PALETTE.surface,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 16,
    shadowColor: PALETTE.cardShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
  },
  tierCenter: {
    flex: 1,
    alignItems: 'center',
  },
  tierName: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '800',
    color: PALETTE.textPrimary,
  },
  tierSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.accent,
  },
  tierJumpBack: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.accentSecondary,
  },
  arrowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.surfaceMuted,
  },
  arrowButtonDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    fontSize: 22,
    fontWeight: '800',
    color: PALETTE.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: PALETTE.surface,
    marginBottom: 8,
    shadowColor: PALETTE.cardShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 1,
  },
  rowHighlight: {
    backgroundColor: '#FFF3D6',
    borderWidth: 1,
    borderColor: PALETTE.accent,
  },
  rank: {
    width: 36,
    color: PALETTE.textMuted,
    fontWeight: '700',
  },
  rowAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: PALETTE.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rowAvatarImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  rowAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  name: {
    flex: 1,
    color: PALETTE.textPrimary,
    fontWeight: '600',
  },
  score: {
    color: PALETTE.accent,
    fontWeight: '700',
  },
});
