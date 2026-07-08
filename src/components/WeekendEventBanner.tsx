import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

/** Premium banner shown on the menu while the weekend 2x score event is live — a gentle shine sweep, not a full pulse, so it reads as a standing feature rather than a one-off alert. */
export function WeekendEventBanner() {
  const shine = useSharedValue(0);

  useEffect(() => {
    shine.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [shine]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + shine.value * 0.015 }],
    shadowOpacity: 0.35 + shine.value * 0.25,
  }));

  return (
    <Animated.View style={[styles.wrapper, style]}>
      <LinearGradient colors={['#7A2FBF', '#FF6FA0', '#FFB020']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.banner}>
        <Text style={styles.icon}>🎉</Text>
        <Text style={styles.text}>WEEKEND EVENT — 2× SCORE ON EVERY GAME</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 999,
    shadowColor: '#FF6FA0',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 5,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  icon: {
    fontSize: 15,
    marginRight: 7,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
