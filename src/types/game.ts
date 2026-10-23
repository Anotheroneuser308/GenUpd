import { Decimal } from '../utils/decimal';

export interface GeneratorState {
  id: number;
  name: string;
  amount: Decimal;
  bought: number;
  baseCost: Decimal;
  costMult: Decimal;
  multiplier: Decimal;
}

export interface TickspeedState {
  bought: number;
  baseCost: Decimal;
  costMult: Decimal;
  cost: Decimal;
  multiplier: number; // e.g. 1.10x
}

export interface PrestigeState {
  count: number;
  points: Decimal; // Prestige Points (PP)
  unlockedGenerators: number; // 4 initially, up to 8 via Generator Expander
}

export interface PrestigeEnergyState {
  unlocked: boolean; // true once points reach 1e154
  amount: Decimal;
  /** PE earned during the current Infinity run; reset to zero on Big Crunch. */
  totalEarned: Decimal;
  /** @deprecated Legacy saved value; new runs use generatorUpgradeLevel instead. */
  multiplier: Decimal;
  generatorUpgradeLevel: number; // Purchased generator boosts bought with Prestige Energy
  resets: number;
}

export interface PrestigeUpgradesState {
  pointScaling: boolean; // Upgrade 1: 2x per 6 OoM points
  achievementBoost: boolean; // Upgrade 2: 1.05x per achievement (multiplicative)
  cascadingBoostsLevel: number; // Upgrade 3A: 0 to 20 levels (AD-style non-resetting cascade boosts)
  generatorUnlockLevel: number; // Upgrade 3B: 0 to 4 levels (unlocks Gen 5, 6, 7, 8)
  tickspeedDiscount: boolean; // Upgrade 4: 100x lower base tickspeed cost
  prestigeSynergy: boolean; // Upgrade 5: Points boosted by unspent PP
  amplifiedDoubling: boolean; // Upgrade 6: Base generator purchase mult increases to 2.25x
  chronosFlow: boolean; // Upgrade 7: Tickspeed power increased
  logarithmicCascade: boolean; // Upgrade 8: Points boosted by log10(points)^2
  cascadeSurge: boolean; // Upgrade 9: All generators receive x2 production
  cosmicResonance: boolean; // Upgrade 10: Every 10 total generator purchases multiplies points by 1.5x
  prestigeSkillSynergy: boolean; // Unlocked by Infinity Tree feat_2; boosts SP gain from Prestige resets
}

export interface InfinityState {
  count: number;
  points: Decimal; // Infinity Points (IP)
  skillPoints: number; // Skill Points (SP) - 1 awarded per Infinity
  unlocked: boolean; // unlocked when reaching 1.79e308
  ipDoublerLevel?: number; // Infinity Upgrade: Doubles IP gain on each Infinity
  automationExpand?: boolean; // Infinity Upgrade: Unlocks auto_5 and auto_6 in tree
  achievementMaster?: boolean; // Infinity Upgrade: 15 IP, grants 3 honorary achievements per magnitude
  ipGeneratorBoost: boolean; // All generators scale with lifetime IP: 3^log10(total IP earned)
  timeIPBoost: boolean; // Big Crunch IP gain scales with time spent in current Infinity
  energySPBoost: boolean; // Prestige Energy gain scales with unspent SP + 1
  totalEarnedIP: Decimal; // Lifetime IP earned, including IP later spent on upgrades
}

export type PrestigeAutobuyerMode = 'time' | 'targetPP' | 'ppMultiplier';
export type EnergyAutobuyerMode = 'time' | 'target' | 'gainMultiplier';
export type InfinityAutobuyerMode = 'time' | 'targetIP' | 'ipMultiplier';

export interface Autobuyer {
  id: string;
  name: string;
  enabled: boolean;
  unlocked: boolean;
  target?: number | string;
  mode?: PrestigeAutobuyerMode;
  timeTarget?: number; // Seconds between eligible Prestige resets
  ratioTarget?: number; // Required multiple of the previous Prestige gain
  previousPPGain?: Decimal; // PP gained on the last completed Prestige reset

  // Settings for auto_5 (Auto: Prestige Upgrades)
  priority?: 'cheapest' | 'order';
  buyAll?: boolean;

  // Settings for auto_6 (Prestige Energy Autobuyer)
  energyMode?: EnergyAutobuyerMode;
  energyTimeTarget?: number;
  energyTarget?: number;
  energyRatioTarget?: number;
  previousEnergyGain?: Decimal;

  // Settings for auto_7 (Infinity Autobuyer)
  infinityMode?: InfinityAutobuyerMode;
  infinityTimeTarget?: number;
  infinityTarget?: number;
  infinityRatioTarget?: number;
  previousIPGain?: Decimal;
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  unlocked: boolean;
}

export interface GrowthPoint {
  timestamp: number; // Unix timestamp
  timePlayed: number; // Seconds of total play time
  points: number; // Number approximation
  logPoints: number; // Log10(points), key for exponential scale
  formattedPoints: string; // Formatted representation (e.g. 1.25e40)
  rate: number;
}

export interface GameStats {
  totalTimePlayed: number; // online + offline accumulated playtime, seconds
  onlineTimePlayed: number; // seconds while the game is open and running
  offlineTimePlayed: number; // seconds simulated while the game was closed
  sessionTimePlayed: number; // seconds since the current page/app session started
  timeThisPrestige: number; // seconds
  timeThisInfinity: number; // seconds in current infinity
  totalPrestiges: number;
  fastestPrestige: number; // seconds
  totalInfinities: number;
  peakPointsRate: Decimal;
  totalManualClicks: number;
  highestPointsEver: Decimal;
  highestPPEver: Decimal;
  highestIPEver: Decimal;
  growthHistory?: GrowthPoint[];
}

export interface GameSettings {
  language: 'en' | 'ru';
  notation: 'scientific' | 'engineering' | 'standard' | 'logarithm';
  soundEnabled: boolean;
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // seconds
}

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  description?: string;
  icon?: string;
  type?: 'achievement' | 'save' | 'info';
  timestamp: number;
}

export interface GameState {
  version: number;
  points: Decimal;
  pointsPerSecond: Decimal;
  /** Purchase count anchors captured the first time a run reaches 1e100 points. Null until triggered. */
  generatorCostSoftcapBought: number[] | null;
  lastUpdate: number;

  generators: GeneratorState[];
  tickspeed: TickspeedState;
  prestige: PrestigeState;
  prestigeEnergy: PrestigeEnergyState;
  prestigeUpgrades: PrestigeUpgradesState;
  infinity: InfinityState;
  infinityTree?: Record<string, boolean>;

  autobuyers: Record<string, Autobuyer>;
  achievements: Record<string, boolean>;

  stats: GameStats;
  settings: GameSettings;
}
