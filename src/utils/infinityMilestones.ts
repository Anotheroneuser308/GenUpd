import { Decimal } from './decimal';
import type { GameState } from '../types/game';

export type InfinityMilestoneId =
  | 'first_echo'
  | 'prestige_echo'
  | 'energy_well'
  | 'time_fracture'
  | 'ip_resonance'
  | 'skill_cycle'
  | 'cascade_memory'
  | 'endless_momentum';

export interface InfinityMilestoneDefinition {
  id: InfinityMilestoneId;
  title: string;
  icon: string;
  reward: string;
  requirement: string;
}

export const INFINITY_MILESTONES: InfinityMilestoneDefinition[] = [
  {
    id: 'first_echo',
    title: 'First Echo',
    icon: '🌠',
    reward: 'Start each new Infinity with 1,000 Points and one free Generator 1.',
    requirement: '1 Infinity and 30 lifetime IP earned',
  },
  {
    id: 'prestige_echo',
    title: 'Prestige Echo',
    icon: '🔱',
    reward: 'Prestige Point gains are multiplied by ×2.',
    requirement: '3 Infinities and 100 lifetime IP earned',
  },
  {
    id: 'energy_well',
    title: 'Energy Well',
    icon: '⚡',
    reward: 'Prestige Energy gained from Energy resets is multiplied by ×2.',
    requirement: '5 Infinities and 10 PE earned in the current Infinity',
  },
  {
    id: 'time_fracture',
    title: 'Time Fracture',
    icon: '⌛',
    reward: 'Prestige Energy gained from Energy resets is multiplied by ×1.5.',
    requirement: '7 Infinities and 15 minutes of total playtime',
  },
  {
    id: 'ip_resonance',
    title: 'IP Resonance',
    icon: '💠',
    reward: 'Infinity Point gains are multiplied by ×1.5.',
    requirement: '10 Infinities and 250 lifetime IP earned',
  },
  {
    id: 'skill_cycle',
    title: 'Skill Cycle',
    icon: '🧠',
    reward: 'Every third Infinity grants +1 additional Skill Point.',
    requirement: '15 Infinities and 50 PE earned in the current Infinity',
  },
  {
    id: 'cascade_memory',
    title: 'Cascade Memory',
    icon: '🌀',
    reward: 'All generators receive a permanent ×5 production multiplier.',
    requirement: '25 Infinities and highest-ever Points of at least 1e100',
  },
  {
    id: 'endless_momentum',
    title: 'Endless Momentum',
    icon: '♾️',
    reward: 'Every Infinity grants +1 additional Skill Point.',
    requirement: '50 Infinities, 1,000 lifetime IP, and 1 hour of total playtime',
  },
];

export function getLifetimeIPEarned(state: GameState): Decimal {
  const lifetime = state.infinity?.totalEarnedIP;
  return lifetime instanceof Decimal ? lifetime : (state.infinity?.points ?? Decimal.zero());
}

export function getLifetimePEEarned(state: GameState): Decimal {
  const lifetime = state.prestigeEnergy?.totalEarned;
  return lifetime instanceof Decimal ? lifetime : (state.prestigeEnergy?.amount ?? Decimal.zero());
}

export function getTotalInfinities(state: GameState, override?: number): number {
  return Math.max(
    0,
    Math.floor(override ?? 0),
    Math.floor(state.infinity?.count || 0),
    Math.floor(state.stats?.totalInfinities || 0),
  );
}

/**
 * Milestones are active only after the Infinity Milestones tree node is purchased.
 * Infinity count and IP history are persistent; PE requirements intentionally use PE
 * earned in the current Infinity run because PE progress resets on Big Crunch.
 */
