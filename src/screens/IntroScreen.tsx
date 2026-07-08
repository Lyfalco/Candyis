import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { PALETTE } from '../theme/colors';

interface Props {
  /** True once every boot task (auth state, best-score fetch) has resolved. */
  ready: boolean;
  onDone: () => void;
}

// The bar "trickles" toward TRICKLE_TARGET on its own so it always feels like
// it's progressing, then snaps the rest of the way to 100 only once `ready`
// actually flips — it never fakes reaching 100 before the real data is in.
const TRICKLE_TARGET = 92;
const TRICKLE_DURATION_MS = 1400;
const FINISH_DURATION_MS = 260;
const HOLD_AT_FULL_MS = 320;

export function IntroScreen({ ready, onDone }: Props) {
  const [percent, setPercent] = useState(0);
  const finishingRef = useRef(false);
  // `onDone` is a fresh arrow function on every parent render (App.tsx has no
  // reason to memoize it). Reading it through a ref — instead of putting it in
  // the effect's dependency array — means the finish animation below can't be
  // cancelled and abandoned mid-flight by an unrelated parent re-render (e.g.
  // network state changing). That was the actual cause of the intro screen
  // freezing on a random percentage instead of ever reaching 100.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let frame: number;
    const start = Date.now();
    const trickle = () => {
      if (finishingRef.current) return;
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / TRICKLE_DURATION_MS);
      setPercent(TRICKLE_TARGET * t);
      if (t < 1) frame = requestAnimationFrame(trickle);
    };
    frame = requestAnimationFrame(trickle);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!ready || finishingRef.current) return;
    finishingRef.current = true;

    let frame: number;
    const start = Date.now();
    const finish = () => {
      const t = Math.min(1, (Date.now() - start) / FINISH_DURATION_MS);
      setPercent(TRICKLE_TARGET + (100 - TRICKLE_TARGET) * t);
      if (t < 1) {
        frame = requestAnimationFrame(finish);
      } else {
        setTimeout(() => onDoneRef.current(), HOLD_AT_FULL_MS);
      }
    };
    frame = requestAnimationFrame(finish);
    return () => cancelAnimationFrame(frame);
    // Only `ready` (a stable boolean) should ever restart this — see onDoneRef above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <View
      style={styles.root}
      onLayout={() => {
        // Native splash hands off the instant our own first frame has
        // painted, so there's no gap where a blank/default screen shows.
        void SplashScreen.hideAsync();
      }}
    >
      <View style={styles.iconFrame}>
        <Image source={require('../../assets/icon.png')} style={styles.iconImage} />
      </View>
      <Text style={styles.title}>Candyis</Text>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
      <Text style={styles.percentText}>{Math.round(percent)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PALETTE.splashBackground,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconFrame: {
    width: 120,
    height: 120,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  iconImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 48,
  },
  track: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: PALETTE.accent,
  },
  percentText: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '700',
  },
});
