import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PALETTE } from '../theme/colors';
import { ProgressionState } from '../progression/progressionStorage';
import { DAILY_REWARD_TABLE, dayInCycle, isDailyRewardAvailable, rewardForStreak } from '../progression/progression';
import { QuestInstance } from '../progression/quests';
import { getThemeById } from '../theme/boardThemes';

interface Props {
  progression: ProgressionState;
  onClaimDailyReward: () => void;
  onClaimQuest: (questId: string) => void;
  onClaimWeeklyQuest: () => void;
  onBack?: () => void;
}

function QuestCard({ quest, onClaim, accent }: { quest: QuestInstance; onClaim: () => void; accent?: boolean }) {
  const complete = quest.progress >= quest.target;
  const progressPct = Math.min(1, quest.progress / quest.target) * 100;
  const themeReward = quest.rewardThemeId ? getThemeById(quest.rewardThemeId) : null;

  return (
    <View
      style={[
        styles.questCard,
        accent && styles.questCardAccent,
        themeReward && styles.questCardLegendary,
        quest.claimed && styles.questCardClaimed,
      ]}
    >
      {themeReward && <Text style={styles.legendaryTag}>★ LIMITED-TIME THEME</Text>}
      <View style={styles.questTopRow}>
        <Text style={styles.questDescription}>{quest.description}</Text>
        <View style={[styles.questReward, themeReward && styles.questRewardLegendary]}>
          <Text style={styles.questRewardIcon}>{themeReward ? '🎨' : '🔀'}</Text>
          <Text style={styles.questRewardText}>{themeReward ? themeReward.name : quest.reward}</Text>
        </View>
      </View>
      <View style={styles.questProgressTrack}>
        <View style={[styles.questProgressFill, { width: `${progressPct}%` }]} />
      </View>
      <View style={styles.questBottomRow}>
        <Text style={styles.questProgressText}>
          {Math.min(quest.progress, quest.target)} / {quest.target}
        </Text>
        {quest.claimed ? (
          <Text style={styles.questClaimedText}>Claimed ✓</Text>
        ) : (
          <Pressable
            style={[styles.questClaimButton, !complete && styles.questClaimButtonDisabled]}
            onPress={onClaim}
            disabled={!complete}
          >
            <Text style={styles.questClaimButtonText}>Claim</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function DailyQuestsScreen({ progression, onClaimDailyReward, onClaimQuest, onClaimWeeklyQuest, onBack }: Props) {
  const rewardAvailable = isDailyRewardAvailable(progression);
  const cycleDay = dayInCycle(progression.currentStreak);
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.root}
      // The page wasn't scrollable at all before — on a real device, the
      // bottom-most Claim button (or the banked-shuffle card) could end up
      // sitting behind the home indicator / gesture nav bar with no way to
      // reach it. `insets.bottom` (from react-native-safe-area-context,
      // already used app-wide) is the exact height of that system bar on
      // THIS device, so the extra buffer on top of it is just breathing
      // room, not a guess.
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleRow}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹ Menu</Text>
          </Pressable>
        )}
        <Text style={styles.title}>Daily & Quests</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>DAILY LOGIN STREAK</Text>
        <Text style={styles.streakValue}>{progression.currentStreak} day{progression.currentStreak === 1 ? '' : 's'}</Text>

        <View style={styles.cycleRow}>
          {DAILY_REWARD_TABLE.map((reward, i) => {
            const day = i + 1;
            const passed = day < cycleDay || (day === cycleDay && !rewardAvailable);
            const isToday = day === cycleDay;
            return (
              <View key={day} style={styles.cycleDay}>
                <View
                  style={[
                    styles.cycleDot,
                    passed && styles.cycleDotPassed,
                    isToday && rewardAvailable && styles.cycleDotToday,
                  ]}
                >
                  <Text style={styles.cycleDotIcon}>🔀</Text>
                  <Text style={styles.cycleDotValue}>{reward}</Text>
                </View>
                <Text style={styles.cycleDayLabel}>Day {day}</Text>
              </View>
            );
          })}
        </View>

        <Pressable
          style={[styles.claimDailyButton, !rewardAvailable && styles.claimDailyButtonDisabled]}
          onPress={onClaimDailyReward}
          disabled={!rewardAvailable}
        >
          <Text style={styles.claimDailyButtonText}>
            {rewardAvailable ? `Claim +${rewardForStreak(progression.currentStreak)} Shuffle` : 'Come back tomorrow'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.questsHeading}>TODAY'S QUESTS</Text>
      {progression.quests.map((quest) => (
        <QuestCard key={quest.id} quest={quest} onClaim={() => onClaimQuest(quest.id)} />
      ))}

      {progression.weeklyQuest && (
        <>
          <Text style={styles.questsHeading}>THIS WEEK</Text>
          <QuestCard quest={progression.weeklyQuest} onClaim={onClaimWeeklyQuest} accent />
        </>
      )}

      {progression.pendingBonusShuffleCharges > 0 && (
        <View style={styles.bankedCard}>
          <Text style={styles.bankedIcon}>🔀</Text>
          <Text style={styles.bankedText}>
            +{progression.pendingBonusShuffleCharges} shuffle{progression.pendingBonusShuffleCharges === 1 ? '' : 's'} banked
            — starts with your next game
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PALETTE.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  card: {
    backgroundColor: PALETTE.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 22,
    shadowColor: PALETTE.cardShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    color: PALETTE.textMuted,
    fontWeight: '700',
  },
  streakValue: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '800',
    color: PALETTE.textPrimary,
    marginBottom: 16,
  },
  cycleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 18,
  },
  cycleDay: {
    alignItems: 'center',
  },
  cycleDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: PALETTE.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: PALETTE.boardBorder,
  },
  cycleDotPassed: {
    backgroundColor: PALETTE.magic,
    borderColor: PALETTE.magic,
  },
  cycleDotToday: {
    borderColor: PALETTE.accent,
    borderWidth: 2,
  },
  cycleDotIcon: {
    fontSize: 11,
  },
  cycleDotValue: {
    fontSize: 9,
    fontWeight: '800',
    color: PALETTE.textPrimary,
    marginTop: -2,
  },
  cycleDayLabel: {
    marginTop: 4,
    fontSize: 9,
    color: PALETTE.textMuted,
    fontWeight: '600',
  },
  claimDailyButton: {
    width: '100%',
    backgroundColor: PALETTE.accent,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  claimDailyButtonDisabled: {
    backgroundColor: PALETTE.surfaceMuted,
  },
  claimDailyButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  questsHeading: {
    fontSize: 12,
    letterSpacing: 1,
    color: PALETTE.textMuted,
    fontWeight: '700',
    marginBottom: 10,
  },
  questCard: {
    backgroundColor: PALETTE.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: PALETTE.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  questCardClaimed: {
    opacity: 0.6,
  },
  questCardAccent: {
    borderWidth: 1.5,
    borderColor: PALETTE.magic,
    backgroundColor: '#F7F3FF',
  },
  questCardLegendary: {
    borderWidth: 1.5,
    borderColor: '#D9A62E',
    backgroundColor: '#FFF8E8',
  },
  legendaryTag: {
    color: '#B5791A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  questTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  questDescription: {
    flex: 1,
    color: PALETTE.textPrimary,
    fontWeight: '700',
    fontSize: 14,
    marginRight: 10,
  },
  questReward: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  questRewardLegendary: {
    backgroundColor: '#FFEBBE',
  },
  questRewardIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  questRewardText: {
    color: PALETTE.magic,
    fontWeight: '800',
    fontSize: 12,
  },
  questProgressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: PALETTE.surfaceMuted,
    overflow: 'hidden',
    marginBottom: 8,
  },
  questProgressFill: {
    height: '100%',
    backgroundColor: PALETTE.accent,
    borderRadius: 999,
  },
  questBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questProgressText: {
    color: PALETTE.textMuted,
    fontWeight: '700',
    fontSize: 12,
  },
  questClaimedText: {
    color: PALETTE.accentSecondary,
    fontWeight: '700',
    fontSize: 12,
  },
  questClaimButton: {
    backgroundColor: PALETTE.accent,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  questClaimButtonDisabled: {
    backgroundColor: PALETTE.surfaceMuted,
  },
  questClaimButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  bankedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.surfaceMuted,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  bankedIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  bankedText: {
    flex: 1,
    color: PALETTE.textPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
});
