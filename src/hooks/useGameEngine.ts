import { useCallback, useReducer } from 'react';
import {
  Board,
  BOARD_SIZE,
  CandyColor,
  ClearResult,
  Position,
  TraySlots,
  applyClear,
  canPlacePiece,
  clearCells,
  computeBombArea,
  createEmptyBoard,
  evaluateClears,
  findNearestValidOrigin,
  generateTraySlots,
  isGameOver as boardIsGameOver,
  makeBombPiece,
  mulberry32,
  placePiece,
  scoreClear,
  scorePlacement,
} from '../game';
import { isWeekendEvent, WEEKEND_SCORE_MULTIPLIER } from '../progression/weekendEvent';

/**
 * Consecutive clearing placements ("combo"/"nice") needed to earn one
 * shuffle charge — an unbroken run, same streak that drives the score bonus.
 * A cumulative (non-consecutive) version of this was tried and made charges
 * pile up too easily; requiring an unbroken run is what keeps shuffle a
 * genuine, occasional reward instead of routine.
 */
export const STREAK_PER_SHUFFLE_CHARGE = 4;

/** Same "unbroken run" rule as shuffle, just a longer/rarer run — Bomb Candy is the bigger reward. */
export const STREAK_PER_BOMB_CHARGE = 6;

export interface GameState {
  board: Board;
  tray: TraySlots;
  score: number;
  streak: number;
  bestStreak: number;
  isGameOver: boolean;
  lastClear: ClearResult | null;
  lastScoreGained: number;
  /** Increments on every clear event so the UI can key a fresh burst-effect instance. */
  clearSeq: number;
  /** How many tray reshuffles the player has banked (earned every STREAK_PER_SHUFFLE_CHARGE-in-a-row). */
  shuffleCharges: number;
  /** Increments only when a shuffle charge is newly earned, so the UI can show a one-off reward banner. */
  shuffleAwardSeq: number;
  /** Increments on every manual shuffle, so the UI can key a fresh tray-refresh animation. */
  shuffleSeq: number;
  /**
   * Increments when a placement would have ended the game but was spared
   * because a shuffle charge was available — the UI uses this to nudge the
   * player toward the shuffle button instead of leaving them stuck with no
   * explanation (the board still looks the same either way).
   */
  forcedShuffleSeq: number;
  /** Increments only when a Bomb Candy is newly earned, so the UI can show a one-off reward banner. */
  bombAwardSeq: number;
  /** Total successful placements this game — feeds the "place N pieces today" quest. */
  placedCount: number;
  seed: number;
}

type Action =
  | { type: 'PLACE'; pieceId: string; origin: Position }
  | { type: 'SHUFFLE' }
  | { type: 'RESET'; seed: number; startingShuffleCharges?: number };

function makeInitialState(seed: number, startingShuffleCharges = 0): GameState {
  const random = mulberry32(seed);
  return {
    board: createEmptyBoard(),
    tray: generateTraySlots(random),
    score: 0,
    streak: 0,
    bestStreak: 0,
    isGameOver: false,
    lastClear: null,
    lastScoreGained: 0,
    clearSeq: 0,
    shuffleCharges: startingShuffleCharges,
    shuffleAwardSeq: 0,
    shuffleSeq: 0,
    forcedShuffleSeq: 0,
    bombAwardSeq: 0,
    placedCount: 0,
    seed,
  };
}

