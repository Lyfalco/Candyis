import { Board, BOARD_SIZE, Cell, Piece, Position } from './types';

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array<Cell>(BOARD_SIZE).fill(null));
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

export function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function canPlacePiece(board: Board, piece: Piece, origin: Position): boolean {
  return piece.shape.every(([dr, dc]) => {
    const row = origin.row + dr;
    const col = origin.col + dc;
    return isInBounds(row, col) && board[row][col] === null;
  });
}

export function placePiece(board: Board, piece: Piece, origin: Position): Board {
  const next = cloneBoard(board);
  piece.shape.forEach(([dr, dc], i) => {
    next[origin.row + dr][origin.col + dc] = piece.colors[i];
  });
  return next;
}

/**
 * The nearest legal placement to `target`, checking the exact cell first and
 * then an expanding ring of neighbors up to `maxRadius`. Used so a drop that's
 * a cell or two off from a valid spot still lands instead of bouncing back —
 * a strict "exact cell or nothing" rule reads as unresponsive/fiddly, since a
 * finger covers several cells' worth of screen space on a 9x9 board.
 */
export function findNearestValidOrigin(
  board: Board,
  piece: Piece,
  target: Position,
  maxRadius = 1,
): Position | null {
  if (canPlacePiece(board, piece, target)) return target;

  let best: Position | null = null;
  let bestDist = Infinity;
  for (let radius = 1; radius <= maxRadius; radius++) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== radius) continue;
        const candidate = { row: target.row + dr, col: target.col + dc };
        if (!canPlacePiece(board, piece, candidate)) continue;
        const dist = dr * dr + dc * dc;
        if (dist < bestDist) {
          bestDist = dist;
          best = candidate;
        }
      }
    }
    if (best) return best;
  }
  return best;
}

/** Any cell on the board where this piece could legally land. */
export function findAnyValidPlacement(board: Board, piece: Piece): Position | null {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (canPlacePiece(board, piece, { row, col })) {
        return { row, col };
      }
    }
  }
  return null;
}

export function hasAnyValidPlacement(board: Board, piece: Piece): boolean {
  return findAnyValidPlacement(board, piece) !== null;
}

export function isGameOver(board: Board, tray: Piece[]): boolean {
  return tray.every((piece) => !hasAnyValidPlacement(board, piece));
}
