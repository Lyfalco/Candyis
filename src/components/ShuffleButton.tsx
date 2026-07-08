import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { PALETTE } from '../theme/colors';

interface Props {
  charges: number;
  onPress: () => void;
  /** True right after a placement would have ended the game — nudges the player to spend a charge instead of leaving them stuck with no explanation. */
  urgent?: boolean;
}

/** Pill button for spending a banked shuffle charge. Only meant to be rendered while charges > 0. */
export function ShuffleButton({ charges, onPress, urgent = false }: Props) {
  const pulse = useSharedValue(0);
  const urgentFlash = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [pulse]);

  useEffect(() => {
    if (!urgent) return;
    urgentFlash.value = withSequence(
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 260, easing: Easing.in(Easing.cubic) }),
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 260, easing: Easing.in(Easing.cubic) }),
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 700, easing: Easing.in(Easing.cubic) }),
    );
  }, [urgent, urgentFlash]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.04 + urgentFlash.value * 0.1 }],
    shadowOpacity: 0.35 + pulse.value * 0.25 + urgentFlash.value * 0.4,
    backgroundColor: interpolateColor(urgentFlash.value, [0, 1], [PALETTE.magic, '#FFC24B']),
  }));

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Animated.View style={[styles.button, style]}>
        <Text style={styles.icon}>🔀</Text>
        <Text style={styles.label}>SHUFFLE</Text>
        <Text style={styles.badge}>{charges}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: PALETTE.magic,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 10,
    shadowColor: PALETTE.magic,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  icon: {
    fontSize: 16,
    marginRight: 6,
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  badge: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
