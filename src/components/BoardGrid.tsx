import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Board, BOARD_SIZE } from '../game';
import { CANDY_HEX, PALETTE } from '../theme/colors';
import { BOARD_THEMES, BoardTheme } from '../theme/boardThemes';

interface Props {
  board: Board;
  cellSize: number;
  gap: number;
  previewCells: Set<number> | null;
  previewValid: boolean;
  theme?: BoardTheme;
}

// Re-renders only when its own props actually change — otherwise every
// unrelated GameScreen state update (score, combo banners, shuffle charges)
// would re-render all 81 cells for nothing.
export const BoardGrid = React.memo(function BoardGrid({
  board,
  cellSize,
  gap,
  previewCells,
  previewValid,
  theme = BOARD_THEMES[0],
}: Props) {
  const step = cellSize + gap;
  // Scales with the actual cell size instead of a fixed 20px — a flat radius
  // was clearly bigger than the corner cells' own rounding at smaller
  // responsive sizes, so `overflow: hidden` below was visibly biting a chunk
  // out of the 4 corner cells rather than just softening the frame's edge.
  const containerRadius = gap + cellSize * 0.32;

  return (
    <LinearGradient
      colors={theme.boardGradient}
      style={{
        // Cells are positioned at `gap + c*step` (leading gap so they don't
        // hug the rounded border), so the box needs `gap` of trailing room
        // too — `BOARD_SIZE * step - gap` undershoots by a full `gap` and let
        // the last row/column get clipped by `overflow: hidden` below.
        width: BOARD_SIZE * step + gap,
        height: BOARD_SIZE * step + gap,
        borderRadius: containerRadius,
        padding: gap,
        borderWidth: 1.5,
        borderColor: theme.boardBorder,
        shadowColor: theme.boardShadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 1,
        shadowRadius: 24,
        elevation: 8,
        // Corner cells are square-cornered boxes sitting inside a rounded
        // container — without clipping, their corners poke out past the
        // rounded edge at the board's 4 corners.
        overflow: 'hidden',
      }}
    >
      {board.map((row, r) =>
        row.map((cell, c) => {
          const key = r * BOARD_SIZE + c;
          const isPreview = previewCells?.has(key) ?? false;
          const backgroundColor = cell
            ? CANDY_HEX[cell]
            : isPreview
              ? previewValid
                ? PALETTE.previewValid
                : PALETTE.previewInvalid
              : theme.cellEmpty;

          return (
            <View
              key={key}
              style={{
                position: 'absolute',
                left: gap + c * step,
                top: gap + r * step,
                width: cellSize,
                height: cellSize,
                borderRadius: cellSize * 0.28,
                backgroundColor,
                borderWidth: cell ? 0 : 1,
                borderColor: theme.cellBorder,
                overflow: 'hidden',
              }}
            >
              {cell && (
                <>
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
                  {cell === 'bomb' && (
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
                </>
              )}
            </View>
          );
        }),
      )}
    </LinearGradient>
  );
});
