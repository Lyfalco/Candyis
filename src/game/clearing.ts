import { Board, BOARD_SIZE, CandyColor, Cell, Position } from './types';

const key = (row: number, col: number): number => row * BOARD_SIZE + col;

/** Bomb Candy is a wildcard: it matches any color for cluster purposes (and any color matches it back). */
function colorsMatch(a: Cell, b: Cell): boolean {
  if (a === null || b === null) return false;
  return a === b || a === 'bomb' || b === 'bomb';
}

export function getFullRows(board: Board): number[] {
  const rows: number[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    if (board[row].every((cell) => cell !== null)) rows.push(row);
  }
  return rows;
}

export function getFullCols(board: Board): number[] {
  const cols: number[] = [];
  for (let col = 0; col < BOARD_SIZE; col++) {
    let full = true;
    for (let row = 0; row < BOARD_SIZE; row++) {
      if (board[row][col] === null) {
        full = false;
        break;
      }
    }
    if (full) cols.push(col);
  }
  return cols;
}

/**
 * Connected (orthogonal) color groups of size >= minSize, as cell-key arrays.
 * Uses union-find rather than a single fixed-color flood fill because Bomb
 * Candy cells are wildcards (`colorsMatch` above) — a bomb transitively joins
 * whatever real-colored group(s) it directly touches, including bridging two
 * *different* colored groups into one clearable group if the bomb sits
 * between them. A fixed-color flood fill can't express that: it would either
 * ignore the bomb (missing the match) or, if picked as the flood's own
 * "target color", incorrectly absorb every non-null cell on the board.
 */
export function getColorClusters(board: Board, minSize = 3): number[][] {
  const cellCount = BOARD_SIZE * BOARD_SIZE;
  const parent = Array.from({ length: cellCount }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const cell: Cell = board[row][col];
      if (cell === null) continue;
      if (col + 1 < BOARD_SIZE && colorsMatch(cell, board[row][col + 1])) union(key(row, col), key(row, col + 1));
      if (row + 1 < BOARD_SIZE && colorsMatch(cell, board[row + 1][col])) union(key(row, col), key(row + 1, col));
    }
  }

  const groups = new Map<number, number[]>();
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === null) continue;
      const k = key(row, col);
      const root = find(k);
      const group = groups.get(root);
      if (group) group.push(k);
      else groups.set(root, [k]);
    }
  }

  return Array.from(groups.values()).filter((group) => group.length >= minSize);
}

export interface ClearResult {
  cellKeys: number[];
  /** Color each cell held right before clearing (same order as cellKeys) — used to render the clear/burst effect. */
  cellColors: CandyColor[];
  rowsCleared: number;
  colsCleared: number;
  colorClustersCleared: number;
  groupCount: number;
}

/**
 * Evaluates both clear rules against the current board at once: full rows/cols
 * (Block Blast rule) and same-color clusters of 3+ (Candy Crush rule). Both can
 * fire from a single placement, which is what produces the "combo" moment.
 */
export function evaluateClears(board: Board): ClearResult | null {
  const rows = getFullRows(board);
  const cols = getFullCols(board);
  const clusters = getColorClusters(board, 3);

  const groupCount = rows.length + cols.length + clusters.length;
  if (groupCount === 0) return null;

  const cellKeys = new Set<number>();
  for (const row of rows) {
    for (let col = 0; col < BOARD_SIZE; col++) cellKeys.add(key(row, col));
  }
  for (const col of cols) {
    for (let row = 0; row < BOARD_SIZE; row++) cellKeys.add(key(row, col));
  }
  for (const cluster of clusters) {
    for (const k of cluster) cellKeys.add(k);
  }

  const cellKeyList = Array.from(cellKeys);
  const cellColors = cellKeyList.map((k) => board[Math.floor(k / BOARD_SIZE)][k % BOARD_SIZE] as CandyColor);

  return {
    cellKeys: cellKeyList,
    cellColors,
    rowsCleared: rows.length,
    colsCleared: cols.length,
    colorClustersCleared: clusters.length,
    groupCount,
  };
}

export function clearCells(board: Board, cellKeys: Iterable<number>): Board {
  const next = board.map((row) => [...row]);
  for (const k of cellKeys) {
    const row = Math.floor(k / BOARD_SIZE);
    const col = k % BOARD_SIZE;
    next[row][col] = null;
  }
  return next;
}

export function applyClear(board: Board, clear: ClearResult): Board {
  return clearCells(board, clear.cellKeys);
}

export const BOMB_AREA_WIDTH = 4;
export const BOMB_AREA_HEIGHT = 3;

/**
 * Cell keys Bomb Candy detonates around its own placement cell — a
 * `BOMB_AREA_WIDTH`x`BOMB_AREA_HEIGHT` window clamped to the board edges,
 * deliberately excluding `origin` itself: the bomb's own cell survives the
 * blast and settles as a permanent wildcard tile (see `colorsMatch`) rather
 * than clearing itself.
 */
export function computeBombArea(origin: Position): number[] {
  const cells: number[] = [];
  for (let r = origin.row - 1; r <= origin.row + BOMB_AREA_HEIGHT - 2; r++) {
    if (r < 0 || r >= BOARD_SIZE) continue;
    for (let c = origin.col - 1; c <= origin.col + BOMB_AREA_WIDTH - 2; c++) {
      if (c < 0 || c >= BOARD_SIZE) continue;
      if (r === origin.row && c === origin.col) continue;
      cells.push(key(r, c));
    }
  }
  return cells;
}
