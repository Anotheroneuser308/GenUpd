import { Decimal } from './decimal';
import { GameState, SupernovaUpgradeId } from '../types/game';
import { getPassivePEGeneratorMultiplier, isInfinityMilestoneUnlocked, getUnlockedInfinityMilestonesCount } from './infinityMilestones';
import { isStarMilestoneUnlocked } from '../constants/starMilestones';

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

// Player-facing Points softcap: 10^1,000,000 Points.
export const MY_SOFTCAP_THRESHOLD = new Decimal(1, 1_000_000);

/** Smooth production factor for a continuous ^0.95 Points softcap. */
export function getMySoftcapMultiplier(currentPoints: Decimal): Decimal {
  if (currentPoints.lt(MY_SOFTCAP_THRESHOLD)) return Decimal.one();
  const ordersAbove = Math.max(0, currentPoints.log10() - 1_000_000);
  return new Decimal(0.95).mul(new Decimal(10).pow(-0.05 * ordersAbove));
}

/**
 * Returns number of unlocked generators:
 * Initially 4, unlocked sequentially up to 8 via Generator Expander (Levels 1 to 4)
 */
export function getUnlockedGeneratorsCount(state: GameState): number {
  const unlockLvl = state.prestigeUpgrades?.generatorUnlockLevel || 0;
  return Math.min(8, Math.max(4, 4 + unlockLvl));
}

