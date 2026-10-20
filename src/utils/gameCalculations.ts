import { Decimal } from './decimal';
import { GameState } from '../types/game';

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

/**
 * Returns the cost for the next generator purchase.
 * After 100 purchases, each tier uses a steeper price progression while keeping
 * the price continuous at the transition. These progression rules are internal
 * balancing mechanics and are intentionally not exposed in the game UI.
 */
export function getGeneratorCost(
  baseCost: Decimal,
  costMult: Decimal,
  bought: number,
  generatorId: number,
): Decimal {
  const purchaseCount = Math.max(0, Math.floor(bought));
  const earlyPurchases = Math.min(purchaseCount, 100);
  const acceleratedPurchases = Math.max(0, purchaseCount - 100);

  // Generator 1 accelerates from 10x to 1e3x per purchase.
  // Each following generator accelerates by one order of magnitude above its
  // original price multiplier (e.g. 1e2 -> 1e3, 1e3 -> 1e4).
  const originalMagnitude = Math.round(costMult.log10());
  const acceleratedMagnitude = generatorId === 1
    ? 3
    : Math.max(1, originalMagnitude + 1);
  const acceleratedCostMult = new Decimal(10).pow(acceleratedMagnitude);

  return baseCost
    .mul(costMult.pow(earlyPurchases))
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
  // Price scales x10 per purchase through the first 8 levels, then x40 per level.
  if (currentLevel <= 8) {
    return new Decimal(10).pow(currentLevel);
  }
  const base8 = new Decimal(10).pow(8);
  return base8.mul(new Decimal(40).pow(currentLevel - 8));
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
 * Infinity generator multiplier: 2^Infinities up to 1024 Infinities, then
 * retains that entire bonus and adds a softer x1.2 multiplier per extra Infinity.
 */
export function getInfinityGeneratorMultiplier(infinities: number): Decimal {
  const count = Math.max(0, Math.floor(Number.isFinite(infinities) ? infinities : 0));
  const beforeSoftcap = Math.min(count, 1024);
  const afterSoftcap = Math.max(0, count - 1024);

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

  // Prestige Energy Generators Multiplier (applies to ALL generators)
  if (state.prestigeEnergy?.multiplier && state.prestigeEnergy.multiplier.gt(1)) {
    mult = mult.mul(state.prestigeEnergy.multiplier);
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
    if (unlockedCount > 0) {
      mult = mult.mul(new Decimal(1.05).pow(unlockedCount));
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

  return gain;
}

/**
 * Calculate Prestige Energy Generators multiplier gained on Prestige Energy reset:
 * Unlocks at 1e154 Points.
 * Weakened multiplier curve: base x1.50, scaling gently with (points / 1e154)^0.016
 */
export function calculatePrestigeEnergyMultiplier(points: Decimal): Decimal {
  if (points.lt(PRESTIGE_ENERGY_THRESHOLD)) {
    return Decimal.zero();
  }

  const excessLog = Math.max(0, points.log10() - 154);
  const scaledFactor = Math.pow(10, excessLog / 60);
  const totalMult = 1.5 * Math.max(1, scaledFactor);

  return new Decimal(totalMult);
}
