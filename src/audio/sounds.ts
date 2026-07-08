import { createAudioPlayer } from 'expo-audio';

/**
 * Placeholder SFX (see scripts/generate-placeholder-sounds.js). Swap the
 * assets/sounds/*.wav files for polished, licensed audio before shipping.
 */
const dropSource = require('../../assets/sounds/drop.wav');
const clearSource = require('../../assets/sounds/clear.wav');
const comboSource = require('../../assets/sounds/combo.wav');
const invalidSource = require('../../assets/sounds/invalid.wav');
const shuffleUnlockSource = require('../../assets/sounds/shuffle-unlock.wav');
const shuffleSource = require('../../assets/sounds/shuffle.wav');

function playFresh(source: number) {
  const player = createAudioPlayer(source);
  player.play();
  // Release once playback finishes so we don't leak native player instances.
  const sub = player.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish) {
      sub.remove();
      player.release();
    }
  });
}

export async function playDropSound() {
  playFresh(dropSource);
}

export async function playInvalidSound() {
  playFresh(invalidSource);
}

/** groupCount = how many clear rules (rows/cols/color clusters) fired at once. */
export async function playClearSound(groupCount: number, streak = 0) {
  const isPremiumCombo = groupCount >= 2 || streak >= 3;
  playFresh(isPremiumCombo ? comboSource : clearSource);
}

/** Played once when a new shuffle charge is earned — deliberately bigger than a regular combo. */
export async function playShuffleUnlockedSound() {
  playFresh(shuffleUnlockSource);
}

/** Played when the player actually spends a shuffle charge to refresh the tray. */
export async function playShuffleSound() {
  playFresh(shuffleSource);
}
