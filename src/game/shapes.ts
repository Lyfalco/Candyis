import { ShapeCells } from './types';

/**
 * Poliomino shape library (Tetris-style tetrominoes plus a few smaller/larger
 * block-blast staples). Coordinates are [row, col] offsets from a shape's
 * top-left origin cell.
 */
// The two biggest pieces (a 5-tall L and a 3x3 plus) used to be in this
// library, but on a 9x9 board they're so large that a legal spot for them
// often doesn't exist by mid-game — they mostly just sat in the tray unable
// to be placed. Removed rather than shrunk, since a smaller "L"/"plus" would
// just duplicate l4/j4/t4 which already cover that shape family.
export const SHAPES: Record<string, ShapeCells> = {
  single: [[0, 0]],
  domino: [[0, 0], [0, 1]],
  tromino_l: [[0, 0], [1, 0], [1, 1]],
  tromino_i: [[0, 0], [0, 1], [0, 2]],
  square: [[0, 0], [0, 1], [1, 0], [1, 1]],
  i4: [[0, 0], [0, 1], [0, 2], [0, 3]],
  l4: [[0, 0], [1, 0], [2, 0], [2, 1]],
  j4: [[0, 1], [1, 1], [2, 0], [2, 1]],
  s4: [[0, 1], [0, 2], [1, 0], [1, 1]],
  z4: [[0, 0], [0, 1], [1, 1], [1, 2]],
  t4: [[0, 0], [0, 1], [0, 2], [1, 1]],
  i5: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
};

export const SHAPE_KEYS = Object.keys(SHAPES);

export function normalizeShape(shape: ShapeCells): ShapeCells {
  const minRow = Math.min(...shape.map(([r]) => r));
  const minCol = Math.min(...shape.map(([, c]) => c));
  return shape.map(([r, c]) => [r - minRow, c - minCol] as const);
}

export function shapeDimensions(shape: ShapeCells): { rows: number; cols: number } {
  const rows = Math.max(...shape.map(([r]) => r)) + 1;
  const cols = Math.max(...shape.map(([, c]) => c)) + 1;
  return { rows, cols };
}

/**
 * Rotates a shape 90° clockwise about its own origin and re-normalizes it
 * back to (0,0). Every shape in `SHAPES` was only ever defined in one fixed
 * orientation (e.g. the line pieces were always horizontal) — this is what
 * lets the generator hand out a vertical version of the same piece too,
 * like a real Tetris-style randomizer instead of always the same layout.
 */
export function rotateShape90(shape: ShapeCells): ShapeCells {
  return normalizeShape(shape.map(([r, c]) => [c, -r] as const));
}

/** The longest edge any shape can have in either dimension, across all 4 rotations — used to size UI containers that must fit any piece regardless of orientation. */
export const MAX_SHAPE_SPAN = Object.values(SHAPES).reduce((max, shape) => {
  const { rows, cols } = shapeDimensions(shape);
  return Math.max(max, rows, cols);
}, 1);
