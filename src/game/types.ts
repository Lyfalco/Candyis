/**
 * 'bomb' is a special wildcard cell (Bomb Candy) — deliberately excluded from
 * `CANDY_COLORS` so the normal per-cell RNG (`generatePiece`) can never roll
 * it by chance; it's only ever created by the dedicated bomb-spawn path in
 * `useGameEngine`. Kept as a `CandyColor` member (not a separate `Cell` union
 * case) so it flows through every existing color → hex / cluster-match /
 * render path for free instead of needing a special case in each one.
 */
export type CandyColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'bomb';

export const CANDY_COLORS: CandyColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

export const BOARD_SIZE = 9;

export const TRAY_SIZE = 3;

/** null = empty cell, otherwise the candy color occupying it */
export type Cell = CandyColor | null;

export type Board = Cell[][];

/** Relative [row, col] offsets from the shape's origin cell */
export type ShapeCells = ReadonlyArray<readonly [number, number]>;

export interface Piece {
  id: string;
  shape: ShapeCells;
  /** One color per shape cell (same index order as `shape`). Deliberately not
   * uniform: if a whole piece were one color, every 3+ cell piece would
   * instantly self-match on an empty board, making placement strategy moot. */
  colors: CandyColor[];
  /** Bomb Candy: a single wildcard cell that detonates a small area on placement and, once it settles, counts as every color for future clusters. Never produced by the normal RNG piece generator. */
  isBomb?: boolean;
}

export interface Position {
  row: number;
  col: number;
}

export interface ClearWave {
  /** cells cleared in this wave, as row*BOARD_SIZE+col keys */
  cellKeys: number[];
  rowsCleared: number;
  colsCleared: number;
  colorClustersCleared: number;
}

export interface PlacementResult {
  board: Board;
  waves: ClearWave[];
  cellsCleared: number;
  scoreGained: number;
  comboCount: number;
  isGameOver: boolean;
}
