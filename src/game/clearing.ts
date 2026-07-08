import { Board, BOARD_SIZE, CandyColor, Cell, Position } from './types';

const key = (row: number, col: number): number => row * BOARD_SIZE + col;

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

/** Connected (orthogonal) same-color groups of size >= minSize, as cell-key arrays. */
export function getColorClusters(board: Board, minSize = 3): number[][] {
  const visited = new Set<number>();
  const groups: number[][] = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const color: Cell = board[row][col];
      const startKey = key(row, col);
      if (color === null || visited.has(startKey)) continue;

      const group: number[] = [];
      const stack: Position[] = [{ row, col }];
      visited.add(startKey);

      while (stack.length > 0) {
        const pos = stack.pop() as Position;
        group.push(key(pos.row, pos.col));

        const neighbors: Position[] = [
          { row: pos.row - 1, col: pos.col },
          { row: pos.row + 1, col: pos.col },
          { row: pos.row, col: pos.col - 1 },
          { row: pos.row, col: pos.col + 1 },
        ];
        for (const n of neighbors) {
          if (n.row < 0 || n.row >= BOARD_SIZE || n.col < 0 || n.col >= BOARD_SIZE) continue;
          const nKey = key(n.row, n.col);
          if (visited.has(nKey) || board[n.row][n.col] !== color) continue;
          visited.add(nKey);
          stack.push(n);
        }
      }

      if (group.length >= minSize) groups.push(group);
    }
  }

  return groups;
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

export const BOMB_AREA_RADIUS = 1;

/** Cell keys Bomb Candy detonates around its own placement cell — a plain 3x3 window clamped to the board edges, including `origin` itself. */
export function computeBombArea(origin: Position): number[] {
  const cells: number[] = [];
  for (let r = origin.row - BOMB_AREA_RADIUS; r <= origin.row + BOMB_AREA_RADIUS; r++) {
    if (r < 0 || r >= BOARD_SIZE) continue;
    for (let c = origin.col - BOMB_AREA_RADIUS; c <= origin.col + BOMB_AREA_RADIUS; c++) {
      if (c < 0 || c >= BOARD_SIZE) continue;
      cells.push(key(r, c));
    }
  }
  return cells;
}
