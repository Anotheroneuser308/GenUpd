import { Decimal } from './decimal';
import { GameState } from '../types/game';
import { getPassivePEGeneratorMultiplier, isInfinityMilestoneUnlocked, getUnlockedInfinityMilestonesCount } from './infinityMilestones';

// Prestige unlock threshold (1.00e18 Points)
export const PRESTIGE_REQUIREMENT = new Decimal(1e18);

export function getPrestigeRequirement(_state?: GameState): Decimal {
  return PRESTIGE_REQUIREMENT;
}

// Prestige Energy unlock threshold (1.00e154 Points)
export const PRESTIGE_ENERGY_THRESHOLD = new Decimal(1, 154);

/**
 * Price for the next Generator Energy Amplifier level. The first 10 levels
 * retain the original x2 price growth; each subsequent 10-level band raises
 * the per-level price multiplier by +0.1x (x2.1 after level 10, x2.2 after 20, etc.).
 */
export function getGeneratorEnergyAmplifierCost(currentLevel: number): Decimal {
  const level = Math.max(0, Math.floor(Number.isFinite(currentLevel) ? currentLevel : 0));
  let cost = Decimal.one();
  let levelsLeft = level;
  let band = 0;

  while (levelsLeft > 0) {
    const levelsInBand = Math.min(10, levelsLeft);
    const growthMultiplier = 2 + band * 0.1;
    cost = cost.mul(new Decimal(growthMultiplier).pow(levelsInBand));
    levelsLeft -= levelsInBand;
    band += 1;
  }

  return cost;
}

/** Next Energy Booster cost: starts at 10 PE and increases by x10 per level. */
export function getPrestigeEnergyBoosterCost(currentLevel: number): Decimal {
  const level = Math.max(0, Math.floor(Number.isFinite(currentLevel) ? currentLevel : 0));
  return new Decimal(10).pow(level + 1);
}

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
 * retains that entire bonus and adds a strongly softcapped x1.05 multiplier per extra Infinity.
 */
export function getInfinityGeneratorMultiplier(infinities: number): Decimal {
  const count = Math.max(0, Math.floor(Number.isFinite(infinities) ? infinities : 0));
  const beforeSoftcap = Math.min(count, 100);
  const afterSoftcap = Math.max(0, count - 100);

  const multiplier = new Decimal(2).pow(beforeSoftcap);
  return afterSoftcap > 0
    ? multiplier.mul(new Decimal(1.05).pow(afterSoftcap))
    : multiplier;
}

/**
 * Order of Magnitude Surge: each stack needs 6 OoMs up to 1e308 Points,
 * then each additional stack needs 20 more OoMs. No loss of stacks at the transition.
 */
export function getOrderMagnitudeSurgeIntervals(points: Decimal): number {
  if (points.lte(0)) return 0;
  const logPoints = Math.max(0, points.log10());
  if (logPoints <= 308) return Math.floor(logPoints / 6);
  return Math.floor(308 / 6) + Math.floor((logPoints - 308) / 20);
}

/**
 * The earliest log10(Points) at which an Order of Magnitude Surge interval is reached.
 * Used to preserve the full-strength Achievement Resonance bonuses earned before interval 308.
 */
export function getOrderMagnitudeSurgeLogThreshold(intervalCount: number): number {
  const intervals = Math.max(0, Math.floor(intervalCount));
  const initialIntervals = Math.floor(308 / 6);
  if (intervals <= initialIntervals) return intervals * 6;
  return 308 + (intervals - initialIntervals) * 20;
}

/**
 * Upgrade 10: Cosmic Resonance helper functions.
 * Every 10 total generator purchases multiplies each generator by 1.05x up to 1,000 purchases.
 * After 1,000 purchases, each group requires 50 total generator purchases instead of 10.
 */
export function getCosmicResonanceGroups(totalPurchases: number): number {
  if (totalPurchases < 10) return 0;
  if (totalPurchases <= 1000) {
    return Math.floor(totalPurchases / 10);
  }
  const baseGroups = 100; // 1000 / 10
  const extraPurchases = totalPurchases - 1000;
  const extraGroups = Math.floor(extraPurchases / 50);
  return baseGroups + extraGroups;
}

