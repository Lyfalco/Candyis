import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { PALETTE } from '../theme/colors';

interface Props {
  duration?: number;
  icon?: string;
  title?: string;
  subtitle?: string;
}

/**
 * One-off reward banner for earning a shuffle charge (or, via the icon/title/
 * subtitle props, any other rare power-up like Bomb Candy) — visually and
 * sonically distinct from ComboPopup so it reads as "you unlocked
 * something", not just a bigger combo. Spins in with a glowing ring, holds,
 * then fades.
 */
export function ShuffleUnlockedBanner({
  duration = 1500,
  icon = '🔀',
  title = 'SHUFFLE UNLOCKED!',
  subtitle = 'Tap the shuffle button to refresh your tray',
}: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
  }, [progress, duration]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value < 0.7 ? Math.min(1, progress.value * 4) : 1 - (progress.value - 0.7) / 0.3,
    transform: [
      { scale: 0.4 + Math.min(1, progress.value * 2.4) * 0.6 },
      { rotate: `${(1 - Math.min(1, progress.value * 2.4)) * -12}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + 0.5 * Math.sin(progress.value * Math.PI * 4),
    transform: [{ scale: 1 + Math.sin(progress.value * Math.PI * 4) * 0.08 }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.container, style]}>
      <Animated.View style={[styles.glow, glowStyle]} />
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(58, 46, 82, 0.92)',
  },
  glow: {
    position: 'absolute',
    width: '120%',
    height: '160%',
    borderRadius: 30,
    backgroundColor: PALETTE.magicGlow,
    opacity: 0.35,
  },
  icon: {
    fontSize: 30,
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: PALETTE.magic,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
});
