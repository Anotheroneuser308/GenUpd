import { Decimal } from './decimal';
import { GameState } from '../types/game';
import { getPassivePEGeneratorMultiplier, isInfinityMilestoneUnlocked } from './infinityMilestones';

// Prestige unlock threshold (1.00e18 Points)
export const PRESTIGE_REQUIREMENT = new Decimal(1e18);

export function getPrestigeRequirement(_state?: GameState): Decimal {
  return PRESTIGE_REQUIREMENT;
}

// Prestige Energy unlock threshold (1.00e154 Points)
export const PRESTIGE_ENERGY_THRESHOLD = new Decimal(1, 154);

// Infinity threshold (1.79e308 Points)
export const INFINITY_THRESHOLD = new Decimal(1.7976931348623157, 308);

/**
 * Returns number of unlocked generators:
 * Initially 4, unlocked sequentially up to 8 via Generator Expander (Levels 1 to 4)
 */
export function getUnlockedGeneratorsCount(state: GameState): number {
  const unlockLvl = state.prestigeUpgrades?.generatorUnlockLevel || 0;
  return Math.min(8, Math.max(4, 4 + unlockLvl));
}

/** Threshold is tracked per run; the game UI does not expose this balance rule. */
export const GENERATOR_COST_SOFTCAP_THRESHOLD = new Decimal(1, 100);

/**
 * Returns the cost for the next generator purchase.
 * Before the run reaches 1e100 points, the original progression is used.
 * Once reached, each generator keeps its price curve up to its own activation
 * purchase count, then continues with a steeper tier-specific multiplier.
 */
export function getGeneratorCost(
  baseCost: Decimal,
  costMult: Decimal,
  bought: number,
  generatorId: number,
  softcapStartBought?: number | null,
): Decimal {
  const purchaseCount = Math.max(0, Math.floor(bought));

  // No per-run activation yet: keep the standard generator price progression.
  if (softcapStartBought === undefined || softcapStartBought === null) {
    return baseCost.mul(costMult.pow(purchaseCount));
  }

  const pivot = Math.max(0, Math.floor(softcapStartBought));
  const normalPurchases = Math.min(purchaseCount, pivot);
  const acceleratedPurchases = Math.max(0, purchaseCount - pivot);

  // Post-threshold per-purchase growth is strictly tiered. Generator 1 starts
  // at 1e3; every later tier grows faster, avoiding equal Generator 1/2 rates.
  const originalMagnitude = Math.round(costMult.log10());
  const acceleratedMagnitude = generatorId === 1
    ? 3
    : Math.max(generatorId + 2, originalMagnitude + 1);
  const acceleratedCostMult = new Decimal(10).pow(acceleratedMagnitude);

  return baseCost
    .mul(costMult.pow(normalPurchases))
    .mul(acceleratedCostMult.pow(acceleratedPurchases));
}

/**
 * Upgrade 3A: Cascading Boosts
 * Like Dimensional Boosts in Antimatter Dimensions (without resetting!):
 * Level 1: doubles Generator 1.
 * Level 2: doubles Generator 1 again, and doubles Generator 2.
 * Level 3: doubles Generator 1 again, Generator 2 again, and Generator 3.
 * Level L: For any generator i (1..8), if L >= i, it gets 2^(L - i + 1).
 * After level 8 (levels 9..20), each additional level doubles ALL 8 generators!
 */
export const MAX_CASCADING_BOOSTS = 20;

export function getCascadingBoostCost(currentLevel: number): Decimal {
  // The first 8 bought levels cost 1, 10, ..., 1e7 PP. Level 9 onward scales by x40.
  const level = Math.max(0, Math.floor(currentLevel));
  if (level < 8) return new Decimal(10).pow(level);
  const level8Cost = new Decimal(10).pow(7);
  return level8Cost.mul(new Decimal(40).pow(level - 7));
}

export function getCascadingBoostMultiplierForGen(genId: number, boostLevel: number): Decimal {
  if (boostLevel < genId) return Decimal.one();
  return new Decimal(2).pow(boostLevel - genId + 1);
}

/**
 * Upgrade 3B: Generator Expander (Unlocks Generators 5, 6, 7, 8)
 * Level 1 (Cost 50 PP): Unlocks Generator 5
 * Level 2 (Cost 750 PP): Unlocks Generator 6
 * Level 3 (Cost 7,500 PP): Unlocks Generator 7
 * Level 4 (Cost 125,000 PP): Unlocks Generator 8
 */
