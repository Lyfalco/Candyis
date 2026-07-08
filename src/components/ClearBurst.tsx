import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { BOARD_SIZE, CandyColor } from '../game';
import { CANDY_HEX } from '../theme/colors';

interface Props {
  cellKeys: number[];
  cellColors: CandyColor[];
  cellSize: number;
  gap: number;
  duration?: number;
}

/**
 * Per-cell pop: the candy square scales up while fading, with a bright white
 * flash layered on top (peaks instantly, fades fast — the "flash" read of a
 * pop rather than a slow dissolve) and a thin glowing ring expanding outward
 * past the cell's own edges for a shine/sparkle finish. All three layers
 * share one driving `progress` value so this stays cheap even for a big
 * multi-row clear — no per-cell extra animation drivers.
 */
export function ClearBurst({ cellKeys, cellColors, cellSize, gap, duration = 420 }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    // Hold at full brightness for the first third before fading, so the burst
    // has time to actually register instead of dissolving immediately.
    progress.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
  }, [progress, duration]);

  const baseStyle = useAnimatedStyle(() => ({
    opacity: progress.value < 0.35 ? 1 : 1 - (progress.value - 0.35) / 0.65,
    transform: [{ scale: 1 + progress.value * 0.6 }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - progress.value * 3.5),
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 0.9 - progress.value * 1.1),
    transform: [{ scale: 1 + progress.value * 1.3 }],
  }));

  const step = cellSize + gap;

  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {cellKeys.map((k, i) => {
        const row = Math.floor(k / BOARD_SIZE);
        const col = k % BOARD_SIZE;
        const left = gap + col * step;
        const top = gap + row * step;
        return (
          <React.Fragment key={k}>
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  left,
                  top,
                  width: cellSize,
                  height: cellSize,
                  borderRadius: cellSize * 0.28,
                  borderWidth: 2,
                  borderColor: '#FFFFFF',
                },
                ringStyle,
              ]}
            />
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  left,
                  top,
                  width: cellSize,
                  height: cellSize,
                  borderRadius: cellSize * 0.28,
                  backgroundColor: CANDY_HEX[cellColors[i]],
                },
                baseStyle,
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  left,
                  top,
                  width: cellSize,
                  height: cellSize,
                  borderRadius: cellSize * 0.28,
                  backgroundColor: '#FFFFFF',
                },
                flashStyle,
              ]}
            />
          </React.Fragment>
        );
      })}
    </Animated.View>
  );
}