/** Tray slot index to drop a newly-earned bomb into: the slot that just emptied, or (if the tray was fully refilled this same turn) a seeded-random slot from the fresh hand. Never overwrites a slot the player hasn't had a chance to use yet. */
function bombInjectionIndex(tray: TraySlots, justPlacedIndex: number, trayWasRefilled: boolean, seed: number): number {
  if (!trayWasRefilled) return justPlacedIndex;
  return Math.floor(mulberry32(seed)() * tray.length);
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'RESET':
      return makeInitialState(action.seed, action.startingShuffleCharges ?? 0);
    case 'PLACE': {
      if (state.isGameOver) return state;
      const placedSlotIndex = state.tray.findIndex((p) => p?.id === action.pieceId);
      const piece = state.tray[placedSlotIndex];
      if (!piece || !canPlacePiece(state.board, piece, action.origin)) return state;

      const boardAfterPlacement = placePiece(state.board, piece, action.origin);
      const remainingTray = state.tray.map((p) => (p?.id === action.pieceId ? null : p));

      const placementScore = scorePlacement(piece.shape.length);
      // Natural row/col/color clears are evaluated first, on the board as
      // placed; Bomb Candy's guaranteed 3x3 area-blast is layered on top of
      // that result, not in place of it.
      const naturalClear = evaluateClears(boardAfterPlacement);
      let board = naturalClear ? applyClear(boardAfterPlacement, naturalClear) : boardAfterPlacement;

      let bombCellKeys: number[] = [];
      let bombCellColors: CandyColor[] = [];
      if (piece.isBomb) {
        const candidates = computeBombArea(action.origin);
        bombCellKeys = candidates.filter((k) => board[Math.floor(k / BOARD_SIZE)][k % BOARD_SIZE] !== null);
        bombCellColors = bombCellKeys.map((k) => board[Math.floor(k / BOARD_SIZE)][k % BOARD_SIZE] as CandyColor);
        if (bombCellKeys.length > 0) board = clearCells(board, bombCellKeys);
      }

      const didClear = naturalClear !== null || bombCellKeys.length > 0;
      const clear: ClearResult | null = didClear
        ? {
            cellKeys: [...(naturalClear?.cellKeys ?? []), ...bombCellKeys],
            cellColors: [...(naturalClear?.cellColors ?? []), ...bombCellColors],
            rowsCleared: naturalClear?.rowsCleared ?? 0,
            colsCleared: naturalClear?.colsCleared ?? 0,
            colorClustersCleared: naturalClear?.colorClustersCleared ?? 0,
            groupCount: (naturalClear?.groupCount ?? 0) + (bombCellKeys.length > 0 ? 1 : 0),
          }
        : null;

      let streak = state.streak;
      let scoreGained = placementScore;

      if (clear) {
        streak += 1;
        scoreGained += scoreClear(clear.cellKeys.length, clear.groupCount, streak).total;
      } else {
        streak = 0;
      }

      // Weekend event: every point earned this placement (placement + clear
      // bonus alike) is doubled — applied last, after the streak/combo math
      // above, so it scales the whole reward rather than just one piece of it.
      if (isWeekendEvent()) scoreGained *= WEEKEND_SCORE_MULTIPLIER;

      const earnedShuffleCharge = clear !== null && streak % STREAK_PER_SHUFFLE_CHARGE === 0;
      const earnedBombCharge = clear !== null && streak % STREAK_PER_BOMB_CHARGE === 0;

      const trayEmpty = remainingTray.every((p) => p === null);
      const refillSeed = state.seed + state.score + 1;
      let refillTray = trayEmpty ? generateTraySlots(mulberry32(refillSeed)) : remainingTray;

      if (earnedBombCharge) {
        const injectAt = bombInjectionIndex(refillTray, placedSlotIndex, trayEmpty, refillSeed + 1);
        refillTray = refillTray.map((p, i) => (i === injectAt ? makeBombPiece() : p));
      }

      const activePieces = refillTray.filter((p): p is NonNullable<typeof p> => p !== null);
      const wouldBeGameOver = boardIsGameOver(board, activePieces);
      const shuffleChargesAfter = state.shuffleCharges + (earnedShuffleCharge ? 1 : 0);
      // A shuffle charge is a lifeline: don't end the game while one is
      // banked, even if the current tray has no legal placement — the player
      // can still spend it to escape. SHUFFLE re-checks game-over itself, so
      // it still ends the run if reshuffling doesn't help either.
      const gameOver = wouldBeGameOver && shuffleChargesAfter <= 0;
      const forcedShuffle = wouldBeGameOver && shuffleChargesAfter > 0;

      return {
        ...state,
        board,
        tray: refillTray,
        score: state.score + scoreGained,
        streak,
        bestStreak: Math.max(state.bestStreak, streak),
        isGameOver: gameOver,
        lastClear: clear,
        lastScoreGained: scoreGained,
        clearSeq: clear ? state.clearSeq + 1 : state.clearSeq,
        shuffleCharges: shuffleChargesAfter,
        shuffleAwardSeq: earnedShuffleCharge ? state.shuffleAwardSeq + 1 : state.shuffleAwardSeq,
        forcedShuffleSeq: forcedShuffle ? state.forcedShuffleSeq + 1 : state.forcedShuffleSeq,
        bombAwardSeq: earnedBombCharge ? state.bombAwardSeq + 1 : state.bombAwardSeq,
        placedCount: state.placedCount + 1,
      };
    }
    case 'SHUFFLE': {
      if (state.shuffleCharges <= 0 || state.isGameOver) return state;

      // Always a full fresh hand of TRAY_SIZE pieces, even if the player had
      // already placed one or two — a shuffle is meant to bail you out of a
      // stuck tray, so topping up to a partial hand (keeping whatever didn't
      // fit) would defeat the point.
      const random = mulberry32(state.seed + state.score + state.shuffleSeq * 7919 + 104729);
      const tray = generateTraySlots(random);
      const shuffleChargesAfter = state.shuffleCharges - 1;
      const stillStuck = boardIsGameOver(state.board, tray.filter((p): p is NonNullable<typeof p> => p !== null));
      // Same lifeline rule as a placement: a freshly-shuffled tray that's
      // STILL unplayable shouldn't end the run while another charge remains
      // — the player can just shuffle again. Only genuinely out of moves
      // (stuck AND no charges left) ends the game.
      const gameOver = stillStuck && shuffleChargesAfter <= 0;
      const forcedShuffle = stillStuck && shuffleChargesAfter > 0;

      return {
        ...state,
        tray,
        shuffleCharges: shuffleChargesAfter,
        shuffleSeq: state.shuffleSeq + 1,
        isGameOver: gameOver,
        forcedShuffleSeq: forcedShuffle ? state.forcedShuffleSeq + 1 : state.forcedShuffleSeq,
      };
    }
    default:
      return state;
  }
}