export const MAX_GENERATOR_UNLOCKS = 4;
export const GENERATOR_UNLOCK_COSTS: Decimal[] = [
  new Decimal(50),
  new Decimal(750),
  new Decimal(7500),
  new Decimal(125000),
];

export function getGeneratorUnlockCost(currentLevel: number): Decimal {
  if (currentLevel >= MAX_GENERATOR_UNLOCKS) return new Decimal(Infinity);
  return GENERATOR_UNLOCK_COSTS[currentLevel];
}

/**
 * Infinity generator multiplier: 2^Infinities up to 100 Infinities, then
 * retains that entire bonus and adds a softer x1.2 multiplier per extra Infinity.
 */
export function getInfinityGeneratorMultiplier(infinities: number): Decimal {
  const count = Math.max(0, Math.floor(Number.isFinite(infinities) ? infinities : 0));
  const beforeSoftcap = Math.min(count, 100);
  const afterSoftcap = Math.max(0, count - 100);

  const multiplier = new Decimal(2).pow(beforeSoftcap);
  return afterSoftcap > 0
    ? multiplier.mul(new Decimal(1.2).pow(afterSoftcap))
    : multiplier;
}

/**
 * Multiplier for generator based on purchases, Upgrade 3A (Cascading Boosts), Upgrade 9, Prestige Energy,
 * and the Infinity Tree Root Node with a softcap after 1024 Infinities.
 */
export function getGeneratorMultiplier(genId: number, state: GameState): Decimal {
  const gen = state.generators[genId - 1];
  if (!gen) return Decimal.one();

  // Base purchase doubling: 2x, or 2.25x with Upgrade 6 (Amplified Doubling)
  const baseDoubling = state.prestigeUpgrades?.amplifiedDoubling ? 2.25 : 2.0;
  let mult = new Decimal(baseDoubling).pow(gen.bought);

  // Upgrade 3A: Cascading Boosts (AD-style non-resetting dimensional boosts)
  const boostLevel = state.prestigeUpgrades?.cascadingBoostsLevel || 0;
  if (boostLevel >= genId) {
    const boostMult = getCascadingBoostMultiplierForGen(genId, boostLevel);
    mult = mult.mul(boostMult);
  }

  // Upgrade 9: Cascade Surge - x2 production multiplier for every generator.
  if (state.prestigeUpgrades?.cascadeSurge) {
    mult = mult.mul(2);
  }

  // Upgrade 10: Cosmic Resonance (every 10 purchases gives x1.05).
  if (state.prestigeUpgrades?.cosmicResonance) {
    const totalPurchases = state.generators.reduce((sum, g) => sum + g.bought, 0);
    const groupsOf10 = Math.floor(totalPurchases / 10);
    if (groupsOf10 > 0) {
      mult = mult.mul(new Decimal(1.05).pow(groupsOf10));
    }
  }

  // Purchased PE amplifier levels are one source of power; PE earned in this
  // Infinity grants a separate passive multiplier that remains after spending PE
  // but resets when the player advances through Big Crunch.
  const energyUpgradeLevel = Math.max(0, Math.floor(state.prestigeEnergy?.generatorUpgradeLevel || 0));
  if (energyUpgradeLevel > 0) {
    mult = mult.mul(new Decimal(2).pow(energyUpgradeLevel));
  }
  mult = mult.mul(getPassivePEGeneratorMultiplier(state));

  // Infinity Upgrade: generator boost based on lifetime IP earned (including IP already spent).
  if (state.infinity?.ipGeneratorBoost && state.infinity.totalEarnedIP?.gt(0)) {
    const lifetimeIPLog = Math.max(0, state.infinity.totalEarnedIP.log10());
    mult = mult.mul(new Decimal(3).pow(lifetimeIPLog));
  }

  // Cascade Memory is earned through the Infinity Milestone system, not count alone.
  if (isInfinityMilestoneUnlocked(state, 'cascade_memory')) {
    mult = mult.mul(5);
  }

  // Infinity Tree - Root Node: 2^Infinities until 1024, then an additional 1.2x per Infinity.
  const totalInfinities = state.infinity?.count || state.stats?.totalInfinities || 0;
  if (totalInfinities > 0) {
    mult = mult.mul(getInfinityGeneratorMultiplier(totalInfinities));
  }

  // Infinity Tree - Temporal Surge: starts at x1.00 and adds +0.01x per second in the current Infinity.
  if (state.infinityTree?.pre_1) {
    const timeInf = state.stats?.timeThisInfinity || 0;
    const timeMult = 1 + (timeInf * 0.01);
    mult = mult.mul(new Decimal(timeMult));
  }

  // Infinity Tree - Pre-Infinity Node 4 (Tickspeed Induction: tickspeed affects generators at reduced rate)
  if (state.infinityTree?.pre_4) {
    const tickspeedSpeed = getTotalTickspeedSpeed(state);
    if (tickspeedSpeed.gt(1)) {
      mult = mult.mul(tickspeedSpeed.pow(0.5));
    }
  }

  return mult;
}