/** Thresholds are tracked per run; the game UI does not expose these balance rules. */
export const GENERATOR_COST_SOFTCAP_THRESHOLD = new Decimal(1, 100);
export const GENERATOR_COST_HARD_CAP_THRESHOLD = new Decimal(1, 500000);

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
  hardcapStartBought?: number | null,
): Decimal {
  const purchaseCount = Math.max(0, Math.floor(bought));
  let cost: Decimal;

  if (softcapStartBought === undefined || softcapStartBought === null) {
    cost = baseCost.mul(costMult.pow(purchaseCount));
  } else {
    const pivot = Math.max(0, Math.floor(softcapStartBought));
    const normalPurchases = Math.min(purchaseCount, pivot);
    const acceleratedPurchases = Math.max(0, purchaseCount - pivot);
    const originalMagnitude = Math.round(costMult.log10());
    const acceleratedMagnitude = generatorId === 1
      ? 3
      : Math.max(generatorId + 2, originalMagnitude + 1);
    const acceleratedCostMult = new Decimal(10).pow(acceleratedMagnitude);
    cost = baseCost
      .mul(costMult.pow(normalPurchases))
      .mul(acceleratedCostMult.pow(acceleratedPurchases));
  }

  // After the 1e500000 Points checkpoint, each purchase adds another x1e10
  // factor to the generator price curve beyond its captured purchase count.
  if (hardcapStartBought !== undefined && hardcapStartBought !== null) {
    const hardcapPivot = Math.max(0, Math.floor(hardcapStartBought));
    const purchasesBeyondHardcap = Math.max(0, purchaseCount - hardcapPivot);
    if (purchasesBeyondHardcap > 0) {
      cost = cost.mul(new Decimal(1, 10).pow(purchasesBeyondHardcap));
    }
  }
  return cost;
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

export const INFINITY_NEXUS_HARD_CAP = new Decimal(1, 500);
export const INFINITY_NEXUS_TIER1_MAX = 100;
// Infinities required in Tier 1 to reach a 1.00e200 multiplier:
// 2^100 * 1.01^39316 >= 1.0088e200 >= 1e200
export const INFINITY_NEXUS_TIER2_EXTRA = 39316;
export const INFINITY_NEXUS_TIER2_THRESHOLD = INFINITY_NEXUS_TIER1_MAX + INFINITY_NEXUS_TIER2_EXTRA; // 39,416 Infinities

/**
 * Infinity generator multiplier (Infinity Nexus):
 * - Base (up to 100 Infinities): 2^Infinities.
 * - Softcap 1 (100 to 39,416 Infinities): x1.01 per extra Infinity until multiplier reaches 1.00e200.
 * - Softcap 2 (after 1.00e200 multiplier, at >39,416 Infinities):
 *   Only counts every second Infinity (Math.floor(extra / 2)), each granting a x1.005 multiplier.
 */
export function getInfinityGeneratorMultiplier(infinities: number): Decimal {
  const count = Math.max(0, Math.floor(Number.isFinite(infinities) ? infinities : 0));
  if (count <= 0) return Decimal.one();

  if (count <= INFINITY_NEXUS_TIER1_MAX) {
    return new Decimal(2).pow(count);
  }

  const baseAtTier1 = new Decimal(2).pow(INFINITY_NEXUS_TIER1_MAX); // 2^100

  if (count <= INFINITY_NEXUS_TIER2_THRESHOLD) {
    const extraTier1 = count - INFINITY_NEXUS_TIER1_MAX;
    return baseAtTier1.mul(new Decimal(1.01).pow(extraTier1));
  }

  // Softcap 2: starts after 1e200 multiplier threshold (39,416 Infinities).
  // Counts every 2nd Infinity, multiplying by x1.005.
  const baseAtTier2 = baseAtTier1.mul(new Decimal(1.01).pow(INFINITY_NEXUS_TIER2_EXTRA));
  const extraTier2 = count - INFINITY_NEXUS_TIER2_THRESHOLD;
  const countedInfinities = Math.floor(extraTier2 / 2);
  const multiplier = countedInfinities > 0
    ? baseAtTier2.mul(new Decimal(1.005).pow(countedInfinities))
    : baseAtTier2;

  return multiplier.gt(INFINITY_NEXUS_HARD_CAP) ? INFINITY_NEXUS_HARD_CAP : multiplier;
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
  if (level > 0) {
    let boost = new Decimal(1 + level);
    if (state.infinityTree?.pre_6) {
      boost = boost.mul(new Decimal(1.1).pow(level));
    }
    multiplier = multiplier.mul(boost);
  }
  return multiplier;
}

/**
 * Multiplier for the IP Resonance infinity upgrade.
 * All generators scale with lifetime IP earned (including spent IP).
 * - Up to 1e308 IP: scales with base 3, 3^log10(IP).
 * - Above 1e308 IP: scales with base 1.25 for each additional magnitude above 1e308 (3^308 * 1.25^(log10(IP) - 308)).
 */
export function getIPResonanceMultiplier(totalEarnedIP: Decimal | undefined): Decimal {
  if (!totalEarnedIP || totalEarnedIP.lte(0)) return Decimal.one();
  const logIP = Math.max(0, totalEarnedIP.log10());
  if (logIP <= 308) {
    return new Decimal(3).pow(logIP);
  }
  const basePart = new Decimal(3).pow(308);
  const extraOom = logIP - 308;
  return basePart.mul(new Decimal(1.25).pow(extraOom));
}

/**
 * Multiplier for generator based on purchases, Upgrade 3A (Cascading Boosts), Upgrade 9, Prestige Energy,
 * and the Infinity Tree Root Node, which softcaps and hardcaps at 1e500.
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
  // Up to 1e308 IP: 3^log10(IP). Above 1e308 IP: 3^308 * 1.25^(log10(IP) - 308).
  if (state.infinity?.ipGeneratorBoost && state.infinity.totalEarnedIP?.gt(0)) {
    mult = mult.mul(getIPResonanceMultiplier(state.infinity.totalEarnedIP));
  }

  // Upgrade 2: Achievement Resonance boosts all generators, including honorary achievements from Achievement Master.
  if (state.prestigeUpgrades?.achievementBoost) {
    const unlockedCount = Object.values(state.achievements).filter(Boolean).length;
    const masterBonus = getAchievementMasterCompletions(state);
    mult = mult.mul(getAchievementResonanceMultiplier(unlockedCount, masterBonus));
  }

  // Infinity Tree - Root Node (Infinity Nexus): softcapped growth with a hard cap at 1e500.
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

  // Badass Singularity upgrades Resonance to +2% per OoM and raises its multiplier to ^7.77.
  if (state.infinity?.breakInfinityUpgrades?.singularityResonance && state.points.gt(new Decimal(1, 308))) {
    const oomAbove = Math.max(0, state.points.log10() - 308);
    if (oomAbove > 0) {
      const badassSingularity = !!state.infinity.breakInfinityUpgrades?.singularityOverdrive;
      const resonance = new Decimal(1 + (badassSingularity ? 0.02 : 0.01) * oomAbove);
      mult = mult.mul(badassSingularity ? resonance.pow(7.77) : resonance);
    }
  }

  // Dimension Hypercharge grants x2 per 50 OoMs above 1e308 Points.
  if (state.infinity?.breakInfinityUpgrades?.hypercharge && state.points.gt(new Decimal(1, 308))) {
    const oomAbove = Math.max(0, state.points.log10() - 308);
    const groups = Math.floor(oomAbove / 50);
    if (groups > 0) {
      mult = mult.mul(new Decimal(2).pow(groups));
    }
  }

  // Hypercharge Overdrive adds a separate generator multiplier with sublinear OoM scaling.
  if (state.infinity?.breakInfinityUpgrades?.hyperchargeOverdrive && state.points.gt(new Decimal(1, 308))) {
    const oomAbove = Math.max(0, state.points.log10() - 308);
    mult = mult.mul(new Decimal(10).pow(0.5 * Math.sqrt(oomAbove)));
  }

  // Transcendent Cascade raises the final generator multiplier to ^1.05.
  if (state.infinity?.breakInfinityUpgrades?.transcendentCascade) {
    mult = mult.pow(1.05);
  }

  // Stardust powers all generators with an exponent scaling gently from ^1.001
  if (state.stardust?.amount && state.stardust.amount.gt(0)) {
    const stardustExp = getStardustGeneratorExponent(state.stardust.amount, state);
    if (stardustExp > 1) {
      mult = mult.pow(stardustExp);
    }
  }

  // Constellation Harmonizer: multiplies all generators by 1 + stardust^5
  if (state.stardust?.constellationHarmonizer && state.stardust?.amount && state.stardust.amount.gt(0)) {
    const harmonizerMult = Decimal.one().add(state.stardust.amount.pow(5));
    mult = mult.mul(harmonizerMult);
  }

  // Stars Exponent Bonus: gentle linear generator exponent (+0.001 per Star, +0.0015 with Star Milestone 6)
  const starCount = Math.max(0, Math.floor(state.stardust?.stars || 0));
  if (starCount > 0) {
    const starExp = getStarGeneratorExponent(starCount, state);
    if (starExp > 0) {
      mult = mult.pow(1 + starExp);
    }
  }

  // Supernova Upgrade: Hypernova Pulse empowers reality with unspent Starlight
  if (state.stardust?.supernova?.upgrades?.hypernovaPulse) {
    const sl = state.stardust?.supernova?.starPower || Decimal.zero();
    mult = mult.mul(sl.add(1).pow(0.75));
  }

  return mult;
}

/**
 * Tickspeed cost multiplier:
 * Normally 15x. After 1e308 Points (or cost >= 1e308), scales by 300x.
 * After 25,000 purchases, increases by 1 order of magnitude from 300x to 3,000x!
 */
export function getTickspeedCostMult(state: GameState, boughtOverride?: number): Decimal {
  const bought = boughtOverride ?? (state.tickspeed?.bought || 0);
  if (bought >= 25000) {
    return new Decimal(3000);
  }
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
  let basePower = state.prestigeUpgrades?.chronosFlow ? 1.15 : state.tickspeed.multiplier;
  if (isInfinityMilestoneUnlocked(state, 'milestone_3350_tickspeed_boost')) {
    basePower += 0.02;
  }
  let total = new Decimal(basePower).pow(state.tickspeed.bought);
  return total;
}

export function getAchievementMasterCompletions(state: GameState): number {
  if (!state.infinity?.achievementMaster) return 0;
  const p = state.points;
  if (!p || p.lte(0) || !p.mantissa) return 0;
  return Math.floor(Math.max(0, p.log10()) / 3);
}

/**
 * Prestige Synergy multiplier: 1 + unspent Prestige Points up to 1e10 PP,
 * then a continuous power softcap with exponent 0.05 above that threshold.
 */
export function getPrestigeSynergyMultiplier(prestigePoints: Decimal): Decimal {
  if (!prestigePoints || prestigePoints.lte(0)) return Decimal.one();

  const threshold = new Decimal(1, 10);
  if (prestigePoints.gt(threshold)) {
    return new Decimal(1).add(threshold.mul(prestigePoints.div(threshold).pow(0.05)));
  }
  return prestigePoints.add(1);
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

  // Upgrade 5: Prestige Synergy uses the same multiplier shown in the Prestige UI.
  if (state.prestigeUpgrades?.prestigeSynergy) {
    mult = mult.mul(getPrestigeSynergyMultiplier(state.prestige.points));
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

  // Fractal Ignition: controlled sublinear scaling so it helps without overwhelming later upgrades.
  if (state.infinity?.breakInfinityUpgrades?.fractalIgnition && state.points.gt(new Decimal(1, 308))) {
    const oomAbove = Math.max(0, state.points.log10() - 308);
    mult = mult.mul(new Decimal(10).pow(0.01 * Math.pow(oomAbove, 0.8)));
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
 * Milestone 2500 raises PP gain to ^1.01.
 */
/**
 * Astral PP Infusion multiplier: multiplies PP gain dynamically by Stardust^0.25 (10^(0.25 * log10(Stardust + 1))).
 * At 1e105 Stardust, this grants +26.25 orders of magnitude (~1.78e26x) to PP gain.
 */
export function getAstralPPInfusionMultiplier(stardustAmount?: Decimal): Decimal {
  if (!stardustAmount || stardustAmount.lte(0)) return Decimal.one();
  const logStardust = Math.max(0, stardustAmount.log10());
  return new Decimal(10).pow(logStardust * 0.25);
}

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

  // Stardust Upgrade: Astral PP Infusion (1e105 Stardust) - dozens of orders of magnitude
  if (state?.stardust?.astralPPInfusion) {
    gain = gain.mul(getAstralPPInfusionMultiplier(state.stardust.amount));
  }

  if (state && isInfinityMilestoneUnlocked(state, 'milestone_2500_pp_power')) {
    gain = gain.pow(1.01);
  }

  return gain;
}

/**
 * Void Energy Siphon multiplier: multiplies PE gain dynamically by Stardust^0.12 (10^(0.12 * log10(Stardust + 1))).
 * At 1e130 Stardust, this grants +15.6 orders of magnitude (~3.98e15x) to PE gain.
 */
export function getVoidEnergySiphonMultiplier(stardustAmount?: Decimal): Decimal {
  if (!stardustAmount || stardustAmount.lte(0)) return Decimal.one();
  const logStardust = Math.max(0, stardustAmount.log10());
  return new Decimal(10).pow(logStardust * 0.12);
}

/**
 * Calculate Prestige Energy currency gained on an Energy reset.
 * Exponential formula: 10^(log10(Points) / 154). At 1e154 Points, this grants 10 PE.
 * It is a currency reward only; it no longer directly multiplies existing generator power.
 */
export function calculatePrestigeEnergyGain(points: Decimal, state?: GameState): Decimal {
  const rawGainAt = (targetPoints: Decimal): Decimal => {
    if (targetPoints.lt(PRESTIGE_ENERGY_THRESHOLD)) return Decimal.zero();
    let gain = new Decimal(10).pow(targetPoints.log10() / 154);
    const boosterLevel = Math.max(0, Math.floor(state?.prestigeEnergy?.boosterLevel || 0));
    if (boosterLevel > 0) gain = gain.mul(new Decimal(2).pow(boosterLevel));
    if (state?.infinity?.energySPBoost) {
      gain = gain.mul(Math.max(1, (state.infinity.skillPoints || 0) + 1));
    }
    // Stardust Upgrade: Void Energy Siphon (1e130 Stardust) - aggressively scales with Stardust
    if (state?.stardust?.voidEnergySiphon) {
      gain = gain.mul(getVoidEnergySiphonMultiplier(state?.stardust?.amount));
    }
    if (state) gain = gain.pow(getSupernovaPEMult(state));
    return gain;
  };

  let gain = rawGainAt(points);
  if (state && isStarMilestoneUnlocked(state.stardust?.stars || 0, 13)) {
    let previousClaimPoint = state.prestigeEnergy?.lastClaimedPointsForNonResetting || Decimal.zero();
    if (points.lt(previousClaimPoint)) {
      previousClaimPoint = Decimal.zero();
    }
    gain = gain.sub(rawGainAt(previousClaimPoint));
    if (gain.lt(0)) return Decimal.zero();
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

  // Break Infinity Upgrade 4: Vacuum Momentum (+1% IP gain per OoM; Badass Singularity upgrades it to +2% and ^7.77)
  if (state.infinity?.breakInfinityUpgrades?.vacuumMomentum && points.gt(new Decimal(1, 308))) {
    const oomAbove = Math.max(0, points.log10() - 308);
    if (oomAbove > 0) {
      const badassSingularity = !!state.infinity?.breakInfinityUpgrades?.singularityOverdrive;
      const momentum = new Decimal(1 + (badassSingularity ? 0.02 : 0.01) * oomAbove);
      gain = gain.mul(badassSingularity ? momentum.pow(7.77) : momentum);
    }
  }

  // Vacuum Cascade: additional IP gain scaling by 10^(0.1 * sqrt(OoMs above 1e308)).
  if (state.infinity?.breakInfinityUpgrades?.vacuumCascade && points.gt(new Decimal(1, 308))) {
    const oomAbove = Math.max(0, points.log10() - 308);
    if (oomAbove > 0) {
      gain = gain.mul(new Decimal(10).pow(Math.sqrt(oomAbove) * 0.1));
    }
  }

  gain = gain.pow(getSupernovaIPMult(state));
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

/**
 * Nebular Skill Matrix multiplier: multiplies SP gain dynamically by Stardust^0.15 (10^(0.15 * log10(Stardust + 1))).
 * At 1e115 Stardust, this grants +17.25 orders of magnitude (~1.78e17x) to SP gain.
 * At 1e160 Stardust, this grants +24 orders of magnitude (~1.00e24x) to SP gain, allowing dust_7 purchase.
 */
export function getNebularSkillMatrixMultiplier(stardustAmount?: Decimal): number {
  if (!stardustAmount || stardustAmount.lte(0)) return 1;
  const logStardust = Math.max(0, stardustAmount.log10());
  const exponent = Math.min(300, logStardust * 0.15);
  const mult = Math.pow(10, exponent);
  return Number.isFinite(mult) && mult > 1 ? mult : 1;
}

/** Total Skill Points awarded upon Big Crunch / Infinity reset. */
export function calculateSkillPointsGain(state: GameState, infinityCount: number = state.infinity.count): number {
  const count = Math.max(0, Math.floor(infinityCount));
  const prestigeSPBonus = state.prestigeUpgrades?.prestigeSkillSynergy && state.prestige.count >= 10
    ? Math.max(0, Math.floor(Math.log10(Math.max(1, state.prestige.count))))
    : 0;
  let totalSP = 1 + prestigeSPBonus + getInfinityMilestoneExtraSP(state, count);

  // Infinity Upgrade: multiplies gained SP by 2x (cost: 1000 IP) or repeatable Skill Amplification
  const spMult = getSkillAmplificationSPMultiplier(state);
  totalSP = Math.floor(totalSP * spMult);

  // Post-Infinity Upgrade 1:
  // "First: multiplies Skill Points gained from Points using the log10(Points) / 500 scaling."
  if (state.infinityTree?.post_1 && state.points.gt(1)) {
    const spScale = Math.max(1, state.points.log10() / 500);
    totalSP = Math.floor(totalSP * spScale);
  }

  // Post-Infinity Upgrade 5:
  // "Multiplies Skill Points gained by 1.3x per magnitude of unspent SP."
  if (state.infinityTree?.post_5) {
    const curSP = Math.max(0, state.infinity?.skillPoints ?? 0);
    const mag = curSP >= 10 ? Math.floor(Math.log10(curSP)) : 0;
    if (mag > 0) {
      totalSP = Math.floor(totalSP * Math.pow(1.3, mag));
    }
  }

  // Stardust Upgrade: Nebular Skill Matrix (1e115 Stardust) - aggressively scales with Stardust
  if (state.stardust?.nebularSkillMatrix) {
    const matrixMult = getNebularSkillMatrixMultiplier(state.stardust.amount);
    totalSP = Math.floor(totalSP * matrixMult);
  }

  return Math.max(1, totalSP);
}

/** Format Skill Points in standard numbers below 1,000,000 and scientific notation above. */
export function formatSkillPoints(value: number): string {
  if (value === 0 || Number.isNaN(value)) return '0';
  if (!Number.isFinite(value)) return value > 0 ? '∞' : '-∞';

  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  // Scientific notation begins only at 1,000,000 (1e6) and above
  if (abs < 1e6) {
    return `${sign}${Math.round(abs).toLocaleString('en-US')}`;
  }

  const absolute = new Decimal(abs);
  return `${sign}${absolute.mantissa.toFixed(2)}e${absolute.exponent}`;
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

/**
 * Stardust calculation helpers
 * Base rate: 0.01/s + 0.005/s per base upgrade level (doubled to +0.010/s with tree node dust_2).
 * Doubler: multiplies stardust gain by 2^doublerLevel.
 * Node dust_1: multiplies gained stardust by 1.1^baseUpgradeLevel.
 * Node dust_3: Stardust multiplies itself by log10(stardust)/3 (when stardust >= 10).
 * Milestone 100k Infinities: multiplies stardust production by 1.5x.
 * Stellar Radiance upgrade: +25% Stardust production per active Stardust softcap tier.
 * Online only: not generated offline.
 */
export function getStardustPerSecond(state: GameState): Decimal {
  if (!state.stardust?.unlocked && !state.infinityTree?.feat_6) return Decimal.zero();
  const baseLvl = Math.max(0, Math.floor(state.stardust?.baseUpgradeLevel || 0));

  // Node dust_2: doubles base Stardust rate gained from Stardust Base (+0.010/s instead of +0.005/s)
  let basePerLevel = state.infinityTree?.dust_2 ? 0.010 : 0.005;
  // Node dust_5: adds +0.025/s per level
  if (state.infinityTree?.dust_5) {
    basePerLevel += 0.025;
  }
  // Upgrade: Supernova Catalyst (2.5M Stardust) triples base upgrade contribution!
  if (state.stardust?.supernovaCatalyst) {
    basePerLevel *= 3;
  }
  const baseRate = 0.01 + basePerLevel * baseLvl;
  const doublerLvl = Math.max(0, Math.floor(state.stardust?.doublerLevel || 0));
  const doublerMult = doublerLvl <= 100
    ? new Decimal(2).pow(doublerLvl)
    : new Decimal(2).pow(100).mul(new Decimal(1.75).pow(doublerLvl - 100));
  let rate = new Decimal(baseRate).mul(doublerMult);

  // Node dust_1: multiplies gained Stardust by 1.1x per purchased Stardust Base level (1.1^level)
  if (state.infinityTree?.dust_1 && baseLvl > 0) {
    rate = rate.mul(new Decimal(1.1).pow(baseLvl));
  }

  // Node dust_3: Stardust multiplies its own production by log10(stardust)/3 (active when Stardust >= 10)
  if (state.infinityTree?.dust_3 && state.stardust?.amount && state.stardust.amount.gte(10)) {
    const selfMultiplier = Math.max(1, state.stardust.amount.log10() / 3);
    rate = rate.mul(new Decimal(selfMultiplier));
  }

  // 100k Infinities Milestone: multiplies Stardust production by 1.5x
  if (isInfinityMilestoneUnlocked(state, 'milestone_100000_stardust_boost')) {
    rate = rate.mul(1.5);
  }

  // Stardust Tab Upgrade: Stellar Radiance (2,500 Stardust)
  // Increases Stardust production by +25% per active Stardust softcap (each magnitude above 10)
  if (state.stardust?.stellarRadiance) {
    const activeSoftcaps = (state.stardust?.amount && state.stardust.amount.gt(10))
      ? Math.floor(state.stardust.amount.log10())
      : 0;
    if (activeSoftcaps > 0) {
      const radianceMultiplier = state.stardust?.radiantMultiplicity
        ? new Decimal(1.25).pow(activeSoftcaps)
        : new Decimal(1 + 0.25 * activeSoftcaps);
      rate = rate.mul(radianceMultiplier);
    }
  }

  // Upgrade: Cosmic Weaver (750k Stardust): multiplies Stardust by 1 + log10(totalInfinities + 1) * 0.25
  if (state.stardust?.cosmicWeaver) {
    const infCount = state.infinity?.count || state.stats?.totalInfinities || 0;
    const infLog = Math.log10(Math.max(1, infCount + 1));
    rate = rate.mul(1 + infLog * 0.25);
  }

  // Upgrade: Astral Convergence (10M Stardust): doubles current Stardust generation rate (2x)
  if (state.stardust?.astralConvergence) {
    rate = rate.mul(2);
  }

  // Stars Bonus: multiplies Stardust production by 2^stars (or 2.5^stars with Star Milestone 3, 3.0^stars with Milestone 50)
  const starCount = Math.max(0, Math.floor(state.stardust?.stars || 0));
  if (starCount > 0) {
    rate = rate.mul(getStarStardustMultiplier(starCount));
  }

  // Star Milestone 10: 10x Stardust production
  if (isStarMilestoneUnlocked(starCount, 10)) {
    rate = rate.mul(10);
  }

  // Star Milestone 20: 2x Stardust production
  if (isStarMilestoneUnlocked(starCount, 20)) {
    rate = rate.mul(2);
  }

  // Star Milestone 25: 1.25x per active softcap
  if (isStarMilestoneUnlocked(starCount, 25)) {
    const activeSoftcaps = (state.stardust?.amount && state.stardust.amount.gt(10))
      ? Math.floor(state.stardust.amount.log10())
      : 0;
    if (activeSoftcaps > 0) {
      rate = rate.mul(new Decimal(1.25).pow(activeSoftcaps));
    }
  }

  // Star Milestone 40: Solar Corona (50x Stardust, + 2x per bought Generator Expander level up to 16x)
  if (isStarMilestoneUnlocked(starCount, 40)) {
    const expander = Math.min(4, Math.max(0, state.prestigeUpgrades?.generatorUnlockLevel || 0));
    rate = rate.mul(50 * Math.pow(2, expander));
  }

  // Star Milestone 70: Quantum Flare (1 + log10(PE + 1))^1.5
  if (isStarMilestoneUnlocked(starCount, 70)) {
    const peAmount = state.prestigeEnergy?.amount;
    if (peAmount && peAmount.gt(0)) {
      const logPE = peAmount.log10();
      const peBonus = Math.pow(1 + Math.max(0, logPE), 1.5);
      if (Number.isFinite(peBonus) && peBonus > 1) {
        rate = rate.mul(new Decimal(peBonus));
      }
    }
  }

  // Star Milestone 80: Tachyon Resonance (10x Stardust)
  if (isStarMilestoneUnlocked(starCount, 80)) {
    rate = rate.mul(10);
  }

  // Star Milestone 90: Quasar Ignition (100x Stardust)
  if (isStarMilestoneUnlocked(starCount, 90)) {
    rate = rate.mul(100);
  }

  // Upgrade 1: Cosmic Luminescence triples Stardust production.
  if (state.stardust?.supernova?.upgrades?.cosmicCore) rate = rate.mul(3);
  // Upgrade 2: Stardust Rebirth multiplies production by ×5 plus +25% per Supernova.
  if (state.stardust?.supernova?.upgrades?.stardustRebirth) {
    const snCount = state.stardust.supernova.count || 0;
    rate = rate.mul(5 * (1 + 0.25 * snCount));
  }
  // Upgrade 4: Bulk Star Condensation multiplies Stardust production by ×10.
  if (state.stardust?.supernova?.upgrades?.neutronDensity) rate = rate.mul(10);
  // Supernova Upgrade: Stellar Genesis multiplies Stardust by 10x and adds +5% per forged Star.
  if (state.stardust?.supernova?.upgrades?.stellarGenesis) {
    rate = rate.mul(10).mul(new Decimal(1.05).pow(starCount));
  }
  return rate;
}

/**
 * Computes effective Stardust with a continuous per-magnitude softcap.
 * Base divisor is 10, reduced by tree nodes, star milestones, and upgrades.
 */
export function getEffectiveStardust(
  stardustAmount: Decimal,
  hasDust4: boolean = false,
  hasAstralFocus: boolean = false,
  hasSingularityRefraction: boolean = false,
  starCount: number = 0,
  hasDust7: boolean = false,
  hasMilestone60: boolean = false,
): Decimal {
  if (!stardustAmount || stardustAmount.lte(0)) return Decimal.zero();
  if (stardustAmount.lte(10)) return stardustAmount;

  let D = hasDust4 ? 9 : 10;
  if (hasAstralFocus) D -= 0.5;
  if (hasSingularityRefraction) D -= 2;
  if (hasMilestone60) D -= 1.0;
  if (hasDust7 && starCount > 0) {
    D -= Math.min(D - 4.0, starCount * 0.05);
  }
  D = Math.max(3.0, D);

  const magnitude = Math.floor(stardustAmount.log10());
  const normalTierCount = Math.min(Math.max(0, magnitude - 1), 8);
  const ratio = 10 / D;
  let effective = 10;

  // Geometric sum of completed tiers 1 through 8.
  if (normalTierCount > 0) {
    if (Math.abs(ratio - 1) < 1e-12) {
      effective += 9 * normalTierCount;
    } else {
      effective += 9 * ratio * (Math.pow(ratio, normalTierCount) - 1) / (ratio - 1);
    }
  }

  const strongerDivisor = D + 2;
  const strongerTierCount = Math.max(0, magnitude - 9);
  if (strongerTierCount > 0) {
    const firstStrongerTier = 9 * Math.pow(ratio, 8) * 10 / strongerDivisor;
    const shrinkRatio = 10 / strongerDivisor;
    if (Math.abs(shrinkRatio - 1) < 1e-12) {
      effective += firstStrongerTier * strongerTierCount;
    } else if (shrinkRatio < 1) {
      effective += firstStrongerTier
        * (1 - Math.pow(shrinkRatio, Math.min(100, strongerTierCount)))
        / (1 - shrinkRatio);
    } else {
      if (strongerTierCount > 200) {
        effective = 1e6;
      } else {
        const powVal = Math.pow(shrinkRatio, strongerTierCount);
        if (Number.isFinite(powVal)) {
          effective += firstStrongerTier * (powVal - 1) / (shrinkRatio - 1);
        } else {
          effective = 1e6;
        }
      }
    }
  }

  const partialNumerator = stardustAmount.sub(new Decimal(10).pow(magnitude));
  const partialDivisor = magnitude <= 8
    ? new Decimal(D).pow(magnitude)
    : new Decimal(D).pow(8).mul(new Decimal(strongerDivisor).pow(magnitude - 8));
  const partial = partialDivisor.gt(0) ? partialNumerator.div(partialDivisor) : Decimal.zero();

  const result = new Decimal(effective).add(partial);
  return Number.isFinite(result.mantissa) && Number.isFinite(result.exponent) ? result : new Decimal(1e6);
}

// Stardust exponent normally hardcaps at ^1.5; Cosmic Luminescence raises it to ^1.75.
export const STARDUST_EXPONENT_CAP = 1.5;
export const STARDUST_EXPONENT_CAP_WITH_COSMIC_LUMINESCENCE = 1.75;
export function getStardustGeneratorExponentCap(state?: GameState): number {
  return state?.stardust?.supernova?.upgrades?.cosmicCore
    ? STARDUST_EXPONENT_CAP_WITH_COSMIC_LUMINESCENCE
    : STARDUST_EXPONENT_CAP;
}

/** Generator exponent boost from Stardust, clamped to the active cap. */
export function getStardustGeneratorExponent(stardustAmount: Decimal, state?: GameState): number {
  if (!stardustAmount || stardustAmount.lte(0)) return 1.0;
  const hasDust4 = !!state?.infinityTree?.dust_4;
  const hasDust7 = !!state?.infinityTree?.dust_7;
  const hasAstralFocus = !!state?.stardust?.astralLens;
  const hasSingularityRefraction = !!state?.stardust?.singularityRefraction;
  const starCount = Math.max(0, Math.floor(state?.stardust?.stars || 0));
  const hasMilestone60 = isStarMilestoneUnlocked(starCount, 60);

  const effective = getEffectiveStardust(
    stardustAmount,
    hasDust4,
    hasAstralFocus,
    hasSingularityRefraction,
    starCount,
    hasDust7,
    hasMilestone60,
  );

  const effNum = Math.max(0, effective.toNumber());
  // Smooth progression from 1.0 toward 1.75
  let bonus = 0.75 * (1 - Math.exp(-effNum / 550));

  // Star Milestone 20: +0.025 flat
  if (isStarMilestoneUnlocked(starCount, 20)) {
    bonus += 0.025;
  }

  // Node dust_6: +0.001 per Star
  if (state?.infinityTree?.dust_6 && starCount > 0) {
    bonus += starCount * 0.001;
  }

  return Math.min(getStardustGeneratorExponentCap(state), 1 + (Number.isFinite(bonus) ? bonus : 0));
}

/** Stardust Doubler cost: 1 Stardust base, 4x per level (or 3.75x with Astral Convergence) */
export function getStardustDoublerCost(currentLevel: number, state?: GameState): Decimal {
  const level = Math.max(0, Math.floor(currentLevel));
  const base = state?.stardust?.astralConvergence ? 3.75 : 4;
  return new Decimal(base).pow(level);
}

/** Stardust Base cost: 1 Stardust base, 2x per level (or 1.75x with Star Milestone 8) */
export function getStardustBaseCost(currentLevel: number, state?: GameState): Decimal {
  const level = Math.max(0, Math.floor(currentLevel));
  const stars = state?.stardust?.stars || 0;
  const base = isStarMilestoneUnlocked(stars, 8) ? 1.75 : 2;
  return new Decimal(base).pow(level);
}

/**
 * Star Reset Cost:
 * Each Star normally increases the requirement by x100 (2 OoMs).
 * After 14 completed Stars, increases by 5 OoMs per Star (or 3.5 OoMs with Celestial Singularity).
 * After 30 completed Stars, increases by 10 OoMs per Star (or 6 OoMs with Celestial Singularity).
 * Milestone 90 (Quasar Ignition) further softens scaling past 80 Stars by 2 OoMs per Star.
 */
function getStarResetCostExponent(currentStars: number, state?: GameState): number {
  const stars = Math.max(0, Math.floor(currentStars));
  if (stars < 14) return 10 + 2 * stars;
  const hasSingularity = !!state?.stardust?.supernova?.upgrades?.celestialSingularity;
  const midTierSlope = hasSingularity ? 3.5 : 5.0;
  if (stars < 30) return 38 + midTierSlope * (stars - 14);

  const star30Exponent = 38 + midTierSlope * 16;
  const hasM30 = isStarMilestoneUnlocked(stars, 30);
  const lateStep = hasSingularity ? 6.0 : (hasM30 ? 8.5 : 10.0);
  return star30Exponent + lateStep * (stars - 30);
}

export function getStarResetCost(currentStars: number, state?: GameState): Decimal {
  let cost = new Decimal(10).pow(getStarResetCostExponent(currentStars, state));
  if (state?.stardust?.supernova?.upgrades?.hypernovaPulse) {
    cost = cost.mul(0.5);
  }
  return cost;
}

/** Total Stardust price of forging the next consecutive Stars. */
export function getTotalStarForgingCost(currentStars: number, count: number, state?: GameState): Decimal {
  let stars = Math.max(0, Math.floor(currentStars));
  let remaining = Math.max(0, Math.floor(count));
  let total = Decimal.zero();
  const geometricCostSum = (firstExponent: number, step: number, terms: number): Decimal => {
    if (terms <= 0) return Decimal.zero();
    const firstCost = new Decimal(10).pow(firstExponent);
    const ratio = new Decimal(10).pow(step);
    return firstCost.mul(ratio.pow(terms).sub(1)).div(ratio.sub(1));
  };
  const hasSingularity = !!state?.stardust?.supernova?.upgrades?.celestialSingularity;
  while (remaining > 0) {
    let segmentCount: number;
    let firstExponent: number;
    let step: number;
    if (stars < 14) {
      step = 2;
      firstExponent = 10 + 2 * stars;
      segmentCount = Math.min(remaining, 14 - stars);
    } else if (stars < 30) {
      step = hasSingularity ? 3.5 : 5.0;
      firstExponent = getStarResetCostExponent(stars, state);
      segmentCount = Math.min(remaining, 30 - stars);
    } else {
      const hasM30 = isStarMilestoneUnlocked(stars, 30);
      step = hasSingularity ? 6.0 : (hasM30 ? 8.5 : 10.0);
      firstExponent = getStarResetCostExponent(stars, state);
      segmentCount = remaining;
    }
    total = total.add(geometricCostSum(firstExponent, step, segmentCount));
    stars += segmentCount;
    remaining -= segmentCount;
  }
  if (state?.stardust?.supernova?.upgrades?.hypernovaPulse) {
    total = total.mul(0.5);
  }
  return total;
}

/** Maximum affordable batch using binary search instead of one calculation per Star. */
export function getMaxAffordableStarForgings(currentStars: number, stardustAmount: Decimal, state?: GameState): number {
  if (stardustAmount.lte(0)) return 0;
  const safetyLimit = 1_000_000;
  let low = 0;
  let high = 1;
  while (high < safetyLimit && getTotalStarForgingCost(currentStars, high, state).lte(stardustAmount)) {
    high = Math.min(safetyLimit, high * 2);
  }
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (getTotalStarForgingCost(currentStars, mid, state).lte(stardustAmount)) low = mid;
    else high = mid - 1;
  }
  return low;
}

/**
 * Star Generator Exponent Bonus:
 * Linear growth: +0.001 per Star (+0.0015 with Star Milestone 6, +0.001 extra with Star Forging Mastery).
 */
export function getStarGeneratorExponent(stars: number, state?: GameState): number {
  if (stars <= 0) return 0;
  let perStar = isStarMilestoneUnlocked(stars, 6) ? 0.0015 : 0.001;
  if (state?.stardust?.supernova?.upgrades?.starForgingMastery) {
    perStar += 0.001;
  }
  return stars * perStar;
}

/**
 * Star Stardust Production Multiplier:
 * 2^stars, boosted to 2.5^stars with Star Milestone 3, and 3.0^stars with Star Milestone 50.
 */
export function getStarStardustMultiplier(stars: number): Decimal {
  if (stars <= 0) return Decimal.one();
  let base = 2;
  if (isStarMilestoneUnlocked(stars, 50)) {
    base = 3.0;
  } else if (isStarMilestoneUnlocked(stars, 3)) {
    base = 2.5;
  }
  return new Decimal(base).pow(stars);
}

/** Starlight (SL) gained on Supernova: 3^(completed Supernovas + 1). */
export function getSupernovaStarlightGain(currentSupernovas: number): Decimal {
  return new Decimal(3).pow(Math.max(0, currentSupernovas) + 1).floor();
}

/** Significant power-based bonuses to IP and PE rewards from Supernova count and Starlight. */
export function getSupernovaIPMult(state: GameState): number {
  const count = Math.max(0, state.stardust?.supernova?.count || 0);
  if (count <= 0) return 1;
  const starlight = state.stardust?.supernova?.starPower || Decimal.zero();
  const countBonus = 0.10 * count;
  const starlightBonus = 0.05 * Math.max(0, starlight.add(1).log10());
  return 1 + countBonus + starlightBonus;
}

export function getSupernovaPEMult(state: GameState): number {
  const count = Math.max(0, state.stardust?.supernova?.count || 0);
  if (count <= 0) return 1;
  const starlight = state.stardust?.supernova?.starPower || Decimal.zero();
  const countBonus = 0.12 * count;
  const starlightBonus = 0.06 * Math.max(0, starlight.add(1).log10());
  return 1 + countBonus + starlightBonus;
}

/** Stardust production reward from Supernova removed as requested. */
export function getSupernovaStardustMult(_state: GameState): number {
  return 1;
}

export interface SupernovaUpgradeDef {
  id: SupernovaUpgradeId;
  name: string;
  cost: number;
  desc: string;
  icon: string;
}

export const SUPERNOVA_UPGRADES: Record<SupernovaUpgradeId, SupernovaUpgradeDef> = {
  cosmicCore: {
    id: 'cosmicCore',
    name: 'Cosmic Luminescence',
    cost: 3,
    desc: 'Raises the Stardust generator exponent hard cap from ^1.5 to ^1.75 and multiplies Stardust production by ×3.',
    icon: '🌌',
  },
  stardustRebirth: {
    id: 'stardustRebirth',
    name: 'Stardust Rebirth',
    cost: 9,
    desc: 'Multiplies Stardust production by ×5, plus an additional +25% per completed Supernova.',
    icon: '✨',
  },
  starForgingMastery: {
    id: 'starForgingMastery',
    name: 'Star Forging Mastery',
    cost: 27,
    desc: 'Stars grant an extra +0.001 to the generator exponent (+0.002 total), and each Star reset starts with 1,000 Stardust.',
    icon: '🌟',
  },
  neutronDensity: {
    id: 'neutronDensity',
    name: 'Bulk Star Condensation',
    cost: 81,
    desc: 'Multiplies Stardust production by ×10 and unlocks Forge Max Stars. Bulk forging spends the cumulative cost of all affordable Stars and preserves unspent Stardust.',
    icon: '⭐',
  },
  celestialSingularity: {
    id: 'celestialSingularity',
    name: 'Celestial Singularity',
    cost: 243,
    desc: 'Compresses cosmic distances: softens mid-tier Star cost scaling to +3.5 OoMs per Star, and reduces late-tier Star scaling (30+ Stars) from +10 down to +6 OoMs per Star.',
    icon: '🕳️',
  },
  stellarGenesis: {
    id: 'stellarGenesis',
    name: 'Stellar Genesis',
    cost: 729,
    desc: 'Multiplies Stardust production by ×10, and each forged Star gives an extra +5% compounding Stardust bonus.',
    icon: '🌌',
  },
  hypernovaPulse: {
    id: 'hypernovaPulse',
    name: 'Hypernova Pulse',
    cost: 2187,
    desc: 'Unspent Starlight empowers reality: multiplies all generator production by (1 + SL)^0.75, and halves Star forging Stardust costs (2× faster forging speed).',
    icon: '⚛️',
  },
};

/**
 * Skill Amplification helpers:
 * Level 0 = unbought (cost: 1,000 IP)
 * Level 1 = bought initial 1,000 IP upgrade (2x SP)
 * Level L (L >= 1) with pre_6 unlocked:
 * Next level cost = 1e120 IP base, scaling by 1e20 IP per level:
 * cost = 10^(120 + 20 * (L - 1)) IP
 * Each level multiplies SP gain by 2x (2^level).
 */
export function getSkillAmplificationLevel(state: GameState): number {
  if (typeof state.infinity?.spDoublerLevel === 'number') {
    return Math.max(0, state.infinity.spDoublerLevel);
  }
  return state.infinity?.spDoublerUpgrade ? 1 : 0;
}

export function getSkillAmplificationCost(level: number): Decimal {
  if (level <= 0) return new Decimal(1000);
  return new Decimal(10).pow(120 + 20 * (level - 1));
}

export function getSkillAmplificationSPMultiplier(state: GameState): number {
  const level = getSkillAmplificationLevel(state);
  if (level <= 0) return 1;
  return Math.pow(2, level);
}

/**
 * Cost in SP for Generator Amplification (pre_5) at a given level.
 * Up to level 1,000: costs level + 1 SP (1, 2, 3... 1,000 SP for buying level 1,000).
 * Beyond level 1,000: price growth scales by x1.1 per level instead of +1.
 * Level 1,000 (buying level 1,001) costs 1.10e3 SP, then x1.1 per level.
 */
export function getGeneratorAmplificationCost(currentLevel: number): number {
  const lvl = Math.max(0, Math.floor(Number.isFinite(currentLevel) ? currentLevel : 0));
  if (lvl < 1000) {
    return lvl + 1;
  }
  const extraLevels = lvl - 1000;
  const cost = 1000 * Math.pow(1.1, extraLevels + 1);
  // Avoid clamping at MAX_SAFE_INTEGER: it caused late MAX purchases to keep
  // charging a flat price. Infinity correctly marks a price as unaffordable.
  return Number.isFinite(cost) ? Math.round(cost) : Number.POSITIVE_INFINITY;
}

/**
 * Calculates maximum affordable Generator Amplification (pre_5) levels.
 * Handles arithmetic progression up to level 1,000 and geometric (x1.1) progression beyond.
 */
export function getMaxGeneratorAmplificationPurchases(
  currentLevel: number,
  availableSP: number
): { levelsToBuy: number; totalCost: number } {
  let sp = Math.max(0, Math.floor(Number.isFinite(availableSP) ? availableSP : 0));
  let lvl = Math.max(0, Math.floor(Number.isFinite(currentLevel) ? currentLevel : 0));
  let levelsToBuy = 0;
  let totalCost = 0;

  // Phase 1: Purchases up to level 1,000 (arithmetic progression)
  if (lvl < 1000) {
    const maxInPhase = 1000 - lvl;
    const discriminant = 2 * lvl + 1;
    let k = Math.max(0, Math.floor((-discriminant + Math.sqrt(discriminant * discriminant + 8 * sp)) / 2));
    k = Math.min(k, maxInPhase);
    const costForK = (count: number) => count * (lvl + 1) + count * (count - 1) / 2;
    while (k > 0 && costForK(k) > sp) k--;
    while (k < maxInPhase && costForK(k + 1) <= sp) k++;

    if (k > 0) {
      const c = costForK(k);
      sp -= c;
      totalCost += c;
      levelsToBuy += k;
      lvl += k;
    }
  }

  // Phase 2: Purchases beyond level 1,000 (1.1x geometric progression)
  while (lvl >= 1000) {
    const nextCost = getGeneratorAmplificationCost(lvl);
    if (sp < nextCost) break;
    sp -= nextCost;
    totalCost += nextCost;
    levelsToBuy++;
    lvl++;
    if (levelsToBuy >= 100000) break;
  }

  return { levelsToBuy, totalCost };
}

