import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Polygon, RadialGradient, Stop } from 'react-native-svg';
import { TierDefinition } from '../ranking/tiers';

const SHIELD_PATH = 'M50 4 L91 19 L91 48 C91 74 72 92 50 97 C28 92 9 74 9 48 L9 19 Z';

function starPoints(cx: number, cy: number, spikes: number, outerR: number, innerR: number): string {
  const points: string[] = [];
  const step = Math.PI / spikes;
  let rot = -Math.PI / 2;
  for (let i = 0; i < spikes; i++) {
    points.push(`${cx + Math.cos(rot) * outerR},${cy + Math.sin(rot) * outerR}`);
    rot += step;
    points.push(`${cx + Math.cos(rot) * innerR},${cy + Math.sin(rot) * innerR}`);
    rot += step;
  }
  return points.join(' ');
}

interface Props {
  tier: TierDefinition;
  /** 0 = Bronze .. 6 = Challenger, used to scale decoration with rank. */
  tierIndex: number;
  size?: number;
}

export function RankBadge({ tier, tierIndex, size = 72 }: Props) {
  const gradId = `grad-${tier.id}`;
  const glowId = `glow-${tier.id}`;
  const isChallenger = tier.id === 'challenger';
  const isTop = tierIndex >= 5;
  const rings = Math.min(tierIndex, 2);
  const rayCount = isChallenger ? 16 : 8;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tier.colors[1]} />
            <Stop offset="1" stopColor={tier.colors[0]} />
          </LinearGradient>
          <RadialGradient id={glowId} cx="50%" cy="45%" r="55%">
            <Stop offset="0" stopColor={tier.glow} stopOpacity={0.55} />
            <Stop offset="1" stopColor={tier.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {isTop &&
          Array.from({ length: rayCount }).map((_, i) => {
            const angle = (i / rayCount) * Math.PI * 2;
            const x1 = 50 + Math.cos(angle) * 34;
            const y1 = 48 + Math.sin(angle) * 34;
            const x2 = 50 + Math.cos(angle) * (isChallenger ? 49 : 46);
            const y2 = 48 + Math.sin(angle) * (isChallenger ? 49 : 46);
            return (
              <Line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={tier.glow}
                strokeWidth={isChallenger ? 2.5 : 3}
                strokeLinecap="round"
                opacity={0.85}
              />
            );
          })}

        <Circle cx={50} cy={48} r={46} fill={`url(#${glowId})`} />

        <Path d={SHIELD_PATH} fill={`url(#${gradId})`} stroke="#00000022" strokeWidth={1.5} />

        {rings >= 1 && <Circle cx={50} cy={46} r={30} fill="none" stroke="#FFFFFF99" strokeWidth={2} />}
        {rings >= 2 && <Circle cx={50} cy={46} r={24} fill="none" stroke="#FFFFFF66" strokeWidth={1.5} />}

        <Polygon
          points={starPoints(50, 46, 5, isTop ? 20 : 15, isTop ? 9 : 6.5)}
          fill="#FFFFFF"
          opacity={0.95}
        />
      </Svg>
    </View>
  );
}