/**
 * Tickspeed base cost:
 * Upgrade 4 reduces initial base cost by 100x (from 1,000 down to 10!)
 */
export function getTickspeedBaseCost(state: GameState): Decimal {
  return state.prestigeUpgrades?.tickspeedDiscount ? new Decimal(10) : new Decimal(1000);
}

/**
 * Current tickspeed cost based on purchases
 */
export function getTickspeedCost(state: GameState): Decimal {
  const base = getTickspeedBaseCost(state);
  return base.mul(state.tickspeed.costMult.pow(state.tickspeed.bought));
}

/**
 * Current tickspeed rate multiplier:
 * Base is 1.10x, upgraded to 1.15x with Upgrade 7 (Chronos Flow)
 */
export function getTotalTickspeedSpeed(state: GameState): Decimal {
  const basePower = state.prestigeUpgrades?.chronosFlow ? 1.15 : state.tickspeed.multiplier;
  return new Decimal(basePower).pow(state.tickspeed.bought);
}

export function getAchievementMasterCompletions(state: GameState): number {
  if (!state.infinity?.achievementMaster) return 0;
  const p = state.points;
  if (!p || p.lte(0) || !p.mantissa) return 0;
  return Math.floor(Math.max(0, p.log10()));
}

/**
 * Points generation multiplier derived from Prestige Upgrades
 */
export function getPointsGenerationMultiplier(state: GameState): Decimal {
  let mult = Decimal.one();

  // Upgrade 1: 2x per 1e6 (6 OoM) Points
  if (state.prestigeUpgrades?.pointScaling && state.points.gte(1e6)) {
    const oom6 = Math.floor(state.points.log10() / 6);
    if (oom6 > 0) {
      mult = mult.mul(new Decimal(2).pow(oom6));
    }
  }

  // Upgrade 2: 1.05x per achievement unlocked (multiplicative)
  if (state.prestigeUpgrades?.achievementBoost) {
    const unlockedCount = Object.values(state.achievements).filter(Boolean).length;
    const masterBonus = getAchievementMasterCompletions(state);
    const totalAch = unlockedCount + masterBonus;
    if (totalAch > 0) {
      mult = mult.mul(new Decimal(1.05).pow(totalAch));
    }
  }

  // Upgrade 5: Prestige Synergy (Points boosted by unspent PP without exponent: 1 + PP, hardcapped at 1e10)
  if (state.prestigeUpgrades?.prestigeSynergy && state.prestige.points.gt(0)) {
    const rawPpBoost = state.prestige.points.add(1);
    const ppBoost = rawPpBoost.gt(1e10) ? new Decimal(1e10) : rawPpBoost;
    mult = mult.mul(ppBoost);
  }

  // Upgrade 8: Logarithmic Cascade (Points boosted by log10(points)^2)
  if (state.prestigeUpgrades?.logarithmicCascade && state.points.gte(10)) {
    const logP = state.points.log10();
    mult = mult.mul(new Decimal(logP * logP));
  }

  return mult;
}

/**
 * Calculate Prestige Points gained on Prestige reset.
 * Requirement: 1.00e18 Points.
 * Curved progression: early Prestige gains grow quickly, then taper off toward Infinity.
 * At 1e200 this yields about 5.6 million PP before other bonuses.
 * Pre-Infinity Node 3 multiplies PP gain by 3x.
 */
