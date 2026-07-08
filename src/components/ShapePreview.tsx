import React from 'react';
import { Text, View } from 'react-native';
import { CandyColor, ShapeCells } from '../game';
import { shapeDimensions } from '../game/shapes';
import { CANDY_HEX } from '../theme/colors';

interface Props {
  shape: ShapeCells;
  colors: CandyColor[];
  cellSize: number;
  gap?: number;
  /**
   * 'tray' (default) renders a small shadowed icon, good for the resting tray slot.
   * 'board' matches BoardGrid's placed-cell look exactly (same gloss/shade, no drop
   * shadow) — used for the drag ghost so what you see while dragging is pixel-for-pixel
   * what you'll get once placed, instead of looking like a bigger, floatier version of it.
   */
  variant?: 'tray' | 'board';
}

export function ShapePreview({ shape, colors, cellSize, gap = 2, variant = 'tray' }: Props) {
  const { rows, cols } = shapeDimensions(shape);
  const step = cellSize + gap;

  return (
    <View style={{ width: cols * step - gap, height: rows * step - gap }}>
      {shape.map(([r, c], index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: c * step,
            top: r * step,
            width: cellSize,
            height: cellSize,
            borderRadius: cellSize * 0.28,
            backgroundColor: CANDY_HEX[colors[index]],
            overflow: 'hidden',
            ...(variant === 'tray'
              ? {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.12,
                  shadowRadius: 3,
                }
              : null),
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: cellSize * 0.1,
              left: cellSize * 0.14,
              width: cellSize * 0.72,
              height: cellSize * 0.34,
              borderRadius: cellSize * 0.2,
              backgroundColor: 'rgba(255,255,255,0.4)',
            }}
          />
          {variant === 'board' && (
            <>
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: cellSize * 0.22,
                  backgroundColor: 'rgba(0,0,0,0.1)',
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: cellSize * 0.28,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.3)',
                }}
              />
            </>
          )}
          {colors[index] === 'bomb' && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <Text
                style={{
                  fontSize: cellSize * 0.86,
                  lineHeight: cellSize * 0.86,
                  textShadowColor: 'rgba(255, 200, 87, 0.8)',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: cellSize * 0.18,
                }}
              >
                💣
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
