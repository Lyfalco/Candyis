import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { BOARD_SIZE, ClearResult, Position, TRAY_SIZE, TraySlots, hasAnyValidPlacement } from '../game';
import { MAX_SHAPE_SPAN, shapeDimensions } from '../game/shapes';
import { GameState, useGameEngine } from '../hooks/useGameEngine';
import { clearGameState, saveGameState } from '../storage/gameStateStorage';
import { getRankForScore } from '../ranking/tiers';
import { BoardGrid } from '../components/BoardGrid';
import { ShapePreview } from '../components/ShapePreview';
import { ClearBurst } from '../components/ClearBurst';
import { ComboPopup } from '../components/ComboPopup';
import { ShuffleUnlockedBanner } from '../components/ShuffleUnlockedBanner';
import { ShuffleButton } from '../components/ShuffleButton';
import { RankBadge } from '../components/RankBadge';
import { PALETTE } from '../theme/colors';
import { BOARD_THEMES, BoardTheme } from '../theme/boardThemes';
import { GameResultStats } from '../progression/quests';
import {
  playClearSound,
  playDropSound,
  playInvalidSound,
  playShuffleSound,
  playShuffleUnlockedSound,
} from '../audio/sounds';

const BOARD_MARGIN = 20;
const CELL_GAP = 4;
// Caps the board on tablets/large screens so it stays a comfortable, phone-like
// size instead of ballooning to fill the extra width.
const MAX_BOARD_WIDTH = 480;
// Rough vertical budget for everything that isn't the board — header, league/best
// bar, the gap under the board, and the tray — so the board never grows tall
// enough to squeeze the tray off the bottom of shorter phones.
// Covers both the menu-button row and the score/combo card row (two separate
// rows now, so they never compete for horizontal space with each other).
const HEADER_ZONE_HEIGHT = 130;
const TOPBAR_ZONE_HEIGHT = 56;
const TRAY_ZONE_HEIGHT = 150;
const VERTICAL_SLACK = 40;
// A hard floor used to force the board to at least this size — but on a
// landscape phone (short screen height, no room for a header stacked above
// the board) that floor was routinely bigger than what actually fit,
// pushing the tray off the bottom of the screen. Sized down: a smaller board
// that's fully visible reads as more "premium" than a bigger one that clips.
const MIN_BOARD_SIDE = 140;
// Landscape moves the score/league/best "chrome" into a narrow side column
// instead of stacking it above the board, since a landscape phone has width
// to spare but very little height — reclaiming that stacked header height is
// what actually fixes the board being squeezed at the bottom/right.
const LANDSCAPE_SIDEBAR_WIDTH = 240;
const LANDSCAPE_GAP = 24;
const LANDSCAPE_TRAY_ZONE_HEIGHT = 130;
const LANDSCAPE_VERTICAL_SLACK = 28;
// The board+tray now live inside one shared "dock" card instead of floating
// loose on the raw background — this is what actually fixes the board
// visually crowding/poking past its surroundings at the bottom: it now always
// has a real, padded card edge around it instead of an accidental tight fit.
const PANEL_PADDING = 18;
// Padding on both edges (top+bottom) plus the breathing room + decorative
// divider between the board and the shuffle button/tray beneath it, inside
// the panel (boardWrapper's 16 + panelDivider's own 4 + 14 margin).
const PANEL_CHROME_HEIGHT = PANEL_PADDING * 2 + 34;
// Gap ShapePreview uses between cells when rendering a tray piece — the slot
// box math below must use this exact value or a wide/tall piece (e.g. the
// 5-long bar or the 4-tall L) ends up a few pixels bigger than its box and
// visibly pokes out past the card edge.
const TRAY_SHAPE_GAP = 2;
// Breathing room between the piece and its card's edge, per side.
const TRAY_SLOT_PADDING = 8;
const TRAY_ROW_SPACING_FACTOR = 0.86;
// A safety floor only — just guards against a degenerate 0/negative size on
// pathological inputs. It must NEVER win over the fits-the-screen-width
// computation below: forcing a bigger-than-fits size is exactly what made 3
// tray slots overflow past the screen edge on narrower phones (375px wide).
const MIN_TRAY_CELL_SIZE_SAFETY = 10;

// Pieces now come out of the generator pre-rotated by 0/90/180/270°, so a
// shape that's wide in its base orientation can just as easily show up tall
// (and vice versa). The tray slot box has to be sized as a square using the
// longest edge across ANY shape/orientation — using the old shape-as-defined
// rows/cols would let a rotated piece (e.g. a vertical 5-long bar) overflow
// its box in the dimension that used to be the "short" one.
const MAX_SHAPE_DIMS = { rows: MAX_SHAPE_SPAN, cols: MAX_SHAPE_SPAN };

function traySlotWidthFor(trayCellSize: number): number {
  return MAX_SHAPE_DIMS.cols * trayCellSize + (MAX_SHAPE_DIMS.cols - 1) * TRAY_SHAPE_GAP + TRAY_SLOT_PADDING * 2;
}

function traySlotHeightFor(trayCellSize: number): number {
  return MAX_SHAPE_DIMS.rows * trayCellSize + (MAX_SHAPE_DIMS.rows - 1) * TRAY_SHAPE_GAP + TRAY_SLOT_PADDING * 2;
}

