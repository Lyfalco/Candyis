/**
 * Generates small placeholder WAV sound effects (additive/bell synthesis, no
 * external assets/licensing needed) so the game has premium-feeling audio
 * feedback out of the box. Replace assets/sounds/*.wav with real, licensed
 * SFX before shipping.
 *
 * Usage: node scripts/generate-placeholder-sounds.js
 */
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const OUT_DIR = path.join(__dirname, '..', 'assets', 'sounds');

function writeWav(filename, samples) {
  const numSamples = samples.length;
  const byteRate = SAMPLE_RATE * 2;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    buffer.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, filename), buffer);
  console.log('wrote', filename);
}

/** Additive bell/chime timbre: a few harmonics decaying at different rates. */
function bell(freq, duration, { amplitude = 0.5, attack = 0.004 } = {}) {
  const n = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(n);
  const partials = [
    { mult: 1, amp: 1, decay: 3.2 },
    { mult: 2.01, amp: 0.42, decay: 4.6 },
    { mult: 3.02, amp: 0.22, decay: 6.4 },
    { mult: 4.05, amp: 0.12, decay: 8.5 },
  ];
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let s = 0;
    for (const p of partials) {
      s += Math.sin(2 * Math.PI * freq * p.mult * t) * p.amp * Math.exp(-p.decay * t);
    }
    const env = Math.min(1, i / (SAMPLE_RATE * attack));
    out[i] = s * amplitude * env;
  }
  return out;
}

/** Soft low thud for placing a piece — not a bell, just a damped low sine + a tiny tick. */
function thud(freq, duration, { amplitude = 0.5 } = {}) {
  const n = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const body = Math.sin(2 * Math.PI * freq * t) * Math.exp(-18 * t);
    const tick = Math.sin(2 * Math.PI * freq * 5.5 * t) * Math.exp(-40 * t) * 0.3;
    out[i] = (body + tick) * amplitude;
  }
  return out;
}

/** Soft muted buzz for an invalid placement — two close low tones beating against each other. */
function softBuzz(freq, duration, { amplitude = 0.4 } = {}) {
  const n = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const s = Math.sin(2 * Math.PI * freq * t) + Math.sin(2 * Math.PI * (freq * 1.06) * t);
    out[i] = s * 0.5 * amplitude * Math.exp(-9 * t);
  }
  return out;
}

/** Tiny filtered-noise transient — the crisp "tick" of a modern UI pop, not a musical tone. */
function pop(duration, { amplitude = 0.4 } = {}) {
  const n = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(n);
  let seed = 424242;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed / 0x7fffffff) * 2 - 1;
  };
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    // one-pole low-pass over white noise so it reads as a soft "pop", not harsh static
    const raw = rand();
    prev = prev * 0.6 + raw * 0.4;
    out[i] = prev * Math.exp(-t * 700) * amplitude;
  }
  return out;
}

/** Short percussive tick with a bit of pitch drop, used to build a card-riffle texture. */
function tick(freq, duration, { amplitude = 0.4 } = {}) {
  const n = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const pitch = freq * (1 - t * 2.5);
    out[i] = Math.sin(2 * Math.PI * pitch * t) * Math.exp(-60 * t) * amplitude;
  }
  return out;
}

function mix(arrays) {
  const length = Math.max(...arrays.map((a) => a.length));
  const out = new Float32Array(length);
  for (const arr of arrays) {
    for (let i = 0; i < arr.length; i++) out[i] += arr[i];
  }
  const norm = 1 / Math.sqrt(arrays.length);
  for (let i = 0; i < out.length; i++) out[i] *= norm;
  return out;
}

function concat(...chunks) {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function silence(duration) {
  return new Float32Array(Math.floor(SAMPLE_RATE * duration));
}

// Soft short thud for placing a piece.
writeWav('drop.wav', thud(320, 0.09, { amplitude: 0.55 }));

// Modern "match" cue for a basic line/color clear: a crisp noise pop for
// tactile snap, under a bright two-note shimmer (C6 + G6 a hair apart) rather
// than a slow deliberate arpeggio — reads as punchier and more contemporary.
writeWav(
  'clear.wav',
  mix([
    pop(0.24, { amplitude: 0.4 }),
    concat(silence(0.004), bell(1046.5, 0.26, { amplitude: 0.55, attack: 0.002 })), // C6
    concat(silence(0.028), bell(1567.98, 0.28, { amplitude: 0.42, attack: 0.002 })), // G6, close stagger for shimmer
  ]),
);

// Premium combo: a full bright chord struck together, plus a shimmering high sparkle on top.
writeWav(
  'combo.wav',
  mix([
    bell(523.25, 0.55, { amplitude: 0.55 }), // C5
    bell(659.25, 0.55, { amplitude: 0.5 }), // E5
    bell(783.99, 0.55, { amplitude: 0.5 }), // G5
    bell(1046.5, 0.6, { amplitude: 0.45 }), // C6
    bell(1567.98, 0.5, { amplitude: 0.25, attack: 0.02 }), // G6 sparkle, slightly delayed shimmer
  ]),
);

// Low, muted buzz for an invalid placement attempt (no harsh square wave).
writeWav('invalid.wav', softBuzz(140, 0.18, { amplitude: 0.45 }));

// Reward jingle for earning a tray shuffle: a quick ascending pentatonic run
// that lands on a held, sparkling major chord — deliberately brighter and
// longer than combo.wav so the "you earned a power-up" moment stands apart
// from a regular combo.
writeWav(
  'shuffle-unlock.wav',
  concat(
    bell(523.25, 0.12, { amplitude: 0.55, attack: 0.002 }), // C5
    silence(0.02),
    bell(659.25, 0.12, { amplitude: 0.55, attack: 0.002 }), // E5
    silence(0.02),
    bell(783.99, 0.12, { amplitude: 0.55, attack: 0.002 }), // G5
    silence(0.02),
    bell(1046.5, 0.14, { amplitude: 0.6, attack: 0.002 }), // C6
    silence(0.02),
    mix([
      bell(1046.5, 0.65, { amplitude: 0.5 }), // C6
      bell(1318.51, 0.65, { amplitude: 0.45 }), // E6
      bell(1567.98, 0.7, { amplitude: 0.4 }), // G6
      bell(2093.0, 0.6, { amplitude: 0.3, attack: 0.015 }), // C7 shimmer
    ]),
  ),
);

// Soft card-riffle texture for actually spending a shuffle charge — a quick
// cascade of short ticks, distinct from the bell-based clear/combo sounds.
writeWav(
  'shuffle.wav',
  concat(
    ...Array.from({ length: 10 }, (_, i) => tick(900 - i * 40, 0.045, { amplitude: 0.35 })),
  ),
);

console.log('Done. Placeholder SFX written to assets/sounds/.');
