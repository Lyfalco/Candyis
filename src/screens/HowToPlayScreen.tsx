import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PALETTE } from '../theme/colors';

interface Props {
  onBack?: () => void;
}

interface GuideItem {
  icon: string;
  title: string;
  body: string;
}

const GOAL: GuideItem = {
  icon: '🎯',
  title: 'The Goal',
  body: 'Drag candy pieces from your tray onto the 9×9 board. Fit them in cleverly to keep clearing space and racking up score.',
};

const CLEAR_RULES: GuideItem[] = [
  {
    icon: '🧱',
    title: 'Fill a Row or Column',
    body: 'Complete every cell in a row or column and it clears — classic block-puzzle rules.',
  },
  {
    icon: '🍬',
    title: 'Match 3+ Candy Colors',
    body: 'Get 3 or more same-colored candies touching each other (up/down/left/right) and that cluster clears too — both rules can fire from the same placement.',
  },
];

const COMBO: GuideItem = {
  icon: '🔥',
  title: 'Combos & Streaks',
  body: 'Clear something on back-to-back placements to build a streak. Longer streaks mean a bigger score bonus — and unlock the power-ups below.',
};

const POWER_UPS: GuideItem[] = [
  {
    icon: '🔀',
    title: 'Shuffle',
    body: 'Reach a 4-in-a-row streak to bank a Shuffle charge. Spend it to refresh your whole tray when nothing fits.',
  },
  {
    icon: '💣',
    title: 'Bomb Candy',
    body: 'Reach a 6-in-a-row streak and a Bomb Candy appears in your tray. Place it anywhere: it blasts a 3×3 area clear around it, no matter the colors.',
  },
];

const PROGRESSION: GuideItem[] = [
  { icon: '🛡️', title: 'Leagues', body: 'Your best-ever score climbs you through Bronze → Silver → Gold → … → Challenger.' },
  { icon: '⭐', title: 'Levels', body: 'Every point you score in every game adds up toward your account Level — separate from your best score, so every game counts.' },
  { icon: '🎨', title: 'Board Themes', body: 'Unlock new board looks by climbing leagues, keeping a login streak, completing quests — and rare limited-time themes from tough weekly quests.' },
];

const WEEKEND: GuideItem = {
  icon: '🎉',
  title: 'Weekend Event',
  body: 'Every Saturday and Sunday, all score you earn is doubled. Look for the banner on the menu when it\'s live.',
};

function GuideCard({ item }: { item: GuideItem }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Text style={styles.cardIconText}>{item.icon}</Text>
      </View>
      <View style={styles.cardTextGroup}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardBody}>{item.body}</Text>
      </View>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function HowToPlayScreen({ onBack }: Props) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.titleRow}>
        {onBack && (
          <Text onPress={onBack} style={styles.backButtonText}>
            ‹ Menu
          </Text>
        )}
        <Text style={styles.title}>How to Play</Text>
      </View>

      <GuideCard item={GOAL} />

      <SectionLabel>HOW TO CLEAR</SectionLabel>
      {CLEAR_RULES.map((item) => (
        <GuideCard key={item.title} item={item} />
      ))}

      <SectionLabel>COMBOS</SectionLabel>
      <GuideCard item={COMBO} />

      <SectionLabel>POWER-UPS</SectionLabel>
      {POWER_UPS.map((item) => (
        <GuideCard key={item.title} item={item} />
      ))}

      <SectionLabel>PROGRESSION</SectionLabel>
      {PROGRESSION.map((item) => (
        <GuideCard key={item.title} item={item} />
      ))}

      <SectionLabel>LIVE EVENTS</SectionLabel>
      <GuideCard item={WEEKEND} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PALETTE.background,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  content: {
    paddingBottom: 32,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
  },
  backButtonText: {
    color: PALETTE.textMuted,
    fontWeight: '700',
    fontSize: 14,
    paddingVertical: 4,
  },
  title: {
    color: PALETTE.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    color: PALETTE.textMuted,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 10,
  },
  card: {
    flexDirection: 'row',
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
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: PALETTE.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardIconText: {
    fontSize: 20,
  },
  cardTextGroup: {
    flex: 1,
  },
  cardTitle: {
    color: PALETTE.textPrimary,
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 4,
  },
  cardBody: {
    color: PALETTE.textMuted,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
});
