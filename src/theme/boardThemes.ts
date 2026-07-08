import { TierId } from '../ranking/tiers';

export interface BoardTheme {
  id: string;
  name: string;
  /** Two-tone swatch used for the small picker thumbnail. */
  swatch: [string, string];
  boardGradient: [string, string];
  boardBorder: string;
  boardShadow: string;
  cellEmpty: string;
  cellBorder: string;
  panelGradient: [string, string, string];
  panelBorder: string;
  accent: string;
  /** Flags a rotating/rare theme in the picker UI — purely cosmetic, doesn't affect unlock logic. */
  limited?: boolean;
}

export type ThemeRequirement =
  | { type: 'default' }
  | { type: 'tier'; tierId: TierId; label: string }
  | { type: 'streak'; days: number; label: string }
  | { type: 'quests'; count: number; label: string }
  /** Unlocked forever the first time the player ever claims the specific weekly quest `questId` — that quest only shows up occasionally (see quests.ts's WEEKLY_POOL), which is what makes the theme feel "limited-time" despite the unlock itself being permanent once earned. */
  | { type: 'weeklyQuest'; questId: string; label: string };

export interface ThemeDefinition extends BoardTheme {
  requirement: ThemeRequirement;
}

/**
 * Board cosmetics only re-skin the board/panel surface (gradient, border,
 * shadow tint, empty-cell fill) — never the candy piece colors themselves,
 * which stay universal so color-matching gameplay never gets harder to read
 * just because a theme was equipped.
 */
