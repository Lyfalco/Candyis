import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { PALETTE } from '../theme/colors';

interface Props {
  label: string;
  sublabel: string;
  premium: boolean;
  duration?: number;
}

const SPARKLE_COUNT = 8;

function Sparkle({ index, progress }: { index: number; progress: SharedValue<number> }) {
  // Evenly spread around the label, each flying out at a slightly different
  // speed/size so the burst reads as scattered sparkle rather than a
  // perfectly uniform (and visibly "mechanical") ring.
  const angle = (index / SPARKLE_COUNT) * Math.PI * 2;
  const distance = 46 + (index % 3) * 10;
  const size = 5 + (index % 3) * 2;

  const style = useAnimatedStyle(() => {
    const burst = Math.min(1, progress.value * 2.2);
    const fade = progress.value < 0.5 ? 1 : 1 - (progress.value - 0.5) / 0.5;
    return {
      opacity: fade,
      transform: [
        { translateX: Math.cos(angle) * distance * burst },
        { translateY: Math.sin(angle) * distance * burst - burst * 10 },
        { scale: burst },
        { rotate: `${burst * 180}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size * 0.25,
          backgroundColor: index % 2 === 0 ? PALETTE.accent : '#FFFFFF',
        },
        style,
      ]}
    />
  );
}

/**
 * Combo/"Nice!" reward popup. Premium clears get the full treatment (glow +
 * sparkle burst); ordinary ones stay snappy/lightweight so the spectacle
 * reads as earned rather than constant.
 */
export function ComboPopup({ label, sublabel, premium, duration = 700 }: Props) {
  const progress = useSharedValue(0);
  const scale = useSharedValue(0.5);
  const rotate = useSharedValue(-6);

  const sparkleIndices = useMemo(() => Array.from({ length: SPARKLE_COUNT }, (_, i) => i), []);

  useEffect(() => {
    progress.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
    // A quick overshoot past 1 before settling reads as a "pop" landing,
    // rather than a flat linear grow — the extra juice this was rewritten for.
    scale.value = withSequence(
      withTiming(premium ? 1.18 : 1.08, { duration: duration * 0.4, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: duration * 0.25, easing: Easing.inOut(Easing.sin) }),
    );
    rotate.value = withSequence(
      withTiming(premium ? 4 : 2, { duration: duration * 0.35, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: duration * 0.4, easing: Easing.inOut(Easing.sin) }),
    );
  }, [progress, scale, rotate, duration, premium]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: progress.value < 0.75 ? 1 : 1 - (progress.value - 0.75) / 0.25,
    transform: [{ translateY: -progress.value * 46 }, { scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: (premium ? 0.55 : 0.3) * Math.min(1, progress.value * 3) * (1 - progress.value * 0.6),
    transform: [{ scale: 0.6 + Math.min(1, progress.value * 2) * 0.7 }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.container, containerStyle]}>
      <Animated.View style={[styles.glow, premium && styles.glowPremium, glowStyle]} />
      {premium && sparkleIndices.map((i) => <Sparkle key={i} index={i} progress={progress} />)}
      <Text style={[styles.label, premium && styles.labelPremium]}>{label}</Text>
      <Text style={styles.sublabel}>{sublabel}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '38%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    top: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: PALETTE.accentSecondary,
  },
  glowPremium: {
    backgroundColor: PALETTE.accent,
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -40,
  },
  label: {
    fontSize: 30,
    fontWeight: '800',
    color: PALETTE.accentSecondary,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  labelPremium: {
    color: PALETTE.accent,
    fontSize: 34,
    textShadowColor: 'rgba(255, 176, 32, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  sublabel: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE.textPrimary,
  },
});