export function useGameEngine(seed: number, startingShuffleCharges = 0, initialState?: GameState) {
  const [state, dispatch] = useReducer(
    reducer,
    { seed, startingShuffleCharges, initialState },
    // A resumed game restores the exact reducer state that was last saved
    // (board, tray, score, streak, banked charges, everything) instead of
    // generating a fresh board from the seed — that's what lets "continue"
    // pick up mid-game rather than just replaying the same starting hand.
    (init) => init.initialState ?? makeInitialState(init.seed, init.startingShuffleCharges),
  );

  const placePieceAt = useCallback((pieceId: string, origin: Position) => {
    dispatch({ type: 'PLACE', pieceId, origin });
  }, []);

  const resetGame = useCallback((nextSeed: number, nextStartingShuffleCharges = 0) => {
    dispatch({ type: 'RESET', seed: nextSeed, startingShuffleCharges: nextStartingShuffleCharges });
  }, []);

  const shuffleTray = useCallback(() => {
    dispatch({ type: 'SHUFFLE' });
  }, []);

  const canPlace = useCallback(
    (pieceId: string, origin: Position) => {
      const piece = state.tray.find((p) => p?.id === pieceId);
      return !!piece && canPlacePiece(state.board, piece, origin);
    },
    [state.board, state.tray],
  );

  // Snaps a near-miss drop (a cell or two off) to the closest spot that's
  // actually legal, instead of requiring pixel-perfect placement — see
  // findNearestValidOrigin for why.
  const resolvePlacement = useCallback(
    (pieceId: string, origin: Position): Position | null => {
      const piece = state.tray.find((p) => p?.id === pieceId);
      if (!piece) return null;
      return findNearestValidOrigin(state.board, piece, origin);
    },
    [state.board, state.tray],
  );

  return { state, placePieceAt, resetGame, shuffleTray, canPlace, resolvePlacement };
}
