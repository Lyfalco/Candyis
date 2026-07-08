import { CandyColor } from '../game';

export const CANDY_HEX: Record<CandyColor, string> = {
  red: '#FF6B6B',
  orange: '#FFA648',
  yellow: '#FFCF4D',
  green: '#4CD787',
  blue: '#4A9DFF',
  purple: '#B47CFF',
  /** Bomb Candy — dark charcoal so it reads as distinct/special against every real candy color. */
  bomb: '#2B2640',
};

export const PALETTE = {
  background: '#FBF7F0',
  backgroundGradientTop: '#FFF3E0',
  backgroundGradientBottom: '#F4EEFF',
  boardBackground: '#FFFFFF',
  cellEmpty: '#F1ECFB',
  cellBorder: '#E7DFF7',
  previewValid: 'rgba(76, 215, 135, 0.5)',
  previewInvalid: 'rgba(255, 107, 107, 0.5)',
  textPrimary: '#3A2E52',
  textMuted: '#8C82A8',
  accent: '#FFB020',
  accentSecondary: '#FF6FA0',
  cardShadow: 'rgba(120, 92, 200, 0.16)',
  surface: '#FFFFFF',
  surfaceMuted: '#F1ECFB',
  boardBorder: 'rgba(120, 92, 200, 0.14)',
  /** Distinct "power-up" color for the shuffle mechanic, kept apart from the combo palette. */
  magic: '#6C4FE0',
  magicGlow: '#B69CFF',
  /** Matches the dark corners of assets/icon.png so the native splash screen blends seamlessly into it. */
  splashBackground: '#29105B',
};