export function getCosmicResonanceMultiplier(totalPurchases: number): Decimal {
  const groups = getCosmicResonanceGroups(totalPurchases);
  return groups > 0 ? new Decimal(1.05).pow(groups) : Decimal.one();
}

/**
 * Achievement Resonance multiplier. Normal achievements and honorary achievements earned
 * before the 308th Order of Magnitude Surge interval retain the full x1.05 effect.
 * Honorary achievements earned after that point add a softer x1.01 each.
 */
export function getAchievementResonanceMultiplier(
  unlockedAchievements: number,
  honoraryAchievements: number,
): Decimal {
  const regular = Math.max(0, Math.floor(unlockedAchievements));
  const honorary = Math.max(0, Math.floor(honoraryAchievements));
  if (regular + honorary === 0) return Decimal.one();

  const softcapLogPoints = getOrderMagnitudeSurgeLogThreshold(308);
  const fullStrengthHonoraryCap = Math.floor(softcapLogPoints / 3);
  const fullStrengthHonorary = Math.min(honorary, fullStrengthHonoraryCap);
  const softenedHonorary = Math.max(0, honorary - fullStrengthHonoraryCap);
  return new Decimal(1.05).pow(regular + fullStrengthHonorary)
    .mul(new Decimal(1.01).pow(softenedHonorary));
}

/**
 * Combined Pre-Infinity generator multiplier from Tickspeed Induction and the repeatable node.
 */