/** Board + tray + ghost sizing, recomputed whenever the window size changes (rotation, split-screen, different device, tablet vs phone). */
function useBoardLayout() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  let outerWidthBudget: number;
  let heightBudget: number;
  if (isLandscape) {
    // The score/league/best "chrome" moves to a side column in landscape
    // (see the JSX below), so the board's own width budget is whatever's
    // left after that column — not the full screen width.
    const availableWidth = width - LANDSCAPE_SIDEBAR_WIDTH - LANDSCAPE_GAP - BOARD_MARGIN * 2;
    outerWidthBudget = Math.min(availableWidth, MAX_BOARD_WIDTH);
    heightBudget = height - (LANDSCAPE_TRAY_ZONE_HEIGHT + PANEL_CHROME_HEIGHT + LANDSCAPE_VERTICAL_SLACK);
  } else {
    outerWidthBudget = Math.min(width - BOARD_MARGIN * 2, MAX_BOARD_WIDTH);
    heightBudget = height - (HEADER_ZONE_HEIGHT + TOPBAR_ZONE_HEIGHT + TRAY_ZONE_HEIGHT + PANEL_CHROME_HEIGHT + VERTICAL_SLACK);
  }

  const widthBudget = outerWidthBudget - PANEL_PADDING * 2;
  const boardSide = Math.max(MIN_BOARD_SIDE, Math.min(widthBudget, heightBudget));

  // Matches BoardGrid's actual outer size (`BOARD_SIZE * step + gap`, i.e. a
  // leading gap plus one per cell) so `boardSide` — also used to cap the
  // header/top-bar width — lines up with the real rendered board width.
  const cellSize = Math.floor((boardSide - CELL_GAP * (BOARD_SIZE + 1)) / BOARD_SIZE);
  const boardStep = cellSize + CELL_GAP;
  const ghostLift = boardStep * 1.3;

  // Tray pieces are sized as large as they can be while still fitting all
  // TRAY_SIZE slots side by side (leaving room for gaps between them), capped
  // so they never dwarf the board on wide screens. Kept close to the board's
  // own cell scale (rather than a much smaller icon) so picking a piece up
  // doesn't jump dramatically in size — that jump used to read as "the piece
  // looks bigger than the board" the moment you start dragging it.
  // The slot box itself (traySlotWidthFor/HeightFor) is solved for the widest
  // and tallest real piece in the shape library, so nothing can ever overflow it.
  // Deliberately measured against `boardSide` (the board's actual final size)
  // rather than `widthBudget` (the width ceiling before the height
  // constraint is applied) — when height is the binding constraint (e.g. a
  // landscape phone, where there's width to spare but little height), those
  // two stop being the same number, and sizing the tray off the wider,
  // pre-constraint budget let it overflow past the now-narrower panel.
  const perSlotWidth = (boardSide / TRAY_SIZE) * TRAY_ROW_SPACING_FACTOR;
  const trayCellSizeFromWidth =
    (perSlotWidth - (MAX_SHAPE_DIMS.cols - 1) * TRAY_SHAPE_GAP - TRAY_SLOT_PADDING * 2) / MAX_SHAPE_DIMS.cols;
  const trayCellSize = Math.floor(
    Math.max(MIN_TRAY_CELL_SIZE_SAFETY, Math.min(trayCellSizeFromWidth, cellSize * 0.82)),
  );

  // The safety floor above can win on a very height-constrained layout
  // (boardSide squeezed small by a short landscape screen), which makes the
  // tray's real footprint wider than boardSide itself — sizing the panel to
  // `boardSide` alone would then let the tray overflow past its own
  // container. The panel always sizes to whichever of the two is bigger.
  const trayFootprint = traySlotWidthFor(trayCellSize) * TRAY_SIZE;
  const panelWidth = Math.max(boardSide, trayFootprint) + PANEL_PADDING * 2;

  return { cellSize, boardStep, trayCellSize, ghostLift, boardSide, panelWidth, isLandscape };
}

// Long enough to actually read the effect before it fades — short durations
// were the #1 complaint (players couldn't see what just happened).
const CLEAR_BURST_DURATION = 900;
const COMBO_POPUP_DURATION = 1400;
const SHUFFLE_BANNER_DURATION = 1600;
const SHUFFLE_URGENT_DURATION = 2200;
const BOMB_BANNER_DURATION = 1600;

interface DragGhost {
  slotIndex: number;
  originRow: number;
  originCol: number;
  cols: number;
  rows: number;
}

interface ActiveBurst {
  id: number;
  clear: ClearResult;
}

interface ActiveCombo {
  id: number;
  label: string;
  sublabel: string;
  premium: boolean;
}

function comboLabel(groupCount: number, streak: number): { label: string; premium: boolean } {
  if (streak >= 5) return { label: 'AMAZING!', premium: true };
  if (streak >= 3 || groupCount >= 3) return { label: 'GREAT COMBO!', premium: true };
  if (groupCount >= 2) return { label: 'COMBO x2!', premium: true };
  return { label: 'NICE!', premium: false };
}