export function calculatePrestigePointsGain(points: Decimal, state?: GameState): Decimal {
  if (points.lt(PRESTIGE_REQUIREMENT)) {
    return Decimal.zero();
  }

  const logPoints = points.log10();
  const reqLog = PRESTIGE_REQUIREMENT.log10();
  const excessLog = Math.max(0, logPoints - reqLog);
  // Square-root scaling is generous early, but grows slower than a linear log curve
  // as Points approach Infinity. Use Decimal exponentiation to support huge values.
  const prestigeExponent = Math.sqrt(excessLog) * 0.5;
  let gain = new Decimal(10).pow(prestigeExponent).floor();
  if (gain.lt(1)) gain = new Decimal(1);

  if (state?.infinityTree?.pre_3) {
    gain = gain.mul(3);
  }
  if (state && isInfinityMilestoneUnlocked(state, 'prestige_echo')) {
    gain = gain.mul(2);
  }

  return gain;
}

/**
 * Calculate Prestige Energy currency gained on an Energy reset.
 * Starts at 1 PE at 1e154 Points and scales by 10x per 40 additional orders of magnitude.
 * It is a currency reward only; it no longer directly multiplies existing generator power.
 */
export function calculatePrestigeEnergyGain(points: Decimal, state?: GameState): Decimal {
  if (points.lt(PRESTIGE_ENERGY_THRESHOLD)) return Decimal.zero();

  const excessLog = Math.max(0, points.log10() - 154);
  let gain = new Decimal(10).pow(excessLog / 40);

  if (state && isInfinityMilestoneUnlocked(state, 'energy_well')) {
    gain = gain.mul(2);
  }
  if (state && isInfinityMilestoneUnlocked(state, 'time_fracture')) {
    gain = gain.mul(1.5);
  }

  // Infinity Upgrade: PE gain is multiplied by (unspent SP + 1).
  if (state?.infinity?.energySPBoost) {
    gain = gain.mul(Math.max(1, (state.infinity.skillPoints || 0) + 1));
  }

  return gain;
}

/**
 * Calculate Infinity Points granted by a Big Crunch / Infinity reset.
 * Before Break Infinity, a reset grants 1 IP (then upgrade/milestone multipliers apply).
 * After Break Infinity, each additional 10 orders of magnitude of Points grants 10x more IP.
 */
export function calculateInfinityPointGain(
  points: Decimal,
  state: GameState,
  infinityCount: number = state.infinity.count,
): Decimal {
  let gain = Decimal.one();

  if (state.infinityTree?.feat_4 && points.gte(INFINITY_THRESHOLD)) {
    const excessLog = Math.max(0, points.log10() - INFINITY_THRESHOLD.log10());
    gain = new Decimal(10).pow(excessLog / 10).floor();
    if (gain.lt(1)) gain = Decimal.one();
  }

  if (isInfinityMilestoneUnlocked(state, 'ip_resonance', infinityCount)) gain = gain.mul(1.5);
  if (state.infinity.timeIPBoost) {
    gain = gain.mul(1 + 0.002 * Math.max(0, state.stats?.timeThisInfinity || 0));
  }
  gain = gain.mul(new Decimal(2).pow(state.infinity.ipDoublerLevel || 0)).floor();
  return gain.lt(1) ? Decimal.one() : gain;
}

/** Extra Skill Points granted by the requirement-based Infinity Milestones. */
export function getInfinityMilestoneExtraSP(state: GameState, infinityCount: number = state.infinity.count): number {
  if (!state.infinityTree?.feat_3) return 0;
  const count = Math.max(0, Math.floor(infinityCount));
  let extra = 0;

  // Skill Cycle: +1 SP every third Infinity, once its conditions have been met.
  if (count > 0 && count % 3 === 0 && isInfinityMilestoneUnlocked(state, 'skill_cycle', count)) {
    extra += 1;
  }
  // Endless Momentum: +1 SP on every Infinity after this milestone is unlocked.
  if (isInfinityMilestoneUnlocked(state, 'endless_momentum', count)) {
    extra += 1;
  }
  return extra;
}

/** Convenience export for UI previews of the new passive PE generator bonus. */
export function getPassivePrestigeEnergyGeneratorMultiplier(state: GameState): Decimal {
  return getPassivePEGeneratorMultiplier(state);
}