export function getPreInfinityGeneratorMultiplier(state: GameState): Decimal {
  let multiplier = Decimal.one();
  if (state.infinityTree?.pre_4) {
    multiplier = multiplier.mul(getTotalTickspeedSpeed(state).pow(0.35));
  }
  const level = typeof state.infinityTree?.pre_5Level === 'number'
    ? Math.max(0, Math.floor(state.infinityTree.pre_5Level))
    : 0;
  if (level > 0) multiplier = multiplier.mul(1 + level);
  return multiplier;
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

  // Upgrade 10: Cosmic Resonance (every 10 purchases up to 1000 gives x1.05; after 1000, every 50 purchases gives x1.05).
  if (state.prestigeUpgrades?.cosmicResonance) {
    const totalPurchases = state.generators.reduce((sum, g) => sum + g.bought, 0);
    mult = mult.mul(getCosmicResonanceMultiplier(totalPurchases));
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

  // Upgrade 2: Achievement Resonance boosts all generators, including honorary achievements from Achievement Master.
  if (state.prestigeUpgrades?.achievementBoost) {
    const unlockedCount = Object.values(state.achievements).filter(Boolean).length;
    const masterBonus = getAchievementMasterCompletions(state);
    mult = mult.mul(getAchievementResonanceMultiplier(unlockedCount, masterBonus));
  }

  // Infinity Tree - Root Node (Infinity Nexus, 1 SP): 2^Infinities until 100, then an additional 1.05x per Infinity.
  const totalInfinities = state.infinity?.count || state.stats?.totalInfinities || 0;
  if (state.infinityTree?.root && totalInfinities > 0) {
    mult = mult.mul(getInfinityGeneratorMultiplier(totalInfinities));
  }

  // Infinity Tree - Temporal Surge: starts at x1.00 and adds +0.01x per second in the current Infinity.
  if (state.infinityTree?.pre_1) {
    const timeInf = state.stats?.timeThisInfinity || 0;
    const timeMult = 1 + (timeInf * 0.01);
    mult = mult.mul(new Decimal(timeMult));
  }

  // Pre-Infinity branch multipliers: Tickspeed Induction and repeatable Generator Amplification.
  mult = mult.mul(getPreInfinityGeneratorMultiplier(state));

  // Millennial Singularity: multiplies all generators by 1,000 per unlocked milestone.
  if (isInfinityMilestoneUnlocked(state, 'milestone_1000_gen_mult')) {
    const owned = getUnlockedInfinityMilestonesCount(state);
    if (owned > 0) {
      mult = mult.mul(new Decimal(1000).pow(owned));
    }
  }

  // Post-Infinity Upgrade 3: (IP + 1)^1.3 to all generators
  if (state.infinityTree?.post_3) {
    const ipPlus1 = (state.infinity?.points instanceof Decimal ? state.infinity.points : Decimal.zero()).add(1);
    mult = mult.mul(ipPlus1.pow(1.3));
  }

  // Post-Infinity Upgrade 4: Raises generator multipliers to ^1.02
  if (state.infinityTree?.post_4) {
    mult = mult.pow(1.02);
  }

  // Singularity Overdrive squares the multiplier from Singularity Resonance.
  if (state.infinity?.breakInfinityUpgrades?.singularityResonance && state.points.gt(new Decimal(1, 308))) {
    const oomAbove = Math.max(0, state.points.log10() - 308);
    if (oomAbove > 0) {
      const resonance = new Decimal(1 + 0.01 * oomAbove);
      mult = mult.mul(state.infinity.breakInfinityUpgrades?.singularityOverdrive ? resonance.pow(2) : resonance);
    }
  }

  // Hypercharge Overdrive improves the interval from 50 OoMs to 25 OoMs.
  if (state.infinity?.breakInfinityUpgrades?.hypercharge && state.points.gt(new Decimal(1, 308))) {
    const oomAbove = Math.max(0, state.points.log10() - 308);
    const interval = state.infinity.breakInfinityUpgrades?.hyperchargeOverdrive ? 25 : 50;
    const groups = Math.floor(oomAbove / interval);
    if (groups > 0) {
      mult = mult.mul(new Decimal(2).pow(groups));
    }
  }

  // Transcendent Cascade raises the final generator multiplier to ^1.05.
  if (state.infinity?.breakInfinityUpgrades?.transcendentCascade) {
    mult = mult.pow(1.05);
  }

  return mult;
}

/**
 * Tickspeed cost multiplier:
 * Normally 15x, but after 1e308 Points (or when tickspeed cost >= 1e308), scales by 300x!
 */
export function getTickspeedCostMult(state: GameState): Decimal {
  if (state.points.gte(new Decimal(1, 308)) || state.tickspeed.cost.gte(new Decimal(1, 308))) {
    return new Decimal(300);
  }
  return new Decimal(15);
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
  if (state.tickspeed?.cost instanceof Decimal && state.tickspeed.cost.gt(0)) {
    return state.tickspeed.cost;
  }
  const base = getTickspeedBaseCost(state);
  const mult = getTickspeedCostMult(state);
  return base.mul(mult.pow(state.tickspeed.bought));
}

/**
 * Current tickspeed rate multiplier:
 * Base is 1.10x, upgraded to 1.15x with Upgrade 7 (Chronos Flow).
 */
export function getTotalTickspeedSpeed(state: GameState): Decimal {
  const basePower = state.prestigeUpgrades?.chronosFlow ? 1.15 : state.tickspeed.multiplier;
  return new Decimal(basePower).pow(state.tickspeed.bought);
}

export function getAchievementMasterCompletions(state: GameState): number {
  if (!state.infinity?.achievementMaster) return 0;
  const p = state.points;
  if (!p || p.lte(0) || !p.mantissa) return 0;
  return Math.floor(Math.max(0, p.log10()) / 3);
}

/**
 * Points generation multiplier derived from Prestige Upgrades
 */
export function getPointsGenerationMultiplier(state: GameState): Decimal {
  let mult = Decimal.one();

  // Upgrade 1: x2 per 6 OoMs through 1e308, then x2 per additional 20 OoMs.
  if (state.prestigeUpgrades?.pointScaling && state.points.gte(1e6)) {
    const intervals = getOrderMagnitudeSurgeIntervals(state.points);
    if (intervals > 0) {
      mult = mult.mul(new Decimal(2).pow(intervals));
    }
  }

  // Upgrade 2: uses the same full-strength / softened honorary achievement bonus as generator multipliers.
  if (state.prestigeUpgrades?.achievementBoost) {
    const unlockedCount = Object.values(state.achievements).filter(Boolean).length;
    const masterBonus = getAchievementMasterCompletions(state);
    mult = mult.mul(getAchievementResonanceMultiplier(unlockedCount, masterBonus));
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

  // Break Infinity Upgrade 1: Limitless Expansion multiplies Points gained by (Points / 1e308)^0.03.
  if (state.infinity?.breakInfinityUpgrades?.limitless && state.points.gt(new Decimal(1, 308))) {
    const oomAbove = Math.max(0, state.points.log10() - 308);
    mult = mult.mul(new Decimal(10).pow(oomAbove * 0.03));
  }

  // Fractal Ignition adds a separate linear Points-generation multiplier per OoM above 1e308.
  if (state.infinity?.breakInfinityUpgrades?.fractalIgnition && state.points.gt(new Decimal(1, 308))) {
    const oomAbove = Math.max(0, state.points.log10() - 308);
    mult = mult.mul(new Decimal(1 + 0.01 * oomAbove));
  }

  // Absolute Horizon raises the complete Points-generation multiplier to ^1.05.
  if (state.infinity?.breakInfinityUpgrades?.absoluteHorizon) {
    mult = mult.pow(1.05);
  }

  return mult;
}

/**
 * Calculate Prestige Points gained on Prestige reset.
 * Requirement: 1.00e18 Points.
 * Formula: 10^(log10(Points) / 20), with a minimum requirement of 1e18 Points.
 * Pre-Infinity Node 3 multiplies PP gain by 3x.
 */
export function calculatePrestigePointsGain(points: Decimal, state?: GameState): Decimal {
  if (points.lt(PRESTIGE_REQUIREMENT)) {
    return Decimal.zero();
  }

  const logPoints = points.log10();
  // Exact requested formula: 10^(log10(Points) / 20).
  let gain = new Decimal(10).pow(logPoints / 20);
  if (gain.lt(1)) gain = Decimal.one();

  if (state?.infinityTree?.pre_3) {
    gain = gain.mul(3);
  }

  return gain;
}

/**
 * Calculate Prestige Energy currency gained on an Energy reset.
 * Exponential formula: 10^(log10(Points) / 154). At 1e154 Points, this grants 10 PE.
 * It is a currency reward only; it no longer directly multiplies existing generator power.
 */
export function calculatePrestigeEnergyGain(points: Decimal, state?: GameState): Decimal {
  if (points.lt(PRESTIGE_ENERGY_THRESHOLD)) return Decimal.zero();

  let gain = new Decimal(10).pow(points.log10() / 154);

  // Each Energy Booster level doubles Prestige Energy gained from this reset.
  const boosterLevel = Math.max(0, Math.floor(state?.prestigeEnergy?.boosterLevel || 0));
  if (boosterLevel > 0) gain = gain.mul(new Decimal(2).pow(boosterLevel));

  // Infinity Upgrade: PE gain is multiplied by (unspent SP + 1).
  if (state?.infinity?.energySPBoost) {
    gain = gain.mul(Math.max(1, (state.infinity.skillPoints || 0) + 1));
  }

  return gain;
}

/**
 * Temporal Infinity multiplier calculation.
 * Base: 1 + 0.002 * seconds in current Infinity.
 * Milestone 400: Strengthens Temporal Infinity multiplier by 5x!
 */
export function getTemporalInfinityMultiplier(state: GameState, infinityCountOverride?: number): number {
  if (!state.infinity?.timeIPBoost) return 1;
  const timeSec = Math.max(0, state.stats?.timeThisInfinity || 0);
  let timeMult = 1 + 0.002 * timeSec;
  const count = infinityCountOverride ?? (state.infinity?.count || 0);
  if (isInfinityMilestoneUnlocked(state, 'milestone_400_temporal_boost', count)) {
    timeMult = timeMult * 5;
  }
  return timeMult;
}

/**
 * Calculate Infinity Points granted by a Big Crunch / Infinity reset.
 * After Break Infinity, the base gain is 10^(log10(Points) / 308).
 * At 1e308 Points, this grants 10 IP.
 */
export function calculateInfinityPointGain(
  points: Decimal,
  state: GameState,
  infinityCount: number = state.infinity.count,
): Decimal {
  let gain = Decimal.one();

  if (state.infinityTree?.feat_4 && points.gte(INFINITY_THRESHOLD)) {
    gain = new Decimal(10).pow(points.log10() / 308);
    if (gain.lt(1)) gain = Decimal.one();
  }

  // Milestone 30: 1.5x multiplicative per milestone owned
  if (isInfinityMilestoneUnlocked(state, 'milestone_30_ip_boost', infinityCount)) {
    const owned = getUnlockedInfinityMilestonesCount(state, infinityCount);
    if (owned > 0) {
      gain = gain.mul(new Decimal(1.5).pow(owned));
    }
  }

  // Temporal Infinity Upgrade:
  if (state.infinity?.timeIPBoost) {
    const timeMult = getTemporalInfinityMultiplier(state, infinityCount);
    gain = gain.mul(timeMult);
  }

  // IP Doubler purchases:
  if (state.infinity?.ipDoublerLevel && state.infinity.ipDoublerLevel > 0) {
    gain = gain.mul(new Decimal(2).pow(state.infinity.ipDoublerLevel));
  }

  // Break Infinity Upgrade 4: Vacuum Momentum (+1% IP gain per OoM above 1e308)
  if (state.infinity?.breakInfinityUpgrades?.vacuumMomentum && points.gt(new Decimal(1, 308))) {
    const oomAbove = Math.max(0, points.log10() - 308);
    if (oomAbove > 0) {
      gain = gain.mul(new Decimal(1 + 0.01 * oomAbove));
    }
  }

  // Vacuum Cascade: additional IP gain scaling by 10^(0.1 * sqrt(OoMs above 1e308)).
  if (state.infinity?.breakInfinityUpgrades?.vacuumCascade && points.gt(new Decimal(1, 308))) {
    const oomAbove = Math.max(0, points.log10() - 308);
    if (oomAbove > 0) {
      gain = gain.mul(new Decimal(10).pow(Math.sqrt(oomAbove) * 0.1));
    }
  }

  const rounded = gain.round();
  return rounded.lt(1) ? Decimal.one() : rounded;
}

/** Extra Skill Points granted by the Infinity Milestones. */
export function getInfinityMilestoneExtraSP(state: GameState, infinityCount: number = state.infinity.count): number {
  if (!state.infinityTree?.feat_3) return 0;
  const count = Math.max(0, Math.floor(infinityCount));
  let extra = 0;

  // Milestone 200: +1 SP per milestone owned
  if (isInfinityMilestoneUnlocked(state, 'milestone_200_sp_boost', count)) {
    const owned = getUnlockedInfinityMilestonesCount(state, count);
    extra += owned * 1;
  }
  return extra;
}

/** Total Skill Points awarded upon Big Crunch / Infinity reset. */
export function calculateSkillPointsGain(state: GameState, infinityCount: number = state.infinity.count): number {
  const count = Math.max(0, Math.floor(infinityCount));
  const prestigeSPBonus = state.prestigeUpgrades?.prestigeSkillSynergy && state.prestige.count >= 10
    ? Math.max(0, Math.floor(Math.log10(Math.max(1, state.prestige.count))))
    : 0;
  let totalSP = 1 + prestigeSPBonus + getInfinityMilestoneExtraSP(state, count);

  // Infinity Upgrade: multiplies gained SP by 2x (cost: 1000 IP)
  if (state.infinity?.spDoublerUpgrade) {
    totalSP *= 2;
  }

  // Post-Infinity Upgrade 1:
  // "First: multiplies Skill Points gained from Points using the log10(Points) / 500 scaling."
  if (state.infinityTree?.post_1 && state.points.gt(1)) {
    const spMult = Math.max(1, state.points.log10() / 500);
    totalSP = Math.floor(totalSP * spMult);
  }

  return Math.max(1, totalSP);
}

/** Number of Infinities awarded upon Big Crunch / Infinity reset. */
export function calculateInfinitiesGain(state: GameState): number {
  let count = 1;
  // Post-Infinity Upgrade 2:
  // "Second: multiplies Infinities gained from Points using the log10(Points) / 60 scaling."
  if (state.infinityTree?.post_2 && state.points.gt(1)) {
    const infMult = Math.max(1, Math.floor(state.points.log10() / 60));
    count = infMult;
  }
  return count;
}

/** Convenience export for UI previews of the new passive PE generator bonus. */
export function getPassivePrestigeEnergyGeneratorMultiplier(state: GameState): Decimal {
  return getPassivePEGeneratorMultiplier(state);
}