export function isInfinityMilestoneUnlocked(
  state: GameState,
  id: InfinityMilestoneId,
  infinityCountOverride?: number,
): boolean {
  if (!state.infinityTree?.feat_3) return false;

  const infinities = getTotalInfinities(state, infinityCountOverride);
  const lifetimeIP = getLifetimeIPEarned(state);
  const lifetimePE = getLifetimePEEarned(state);
  const totalTime = Math.max(0, state.stats?.totalTimePlayed || 0);
  const highestPoints = state.stats?.highestPointsEver instanceof Decimal
    ? state.stats.highestPointsEver
    : Decimal.zero();

  switch (id) {
    case 'first_echo':
      return infinities >= 1 && lifetimeIP.gte(30);
    case 'prestige_echo':
      return infinities >= 3 && lifetimeIP.gte(100);
    case 'energy_well':
      return infinities >= 5 && lifetimePE.gte(10);
    case 'time_fracture':
      return infinities >= 7 && totalTime >= 15 * 60;
    case 'ip_resonance':
      return infinities >= 10 && lifetimeIP.gte(250);
    case 'skill_cycle':
      return infinities >= 15 && lifetimePE.gte(50);
    case 'cascade_memory':
      return infinities >= 25 && highestPoints.gte(new Decimal(1, 100));
    case 'endless_momentum':
      return infinities >= 50 && lifetimeIP.gte(1000) && totalTime >= 60 * 60;
    default:
      return false;
  }
}

export function getInfinityMilestoneRequirementProgress(
  state: GameState,
  id: InfinityMilestoneId,
): string[] {
  const infinities = getTotalInfinities(state);
  const lifetimeIP = getLifetimeIPEarned(state);
  const lifetimePE = getLifetimePEEarned(state);
  const totalTime = Math.max(0, state.stats?.totalTimePlayed || 0);
  const highestPoints = state.stats?.highestPointsEver instanceof Decimal
    ? state.stats.highestPointsEver
    : Decimal.zero();
  const notation = state.settings?.notation;
  const fmtIP = (target: number) => `${lifetimeIP.format(notation)} / ${target} lifetime IP`;
  const fmtPE = (target: number) => `${lifetimePE.format(notation)} / ${target} PE this Infinity`;
  const fmtInfinities = (target: number) => `${infinities} / ${target} Infinities`;
  const fmtTime = (targetSeconds: number) => `${Math.floor(totalTime / 60)} / ${Math.floor(targetSeconds / 60)} minutes total playtime`;

  switch (id) {
    case 'first_echo':
      return [fmtInfinities(1), fmtIP(30)];
    case 'prestige_echo':
      return [fmtInfinities(3), fmtIP(100)];
    case 'energy_well':
      return [fmtInfinities(5), fmtPE(10)];
    case 'time_fracture':
      return [fmtInfinities(7), fmtTime(15 * 60)];
    case 'ip_resonance':
      return [fmtInfinities(10), fmtIP(250)];
    case 'skill_cycle':
      return [fmtInfinities(15), fmtPE(50)];
    case 'cascade_memory':
      return [fmtInfinities(25), `Highest Points: ${highestPoints.format(notation)} / 1e100`];
    case 'endless_momentum':
      return [fmtInfinities(50), fmtIP(1000), fmtTime(60 * 60)];
    default:
      return [];
  }
}

/**
 * Passive generator bonus from lifetime PE earned. Spending PE never removes
 * this bonus. Early values give a visible lift, then growth softcaps logarithmically
 * after 10 lifetime PE to stop astronomical PE values from instantly breaking balance.
 */
export function getPassivePEGeneratorMultiplier(state: GameState): Decimal {
  const totalPE = getLifetimePEEarned(state);
  if (totalPE.lt(1)) return Decimal.one();

  let effectivePE: number;
  if (totalPE.lte(10)) {
    effectivePE = totalPE.toNumber();
  } else {
    const logPE = Math.max(1, totalPE.log10());
    effectivePE = 10 + Math.pow(Math.max(0, logPE - 1), 0.7);
  }

  const extraPower = Math.max(0, effectivePE - 1);
  const exponent = 1 + 0.2 * extraPower + 0.15 * Math.pow(extraPower, 1.5);
  // Double the resulting passive generator multiplier while preserving its original growth curve.
  // At 1 PE, this changes x2 to x4; all later values are also exactly 2x their former value.
  return new Decimal(2).pow(Math.min(1e300, exponent)).mul(2);
}
