import { CANDY_COLORS, Piece, ShapeCells, TRAY_SIZE } from './types';
import { SHAPE_KEYS, SHAPES, rotateShape90 } from './shapes';
import { RandomFn } from './rng';

let autoId = 0;
const nextId = (): string => `piece-${autoId++}`;

/** 0-3 random quarter turns, mirroring how a real Tetris-style randomizer varies piece orientation instead of always handing out the same fixed layout. */
function randomlyRotated(shape: ShapeCells, random: RandomFn): ShapeCells {
  const turns = Math.floor(random() * 4);
  let result = shape;
  for (let i = 0; i < turns; i++) result = rotateShape90(result);
  return result;
}

export function generatePiece(random: RandomFn): Piece {
  const shapeKey = SHAPE_KEYS[Math.floor(random() * SHAPE_KEYS.length)];
  const shape = randomlyRotated(SHAPES[shapeKey], random);
  const colors = shape.map(() => CANDY_COLORS[Math.floor(random() * CANDY_COLORS.length)]);
  return {
    id: nextId(),
    shape,
    colors,
  };
}

export function generateTray(random: RandomFn, size = TRAY_SIZE): Piece[] {
  return Array.from({ length: size }, () => generatePiece(random));
}

/** Fixed-length tray slots (null = already used, waiting for the next refill). */
export type TraySlots = Array<Piece | null>;

export function generateTraySlots(random: RandomFn, size = TRAY_SIZE): TraySlots {
  return generateTray(random, size);
}

/** A single wildcard "Bomb Candy" piece — only ever created via the dedicated bomb-earn path, never by `generatePiece`'s normal RNG. */
export function makeBombPiece(): Piece {
  return {
    id: nextId(),
    shape: SHAPES.single,
    colors: ['bomb'],
    isBomb: true,
  };
}