interface GameScreenProps {
  bestScore?: number;
  /** Bonus shuffle charges to start this one game with (from a claimed daily reward/quest) — consumed by the caller, not reapplied on "Play Again" within the same session. */
  startingShuffleCharges?: number;
  /** A previously saved in-progress run to pick up exactly where it left off, instead of dealing a fresh board. Takes priority over `startingShuffleCharges`/the random seed. */
  initialState?: GameState;
  /** The equipped board cosmetic — re-skins the board/panel surface only, never the candy colors. */
  theme?: BoardTheme;
  onGameOver?: (stats: GameResultStats) => void;
  onExit?: () => void;
}

export function GameScreen({
  bestScore = 0,
  startingShuffleCharges = 0,
  initialState,
  theme = BOARD_THEMES[0],
  onGameOver,
  onExit,
}: GameScreenProps) {
  const [seed] = useState(() => Date.now());
  const { state, placePieceAt, resetGame, shuffleTray, resolvePlacement } = useGameEngine(
    seed,
    startingShuffleCharges,
    initialState,
  );

  // Keeps the saved run in sync with every move so closing the app mid-game
  // (or just backing out to the menu) never loses progress — cleared the
  // moment the run actually ends, since a finished game has nothing to
  // resume.
  useEffect(() => {
    if (state.isGameOver) {
      void clearGameState();
      return;
    }
    void saveGameState(state);
  }, [state]);
  const { cellSize, boardStep, trayCellSize, ghostLift, boardSide, panelWidth, isLandscape } = useBoardLayout();

  // Reflects a new personal best mid-run, not just the value carried in from the menu.
  const displayBestScore = Math.max(bestScore, state.score);
  const rank = getRankForScore(displayBestScore);

  // Which tray pieces have nowhere left to go on the current board — flagged
  // with a red pulse so the player can see at a glance which piece(s) are
  // dead weight instead of discovering it only after several failed drags.
  const unplayableSlots = useMemo(
    () => state.tray.map((piece) => (piece ? !hasAnyValidPlacement(state.board, piece) : false)),
    [state.tray, state.board],
  );

  useEffect(() => {
    if (!state.isGameOver) return;
    onGameOver?.({
      score: state.score,
      clears: state.clearSeq,
      bestCombo: state.bestStreak,
      shufflesUsed: state.shuffleSeq,
      piecesPlaced: state.placedCount,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isGameOver]);

  // The ghost overlay lives inside `root`, so its translate must be relative to
  // root's own on-screen position — not raw window coordinates — or it drifts
  // out of sync with the board by exactly root's offset (header height, etc).
  const rootOriginX = useSharedValue(0);
  const rootOriginY = useSharedValue(0);
  const rootRef = useRef<View>(null);

  const boardOriginX = useSharedValue(0);
  const boardOriginY = useSharedValue(0);
  const boardRef = useRef<View>(null);

  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const ghostOpacity = useSharedValue(0);

  const [ghost, setGhost] = useState<DragGhost | null>(null);
  const [previewCells, setPreviewCells] = useState<Set<number> | null>(null);
  const [previewValid, setPreviewValid] = useState(false);
  const [activeBurst, setActiveBurst] = useState<ActiveBurst | null>(null);
  const [activeCombo, setActiveCombo] = useState<ActiveCombo | null>(null);
  const [showShuffleBanner, setShowShuffleBanner] = useState(false);
  const [shuffleUrgent, setShuffleUrgent] = useState(false);
  const [showBombBanner, setShowBombBanner] = useState(false);

  const onRootLayout = useCallback(() => {
    rootRef.current?.measureInWindow((x, y) => {
      rootOriginX.value = x;
      rootOriginY.value = y;
    });
  }, [rootOriginX, rootOriginY]);

  const onBoardLayout = useCallback(() => {
    boardRef.current?.measureInWindow((x, y) => {
      boardOriginX.value = x;
      boardOriginY.value = y;
    });
  }, [boardOriginX, boardOriginY]);

  const updatePreview = useCallback(
    (slotIndex: number, pieceId: string, rows: number, cols: number, row: number, col: number, withinBoard: boolean) => {
      // The floating ghost's shape (`draggedPiece`, derived from `ghost` below)
      // must be set unconditionally — including while still over the tray —
      // or the piece stays invisible from pickup until the finger first
      // crosses onto the board, which is exactly what was reported.
      setGhost({ slotIndex, originRow: row, originCol: col, rows, cols });
      if (!withinBoard) {
        setPreviewCells(null);
        setPreviewValid(false);
        return;
      }
      // A near-miss (a cell or two off a legal spot) still previews — and
      // later drops — at the nearest spot that actually works, rather than
      // strictly the cell under the finger. Exact placements are unaffected
      // (resolvePlacement returns the same cell when it's already legal).
      const snapped = resolvePlacement(pieceId, { row, col });
      const valid = snapped !== null;
      const origin = snapped ?? { row, col };
      // Highlights the piece's actual cells, not its rectangular bounding
      // box — a real bug found while chasing the "mismatched shadow"
      // report: for any non-rectangular shape (the L, T, S, Z, small L
      // tromino…) this used to loop over every (dr, dc) in the full
      // rows×cols box and light up cells the piece doesn't even occupy, so
      // the green/red highlight was a solid rectangle while the actual
      // floating ghost (which already rendered the true shape) was not —
      // exactly the "two different-shaped shadows" mismatch being reported.
      const piece = state.tray.find((p) => p?.id === pieceId);
      const cells = new Set<number>();
      if (piece) {
        piece.shape.forEach(([dr, dc]) => {
          const r = origin.row + dr;
          const c = origin.col + dc;
          if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
            cells.add(r * BOARD_SIZE + c);
          }
        });
      }
      setPreviewCells(cells);
      setPreviewValid(valid);
    },
    [resolvePlacement, state.tray],
  );

  const clearPreview = useCallback(() => {
    setPreviewCells(null);
    setGhost(null);
  }, []);

  const handleDrop = useCallback(
    (slotIndex: number, pieceId: string, row: number, col: number) => {
      const snapped = resolvePlacement(pieceId, { row, col });
      if (snapped) {
        placePieceAt(pieceId, snapped);
        void playDropSound();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        void playInvalidSound();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      clearPreview();
    },
    [resolvePlacement, placePieceAt, clearPreview],
  );

  const prevClearSeqRef = useRef(state.clearSeq);
  useEffect(() => {
    if (state.clearSeq === prevClearSeqRef.current) return;
    prevClearSeqRef.current = state.clearSeq;
    if (!state.lastClear) return;

    const clear = state.lastClear;
    const burstId = state.clearSeq;
    setActiveBurst({ id: burstId, clear });
    setTimeout(() => {
      setActiveBurst((current) => (current?.id === burstId ? null : current));
    }, CLEAR_BURST_DURATION);

    const { label, premium } = comboLabel(clear.groupCount, state.streak);
    setActiveCombo({ id: burstId, label, sublabel: `+${state.lastScoreGained}`, premium });
    setTimeout(() => {
      setActiveCombo((current) => (current?.id === burstId ? null : current));
    }, COMBO_POPUP_DURATION);

    void playClearSound(clear.groupCount, state.streak);
    const strength = premium
      ? Haptics.ImpactFeedbackStyle.Heavy
      : clear.groupCount === 2
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light;
    Haptics.impactAsync(strength);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.clearSeq]);

  const prevShuffleAwardSeqRef = useRef(state.shuffleAwardSeq);
  useEffect(() => {
    if (state.shuffleAwardSeq === prevShuffleAwardSeqRef.current) return;
    prevShuffleAwardSeqRef.current = state.shuffleAwardSeq;

    setShowShuffleBanner(true);
    setTimeout(() => setShowShuffleBanner(false), SHUFFLE_BANNER_DURATION);

    void playShuffleUnlockedSound();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [state.shuffleAwardSeq]);

  const prevBombAwardSeqRef = useRef(state.bombAwardSeq);
  useEffect(() => {
    if (state.bombAwardSeq === prevBombAwardSeqRef.current) return;
    prevBombAwardSeqRef.current = state.bombAwardSeq;

    setShowBombBanner(true);
    setTimeout(() => setShowBombBanner(false), BOMB_BANNER_DURATION);

    void playShuffleUnlockedSound();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [state.bombAwardSeq]);

  // Fires exactly when a placement would have ended the game but was spared
  // because a shuffle charge was banked — the board looks identical either
  // way, so without this the player would just feel stuck with no cue that
  // shuffling is the way out.
  const prevForcedShuffleSeqRef = useRef(state.forcedShuffleSeq);
  useEffect(() => {
    if (state.forcedShuffleSeq === prevForcedShuffleSeqRef.current) return;
    prevForcedShuffleSeqRef.current = state.forcedShuffleSeq;

    setShuffleUrgent(true);
    setTimeout(() => setShuffleUrgent(false), SHUFFLE_URGENT_DURATION);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [state.forcedShuffleSeq]);

  const handleShuffle = useCallback(() => {
    if (state.shuffleCharges <= 0) return;
    shuffleTray();
    void playShuffleSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [state.shuffleCharges, shuffleTray]);

  // Dimming the ghost when it's over an invalid spot (occupied cells, off the
  // board) keeps it from looking like a second, conflicting piece rendered
  // solid on top of what's already there — the fade makes it read as "this
  // won't land here" instead of implying a placement that can't happen.
  // Only applies once there's an actual preview to judge (`previewCells` set,
  // i.e. the piece is over the board) — `previewValid` has no meaning yet
  // while still lifting the piece out of the tray, and defaults to false, so
  // gating on it alone made the ghost render nearly invisible (45% opacity)
  // for that entire stretch, only "appearing" once it reached the board.
  const hasPreview = previewCells !== null;
  const ghostAnimatedStyle = useAnimatedStyle(
    () => ({
      opacity: ghostOpacity.value * (!hasPreview || previewValid ? 1 : 0.45),
      transform: [{ translateX: ghostX.value }, { translateY: ghostY.value }],
    }),
    [hasPreview, previewValid],
  );

  const draggedPiece = ghost ? state.tray[ghost.slotIndex] : null;

  const chrome = (
    <>
      {onExit && (
        <View style={[styles.topRow, isLandscape && styles.topRowLandscape]}>
          <Pressable onPress={onExit} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹ Menu</Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.header, isLandscape && styles.headerLandscape]}>
        <View style={[styles.statsCard, !isLandscape && { maxWidth: boardSide }]}>
          <View style={styles.statCell}>
            <Text style={styles.label}>SCORE</Text>
            <Text style={styles.score}>{state.score}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.label}>COMBO</Text>
            <Text style={styles.streak}>{state.streak > 0 ? `🔥 x${state.streak}` : '–'}</Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.boardTopBar,
          isLandscape && styles.boardTopBarLandscape,
          !isLandscape && { maxWidth: boardSide },
        ]}
      >
        <View style={styles.leagueBadge}>
          <RankBadge tier={rank.tier} tierIndex={rank.tierIndex} size={30} />
          <Text style={styles.leagueText}>
            {rank.tier.name}
            {rank.division ? ` ${rank.division}` : ''}
          </Text>
        </View>
        <View style={styles.bestScoreBadge}>
          <Text style={styles.trophyIcon}>🏆</Text>
          <View>
            <Text style={styles.label}>BEST</Text>
            <Text style={styles.bestScoreValue}>{displayBestScore}</Text>
          </View>
        </View>
      </View>
    </>
  );

  const playArea = (
    <LinearGradient
      colors={theme.panelGradient}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.playPanel, { width: panelWidth, borderColor: theme.panelBorder }]}
    >
      {/*
        Padding lives on this plain nested View, not on the LinearGradient
        itself — on native, a gradient view's own `padding` isn't always
        guaranteed to lay out identically to a plain View's (it's still a
        native-backed component wrapping the gradient draw call around
        whatever layout it's given), and the board sitting flush against the
        bottom/left edge on real devices despite correct-looking padding in
        web preview pointed at exactly this kind of platform inconsistency.
        A plain View's padding is unambiguous, so it's guaranteed to give the
        board and tray real, even breathing room on every side.
      */}
      <View style={styles.playPanelInner}>
        <View
          ref={boardRef}
          onLayout={onBoardLayout}
          collapsable={false}
          testID="board-wrapper"
          style={styles.boardWrapper}
        >
          <BoardGrid
            board={state.board}
            cellSize={cellSize}
            gap={CELL_GAP}
            previewCells={previewCells}
            previewValid={previewValid}
            theme={theme}
          />
          {activeBurst && (
            <ClearBurst
              key={`burst-${activeBurst.id}`}
              cellKeys={activeBurst.clear.cellKeys}
              cellColors={activeBurst.clear.cellColors}
              cellSize={cellSize}
              gap={CELL_GAP}
              duration={CLEAR_BURST_DURATION}
            />
          )}
          {activeCombo && (
            <ComboPopup
              key={`combo-${activeCombo.id}`}
              label={activeCombo.label}
              sublabel={activeCombo.sublabel}
              premium={activeCombo.premium}
              duration={COMBO_POPUP_DURATION}
            />
          )}
          {showShuffleBanner && <ShuffleUnlockedBanner duration={SHUFFLE_BANNER_DURATION} />}
          {showBombBanner && (
            <ShuffleUnlockedBanner
              duration={BOMB_BANNER_DURATION}
              icon="💣"
              title="BOMB CANDY!"
              subtitle="Check your tray — it clears a big area on the board"
            />
          )}
        </View>

        <View style={[styles.panelDivider, { backgroundColor: theme.panelBorder }]} />

        {state.shuffleCharges > 0 && (
          <ShuffleButton charges={state.shuffleCharges} onPress={handleShuffle} urgent={shuffleUrgent} />
        )}

        <View style={styles.tray}>
          {state.tray.map((piece, index) => (
            <TraySlot
              key={index}
              index={index}
              piece={piece}
              unplayable={unplayableSlots[index]}
              cellSize={cellSize}
              trayCellSize={trayCellSize}
              boardStep={boardStep}
              ghostLift={ghostLift}
              rootOriginX={rootOriginX}
              rootOriginY={rootOriginY}
              boardOriginX={boardOriginX}
              boardOriginY={boardOriginY}
              ghostX={ghostX}
              ghostY={ghostY}
              ghostOpacity={ghostOpacity}
              onPreview={updatePreview}
              onClearPreview={clearPreview}
              onDrop={handleDrop}
            />
          ))}
        </View>
      </View>
    </LinearGradient>
  );

  return (
    <View ref={rootRef} onLayout={onRootLayout} style={[styles.root, isLandscape && styles.rootLandscape]}>
      {isLandscape ? (
        <>
          <View style={styles.chromeColumnLandscape}>{chrome}</View>
          <ScrollView
            style={styles.playAreaScrollLandscape}
            contentContainerStyle={styles.playAreaScrollContentLandscape}
            showsVerticalScrollIndicator={false}
          >
            {playArea}
          </ScrollView>
        </>
      ) : (
        <>
          {chrome}
          {playArea}
        </>
      )}

      <Animated.View pointerEvents="none" style={[styles.ghostOverlay, ghostAnimatedStyle]}>
        {draggedPiece && (
          <ShapePreview
            shape={draggedPiece.shape}
            colors={draggedPiece.colors}
            cellSize={cellSize}
            gap={CELL_GAP}
            variant="board"
          />
        )}
      </Animated.View>

      {state.isGameOver && (
        <View style={styles.gameOverOverlay}>
          <Text style={styles.gameOverTitle}>Game Over</Text>
          <Text style={styles.gameOverScore}>Score: {state.score}</Text>
          <Pressable style={styles.retryButton} onPress={() => resetGame(Date.now())}>
            <Text style={styles.retryButtonText}>Play Again</Text>
          </Pressable>
          {onExit && (
            <Pressable style={styles.menuButton} onPress={onExit}>
              <Text style={styles.menuButtonText}>Main Menu</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

interface TraySlotProps {
  index: number;
  piece: TraySlots[number];
  unplayable: boolean;
  /** Board cell size — Bomb Candy renders at this (much larger) size in the tray instead of `trayCellSize`, since a 1-cell piece scaled to the same tiny size as ordinary tray pieces read as an unrecognizable speck (see the size-complaint this was written to fix). */
  cellSize: number;
  trayCellSize: number;
  boardStep: number;
  ghostLift: number;
  rootOriginX: SharedValue<number>;
  rootOriginY: SharedValue<number>;
  boardOriginX: SharedValue<number>;
  boardOriginY: SharedValue<number>;
  ghostX: SharedValue<number>;
  ghostY: SharedValue<number>;
  ghostOpacity: SharedValue<number>;
  onPreview: (
    slotIndex: number,
    pieceId: string,
    rows: number,
    cols: number,
    row: number,
    col: number,
    withinBoard: boolean,
  ) => void;
  onClearPreview: () => void;
  onDrop: (slotIndex: number, pieceId: string, row: number, col: number) => void;
}

function TraySlot({
  index,
  piece,
  unplayable,
  cellSize,
  trayCellSize,
  boardStep,
  ghostLift,
  rootOriginX,
  rootOriginY,
  boardOriginX,
  boardOriginY,
  ghostX,
  ghostY,
  ghostOpacity,
  onPreview,
  onClearPreview,
  onDrop,
}: TraySlotProps) {
  const dims = useMemo(() => (piece ? shapeDimensions(piece.shape) : { rows: 0, cols: 0 }), [piece]);
  const ghostWidth = dims.cols * boardStep - CELL_GAP;
  const ghostHeight = dims.rows * boardStep - CELL_GAP;
  const pieceId = piece?.id ?? '';
  const rows = dims.rows;
  const cols = dims.cols;

  // Board-relative target cell (used for placement + preview highlighting).
  const computeOrigin = useCallback(
    (absoluteX: number, absoluteY: number) => {
      'worklet';
      const relX = absoluteX - boardOriginX.value - ghostWidth / 2;
      const relY = absoluteY - ghostLift - boardOriginY.value - ghostHeight / 2;
      const rawCol = relX / boardStep;
      const rawRow = relY / boardStep;
      // Half a cell of slack past the edges still counts as "over the board".
      const withinBoard =
        rawRow > -0.5 && rawRow < BOARD_SIZE - rows + 0.5 && rawCol > -0.5 && rawCol < BOARD_SIZE - cols + 0.5;
      const row = Math.max(0, Math.min(BOARD_SIZE - rows, Math.round(rawRow)));
      const col = Math.max(0, Math.min(BOARD_SIZE - cols, Math.round(rawCol)));
      return { row, col, withinBoard };
    },
    [boardOriginX, boardOriginY, ghostWidth, ghostHeight, ghostLift, boardStep, rows, cols],
  );

  // Root-relative screen position for the floating ghost graphic — must use the
  // same coordinate space the ghost overlay renders in (root, not window).
  const updateGhostPosition = useCallback(
    (absoluteX: number, absoluteY: number) => {
      'worklet';
      ghostX.value = absoluteX - rootOriginX.value - ghostWidth / 2;
      ghostY.value = absoluteY - ghostLift - rootOriginY.value - ghostHeight / 2;
    },
    [rootOriginX, rootOriginY, ghostWidth, ghostHeight, ghostLift, ghostX, ghostY],
  );

  // Mirrors whatever cell was last shown as the drop target. onEnd reads these
  // instead of recomputing from its own event — the OS can deliver a release
  // coordinate a pixel or two off from the last onUpdate sample, which used to
  // let the drop land one cell away from the ghost the player actually saw
  // (and silently fail if that neighboring cell happened to be occupied).
  const dropRow = useSharedValue(0);
  const dropCol = useSharedValue(0);
  const dropWithinBoard = useSharedValue(false);
  // -1 sentinel so the very first onUpdate always reports (0,0 is a valid cell).
  const lastNotifiedRow = useSharedValue(-1);
  const lastNotifiedCol = useSharedValue(-1);
  const lastNotifiedWithinBoard = useSharedValue(false);

  const trackDropTarget = useCallback(
    (absoluteX: number, absoluteY: number) => {
      'worklet';
      // The ghost always follows the raw finger position continuously —
      // snapping it onto the grid mid-drag either froze it between cell
      // crossings or (worse) desynced it from the actual drop target. The
      // preview highlight below (now shape-accurate, see updatePreview)
      // already shows exactly which cell it'll land in.
      updateGhostPosition(absoluteX, absoluteY);
      const { row, col, withinBoard } = computeOrigin(absoluteX, absoluteY);
      dropRow.value = row;
      dropCol.value = col;
      dropWithinBoard.value = withinBoard;
      // The preview highlight crosses the bridge into a React state update
      // that re-renders the whole 81-cell board — doing that on every pixel
      // of movement was the actual cause of the drag feeling laggy. Only
      // cross the bridge when the target cell has actually changed.
      if (row !== lastNotifiedRow.value || col !== lastNotifiedCol.value || withinBoard !== lastNotifiedWithinBoard.value) {
        lastNotifiedRow.value = row;
        lastNotifiedCol.value = col;
        lastNotifiedWithinBoard.value = withinBoard;
        runOnJS(onPreview)(index, pieceId, rows, cols, row, col, withinBoard);
      }
    },
    [
      updateGhostPosition,
      computeOrigin,
      dropRow,
      dropCol,
      dropWithinBoard,
      lastNotifiedRow,
      lastNotifiedCol,
      lastNotifiedWithinBoard,
      onPreview,
      index,
      pieceId,
      rows,
      cols,
    ],
  );

  // Whether this specific slot's piece is currently picked up. The floating
  // ghost is a separate overlay elsewhere on screen, so without this the tray
  // slot itself never visibly changed while its piece was being dragged —
  // there was no way to tell "am I actually holding this?" just by looking at
  // the tray. 0 = idle, 1 = held.
  const heldProgress = useSharedValue(0);

  // Slow red pulse on a piece that has nowhere left to go on the current
  // board — flags it before the player wastes drags trying to place it.
  const blockedPulse = useSharedValue(0);
  useEffect(() => {
    if (unplayable) {
      blockedPulse.value = withRepeat(withTiming(1, { duration: 650, easing: Easing.inOut(Easing.sin) }), -1, true);
    } else {
      blockedPulse.value = withTiming(0, { duration: 200 });
    }
  }, [unplayable, blockedPulse]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!!piece)
        .minDistance(6)
        .onStart((e) => {
          ghostOpacity.value = 1;
          heldProgress.value = withTiming(1, { duration: 120 });
          // A quick tap of feedback right as the piece is picked up — the
          // dimmed tray card is a visual cue, but a tiny haptic tick is what
          // actually makes "yes, you're holding this" register instantly,
          // before the player even has to look.
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
          // Force the first report of a fresh drag through, even if it
          // happens to land on the same cell a previous drag ended on.
          lastNotifiedRow.value = -1;
          lastNotifiedCol.value = -1;
          trackDropTarget(e.absoluteX, e.absoluteY);
        })
        .onUpdate((e) => {
          trackDropTarget(e.absoluteX, e.absoluteY);
        })
        // `success` is false if the gesture never reached minDistance (i.e. a tap, not a drag) —
        // only attempt a placement for real drags, otherwise the piece snaps back to the tray.
        // Uses dropRow/dropCol/dropWithinBoard (updated on every frame, see `trackDropTarget`)
        // rather than recomputing from `e`, so the placement always matches exactly what the
        // ghost last showed on screen — independent of the throttled lastNotified* values used
        // only to gate the (expensive) board preview re-render.
        .onEnd((_e, success) => {
          ghostOpacity.value = 0;
          if (!success || !dropWithinBoard.value) return;
          runOnJS(onDrop)(index, pieceId, dropRow.value, dropCol.value);
        })
        .onFinalize(() => {
          ghostOpacity.value = 0;
          heldProgress.value = withTiming(0, { duration: 150 });
          runOnJS(onClearPreview)();
        }),
    [
      piece,
      pieceId,
      index,
      trackDropTarget,
      dropRow,
      dropCol,
      dropWithinBoard,
      ghostOpacity,
      heldProgress,
      onDrop,
      onClearPreview,
    ],
  );

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const isHeld = heldProgress.value > 0.5;
    return {
      transform: [{ scale: 1 - heldProgress.value * 0.06 }],
      borderColor: isHeld
        ? PALETTE.magic
        : interpolateColor(blockedPulse.value, [0, 1], [PALETTE.boardBorder, '#E5484D']),
      borderWidth: 1 + blockedPulse.value * 1.5,
      shadowColor: blockedPulse.value > 0.15 ? '#E5484D' : PALETTE.cardShadow,
      shadowOpacity: (1 - heldProgress.value * 0.5) * (1 + blockedPulse.value * 0.6),
    };
  });

  const pieceAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - heldProgress.value * 0.7,
  }));

  // Same red pulse as the card border, but as a soft wash filling the box
  // behind the piece itself — the border alone was easy to miss at a glance
  // since it's thin and at the very edge of the card; a glow around the
  // piece it's actually warning about is much harder to overlook.
  const blockedGlowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: blockedPulse.value * 0.4,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        testID={`tray-slot-${index}`}
        style={[
          styles.traySlot,
          { width: traySlotWidthFor(trayCellSize), height: traySlotHeightFor(trayCellSize) },
          cardAnimatedStyle,
        ]}
      >
        <Animated.View pointerEvents="none" style={[styles.trayBlockedGlow, blockedGlowAnimatedStyle]} />
        {piece && (
          <Animated.View style={[styles.trayPieceCenter, pieceAnimatedStyle]}>
            <ShapePreview
              shape={piece.shape}
              colors={piece.colors}
              cellSize={piece.isBomb ? cellSize : trayCellSize}
              gap={TRAY_SHAPE_GAP}
            />
          </Animated.View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PALETTE.background,
    alignItems: 'center',
    paddingTop: 12,
  },
  // Landscape swaps the single stacked column for a narrow chrome sidebar
  // next to the play area — centered as one group (not pinned to the left
  // edge) so it stays balanced on wide tablets instead of leaving a big
  // empty gap on one side.
  rootLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
    paddingHorizontal: LANDSCAPE_GAP,
  },
  chromeColumnLandscape: {
    width: LANDSCAPE_SIDEBAR_WIDTH,
    marginRight: LANDSCAPE_GAP,
    alignSelf: 'center',
  },
  // A scroll view is the safety net on the shortest landscape phones — the
  // board+tray are sized to fit without it, but if a device is short enough
  // that they still don't quite fit, this lets the player scroll instead of
  // the tray silently getting clipped off the bottom of the screen.
  playAreaScrollLandscape: {
    flexGrow: 0,
  },
  playAreaScrollContentLandscape: {
    alignItems: 'center',
    paddingVertical: LANDSCAPE_GAP,
  },
  // Its own row, separate from the stats card, so the two never compete for
  // horizontal space — that competition was what made the score/combo card
  // look squeezed/misaligned next to the menu button.
  topRow: {
    width: '100%',
    paddingHorizontal: BOARD_MARGIN,
    marginBottom: 10,
  },
  topRowLandscape: {
    paddingHorizontal: 0,
    marginBottom: 14,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.surface,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PALETTE.boardBorder,
    shadowColor: PALETTE.cardShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  backButtonText: {
    color: PALETTE.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  header: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: BOARD_MARGIN,
    marginBottom: 16,
  },
  headerLandscape: {
    paddingHorizontal: 0,
    marginBottom: 14,
  },
  statsCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PALETTE.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.boardBorder,
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: PALETTE.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  statCell: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: '72%',
    backgroundColor: PALETTE.boardBorder,
    marginHorizontal: 14,
  },
  label: {
    color: PALETTE.textMuted,
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '600',
  },
  score: {
    color: PALETTE.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    textShadowColor: 'rgba(58, 46, 82, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  streak: {
    color: PALETTE.accentSecondary,
    fontSize: 26,
    fontWeight: '800',
    textShadowColor: 'rgba(58, 46, 82, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  boardTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  // Side by side, the league + best-score badges were too wide for the
  // narrow landscape sidebar — stacked instead, each at full column width.
  boardTopBarLandscape: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  leagueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.surface,
    paddingLeft: 4,
    paddingRight: 14,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PALETTE.boardBorder,
    shadowColor: PALETTE.cardShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  leagueText: {
    marginLeft: 6,
    color: PALETTE.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  bestScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.surface,
    paddingLeft: 10,
    paddingRight: 14,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PALETTE.boardBorder,
    shadowColor: PALETTE.cardShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  trophyIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  bestScoreValue: {
    color: PALETTE.accent,
    fontSize: 18,
    fontWeight: '800',
  },
  // Board, shuffle button, and tray all live inside one shared card
  // (`playPanel`) now, so the board always has real padded room around it
  // instead of an accidental tight fit against the raw background.
  playPanel: {
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: PALETTE.boardBorder,
    shadowColor: 'rgba(120, 92, 200, 0.28)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 8,
    // Clips the gradient itself to the rounded corners — without this the
    // plain-View padding wrapper below (opaque, square-cornered) would sit
    // on top of the gradient's own corner rounding and visibly square them off.
    overflow: 'hidden',
  },
  // Carries the actual breathing room around the board+tray — see the
  // comment at this View's call site for why it isn't on the gradient itself.
  playPanelInner: {
    width: '100%',
    paddingHorizontal: PANEL_PADDING,
    paddingTop: PANEL_PADDING,
    paddingBottom: PANEL_PADDING,
    alignItems: 'center',
  },
  boardWrapper: {
    marginBottom: 16,
  },
  // A small "handle" between the board and the tray/shuffle area — purely
  // decorative, but it reads as a deliberately designed panel rather than
  // two sections just stacked with a gap.
  panelDivider: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: PALETTE.boardBorder,
    marginBottom: 14,
  },
  tray: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    paddingTop: 10,
  },
  traySlot: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.boardBorder,
    shadowColor: PALETTE.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  trayPieceCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trayBlockedGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 17,
    backgroundColor: '#E5484D',
  },
  ghostOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(58, 46, 82, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameOverTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  gameOverScore: {
    color: PALETTE.accent,
    fontSize: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: PALETTE.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  menuButton: {
    paddingHorizontal: 32,
    paddingVertical: 10,
  },
  menuButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    fontSize: 14,
  },
});
