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
  | 'milestone_30_ip_boost'
  | 'endless_momentum'
  | 'milestone_200_sp_boost'
  | 'milestone_400_temporal_boost'
  | 'milestone_1000_gen_mult'
  | 'milestone_100_ip_auto_pe'
  | 'milestone_1500_auto_infinity'
  | 'milestone_2250_post_infinity';

export interface InfinityMilestoneDefinition {
  id: InfinityMilestoneId;
  title: string;
  icon: string;
  reward: string;
  requirement: string;
  infinityCountRequired: number;
}

export const INFINITY_MILESTONES: InfinityMilestoneDefinition[] = [
  {
    id: 'first_echo',
    title: 'First Echo',
    icon: '🌠',
    reward: 'Start each new Infinity with 1,000 Points and one free Generator 1.',
    requirement: '1 Infinity and 30 lifetime IP earned',
    infinityCountRequired: 1,
  },
  {
    id: 'prestige_echo',
    title: 'Prestige Echo',
    icon: '🔱',
    reward: 'Prestige Point gains are multiplied by ×2.',
    requirement: '3 Infinities and 100 lifetime IP earned',
    infinityCountRequired: 3,
  },
  {
    id: 'energy_well',
    title: 'Energy Well',
    icon: '⚡',
    reward: 'Prestige Energy gained from Energy resets is multiplied by ×2.',
    requirement: '5 Infinities and 10 PE earned in the current Infinity',
    infinityCountRequired: 5,
  },
  {
    id: 'time_fracture',
    title: 'Time Fracture',
    icon: '⌛',
    reward: 'Prestige Energy gained from Energy resets is multiplied by ×1.5.',
    requirement: '7 Infinities and 15 minutes of total playtime',
    infinityCountRequired: 7,
  },
  {
    id: 'ip_resonance',
    title: 'IP Resonance',
    icon: '💠',
    reward: 'Infinity Point gains are multiplied by ×1.5.',
    requirement: '10 Infinities and 250 lifetime IP earned',
    infinityCountRequired: 10,
  },
  {
    id: 'skill_cycle',
    title: 'Skill Cycle',
    icon: '🧠',
    reward: 'Every third Infinity grants +1 additional Skill Point.',
    requirement: '15 Infinities and 50 PE earned in the current Infinity',
    infinityCountRequired: 15,
  },
  {
    id: 'cascade_memory',
    title: 'Cascade Memory',
    icon: '🌀',
    reward: 'All generators receive a permanent ×5 production multiplier.',
    requirement: '25 Infinities and highest-ever Points of at least 1e100',
    infinityCountRequired: 25,
  },
  {
    id: 'milestone_30_ip_boost',
    title: 'Milestone IP Echo',
    icon: '💎',
    reward: 'Получаемые IP увеличиваются на 1.5х мультипликативно за каждый имеющийся майлстоун.',
    requirement: '30 Infinities',
    infinityCountRequired: 30,
  },
  {
    id: 'endless_momentum',
    title: 'Endless Momentum',
    icon: '♾️',
    reward: 'Every Infinity grants +1 additional Skill Point.',
    requirement: '50 Infinities, 1,000 lifetime IP, and 1 hour of total playtime',
    infinityCountRequired: 50,
  },
  {
    id: 'milestone_200_sp_boost',
    title: 'Skill Resonance',
    icon: '🔮',
    reward: 'Увеличивает Получаемые SP за каждый майлстоун +1 к получаемым SP.',
    requirement: '200 Infinities',
    infinityCountRequired: 200,
  },
  {
    id: 'milestone_400_temporal_boost',
    title: 'Temporal Mastery',
    icon: '⏱️',
    reward: 'Усиливает Temporal Infinity получаемый множитель в 5 раз.',
    requirement: '400 Infinities',
    infinityCountRequired: 400,
  },
  {
    id: 'milestone_1000_gen_mult',
    title: 'Millennial Singularity',
    icon: '💥',
    reward: 'Умножает все генераторы на 10 за каждый майлстоун.',
    requirement: '1,000 Infinities',
    infinityCountRequired: 1000,
  },
  {
    id: 'milestone_100_ip_auto_pe',
    title: 'PE Automation Protocol',
    icon: '⚡',
    reward: 'Разблокирует новое улучшение в ветке Automation: Автоматическая покупка улучшений PE (стоимость: 50 SP).',
    requirement: '100 lifetime IP earned',
    infinityCountRequired: 0,
  },
  {
    id: 'milestone_1500_auto_infinity',
    title: 'Automated Transcendence',
    icon: '🤖',
    reward: 'Разблокирует новый апгрейд в Automation Tree: Автоматизация бесконечности и её настройки как у престижа (стоимость: 1,200 SP).',
    requirement: '1,500 Infinities',
    infinityCountRequired: 1500,
  },
  {
    id: 'milestone_2250_post_infinity',
    title: 'Post-Infinity Gateway',
    icon: '🌌',
    reward: 'Разблокирует новую ветку в дереве бесконечности: Post-Infinity (4 мощных апгрейда).',
    requirement: '2,250 Infinities',
    infinityCountRequired: 2250,
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
    case 'milestone_30_ip_boost':
      return infinities >= 30;
    case 'endless_momentum':
      return infinities >= 50 && lifetimeIP.gte(1000) && totalTime >= 60 * 60;
    case 'milestone_200_sp_boost':
      return infinities >= 200;
    case 'milestone_400_temporal_boost':
      return infinities >= 400;
    case 'milestone_1000_gen_mult':
      return infinities >= 1000;
    case 'milestone_100_ip_auto_pe':
      return lifetimeIP.gte(100);
    case 'milestone_1500_auto_infinity':
      return infinities >= 1500;
    case 'milestone_2250_post_infinity':
      return infinities >= 2250;
    default:
      return false;
  }
}

/**
 * Returns the total count of unlocked Infinity Milestones.
 */
export function getUnlockedInfinityMilestonesCount(
  state: GameState,
  infinityCountOverride?: number,
): number {
  if (!state.infinityTree?.feat_3) return 0;
  let count = 0;
  for (const m of INFINITY_MILESTONES) {
    if (isInfinityMilestoneUnlocked(state, m.id, infinityCountOverride)) {
      count++;
    }
  }
  return count;
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
    case 'milestone_30_ip_boost':
      return [fmtInfinities(30)];
    case 'endless_momentum':
      return [fmtInfinities(50), fmtIP(1000), fmtTime(60 * 60)];
    case 'milestone_200_sp_boost':
      return [fmtInfinities(200)];
    case 'milestone_400_temporal_boost':
      return [fmtInfinities(400)];
    case 'milestone_1000_gen_mult':
      return [fmtInfinities(1000)];
    case 'milestone_100_ip_auto_pe':
      return [fmtIP(100)];
    case 'milestone_1500_auto_infinity':
      return [fmtInfinities(1500)];
    case 'milestone_2250_post_infinity':
      return [fmtInfinities(2250)];
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
  return new Decimal(2).pow(Math.min(1e300, exponent)).mul(2);
}