export const BOARD_THEMES: ThemeDefinition[] = [
  {
    id: 'classic',
    name: 'Classic',
    requirement: { type: 'default' },
    swatch: ['#FFFFFF', '#F1ECFB'],
    boardGradient: ['#FFFFFF', '#FBF8FF'],
    boardBorder: 'rgba(120, 92, 200, 0.14)',
    boardShadow: 'rgba(120, 92, 200, 0.28)',
    cellEmpty: '#F1ECFB',
    cellBorder: '#E7DFF7',
    panelGradient: ['#FFFFFF', '#FBF8FF', '#F1ECFB'],
    panelBorder: 'rgba(120, 92, 200, 0.14)',
    accent: '#6C4FE0',
  },
  {
    id: 'ocean',
    name: 'Ocean Breeze',
    requirement: { type: 'tier', tierId: 'silver', label: 'Reach Silver League' },
    swatch: ['#F0FBFF', '#D7F1FC'],
    boardGradient: ['#F5FCFF', '#DFF4FF'],
    boardBorder: 'rgba(46, 142, 204, 0.24)',
    boardShadow: 'rgba(46, 142, 204, 0.28)',
    cellEmpty: '#E3F4FC',
    cellBorder: '#C9E9F7',
    panelGradient: ['#FFFFFF', '#EAFAFF', '#D7F1FC'],
    panelBorder: 'rgba(46, 142, 204, 0.2)',
    accent: '#2E9CCC',
  },
  {
    id: 'citrus',
    name: 'Golden Hour',
    requirement: { type: 'tier', tierId: 'gold', label: 'Reach Gold League' },
    swatch: ['#FFFCF0', '#FFEFC7'],
    boardGradient: ['#FFFDF4', '#FFF3D6'],
    boardBorder: 'rgba(198, 144, 30, 0.26)',
    boardShadow: 'rgba(198, 144, 30, 0.3)',
    cellEmpty: '#FFF3D9',
    cellBorder: '#FBE4AE',
    panelGradient: ['#FFFFFF', '#FFF8E8', '#FFEFC7'],
    panelBorder: 'rgba(198, 144, 30, 0.22)',
    accent: '#C6901E',
  },
  {
    id: 'emerald',
    name: 'Emerald Dusk',
    requirement: { type: 'tier', tierId: 'platinum', label: 'Reach Platinum League' },
    swatch: ['#F0FFFA', '#D3F5E9'],
    boardGradient: ['#F6FFFC', '#DCF7EC'],
    boardBorder: 'rgba(46, 156, 140, 0.26)',
    boardShadow: 'rgba(46, 156, 140, 0.3)',
    cellEmpty: '#E1F8EF',
    cellBorder: '#BFEEDD',
    panelGradient: ['#FFFFFF', '#EAFFF7', '#D3F5E9'],
    panelBorder: 'rgba(46, 156, 140, 0.22)',
    accent: '#2E9C8C',
  },
  {
    id: 'aurora',
    name: 'Midnight Aurora',
    requirement: { type: 'tier', tierId: 'diamond', label: 'Reach Diamond League' },
    swatch: ['#F2F6FF', '#DCE7FF'],
    boardGradient: ['#F6F9FF', '#E3EBFF'],
    boardBorder: 'rgba(62, 111, 204, 0.3)',
    boardShadow: 'rgba(62, 111, 204, 0.32)',
    cellEmpty: '#E7EEFF',
    cellBorder: '#CBDBFF',
    panelGradient: ['#FFFFFF', '#EEF3FF', '#DCE7FF'],
    panelBorder: 'rgba(62, 111, 204, 0.24)',
    accent: '#3E6FCC',
  },
  {
    id: 'sunrise',
    name: 'Sunrise Streak',
    requirement: { type: 'streak', days: 7, label: '7-day login streak' },
    swatch: ['#FFF4F0', '#FFE1D2'],
    boardGradient: ['#FFF8F4', '#FFE3D6'],
    boardBorder: 'rgba(255, 111, 80, 0.3)',
    boardShadow: 'rgba(255, 111, 80, 0.32)',
    cellEmpty: '#FFEAE0',
    cellBorder: '#FFD1BC',
    panelGradient: ['#FFFFFF', '#FFF1EA', '#FFE1D2'],
    panelBorder: 'rgba(255, 111, 80, 0.24)',
    accent: '#FF6F50',
  },
  {
    id: 'nebula',
    name: 'Quest Nebula',
    requirement: { type: 'quests', count: 15, label: 'Complete 15 quests' },
    swatch: ['#F7F0FF', '#EBDCFF'],
    boardGradient: ['#FAF6FF', '#EBDBFF'],
    boardBorder: 'rgba(122, 47, 191, 0.3)',
    boardShadow: 'rgba(122, 47, 191, 0.32)',
    cellEmpty: '#F1E4FF',
    cellBorder: '#DEC3FA',
    panelGradient: ['#FFFFFF', '#F7EEFF', '#EBDCFF'],
    panelBorder: 'rgba(122, 47, 191, 0.24)',
    accent: '#7A2FBF',
  },
  {
    id: 'gala',
    name: 'Obsidian Gala',
    limited: true,
    requirement: {
      type: 'weeklyQuest',
      questId: 'weekly-legendary-combo9',
      label: 'This week\'s legendary quest: reach a x9 combo',
    },
    swatch: ['#2B2640', '#171326'],
    boardGradient: ['#241E38', '#15111F'],
    boardBorder: 'rgba(255, 200, 87, 0.35)',
    boardShadow: 'rgba(0, 0, 0, 0.45)',
    cellEmpty: '#2E273F',
    cellBorder: 'rgba(255, 200, 87, 0.18)',
    panelGradient: ['#2B2440', '#211C34', '#171326'],
    panelBorder: 'rgba(255, 200, 87, 0.25)',
    accent: '#FFC857',
  },
];

export interface UnlockStats {
  bestScore: number;
  tierIndex: number;
  longestStreak: number;
  totalQuestsCompleted: number;
  completedWeeklyQuestIds: string[];
}

/**
 * Every unlock condition is derived from a monotonic (never-decreasing)
 * stat — best score, longest-ever streak, lifetime quests completed — so a
 * theme never needs to be "granted" or persisted as unlocked separately: it
 * simply stays unlocked forever once the stat crosses the threshold, even if
 * e.g. the player's current daily streak later resets.
 */
export function isThemeUnlocked(theme: ThemeDefinition, stats: UnlockStats): boolean {
  switch (theme.requirement.type) {
    case 'default':
      return true;
    case 'tier': {
      const requiredIndex = TIER_ORDER.indexOf(theme.requirement.tierId);
      return stats.tierIndex >= requiredIndex;
    }
    case 'streak':
      return stats.longestStreak >= theme.requirement.days;
    case 'quests':
      return stats.totalQuestsCompleted >= theme.requirement.count;
    case 'weeklyQuest':
      return stats.completedWeeklyQuestIds.includes(theme.requirement.questId);
    default:
      return false;
  }
}

const TIER_ORDER: TierId[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'challenger'];

export function getThemeById(id: string): ThemeDefinition {
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];
}
