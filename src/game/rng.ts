/** Small deterministic PRNG so the Daily Challenge can hand every player the same board/piece sequence. */
export type RandomFn = () => number;

export function mulberry32(seed: number): RandomFn {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStringToSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0;
  }
  return hash;
}

/** e.g. "2026-07-04" -> stable per-day seed for the Daily Challenge mode. */
export function dailySeed(date = new Date()): number {
  const iso = date.toISOString().slice(0, 10);
  return hashStringToSeed(iso);
}
