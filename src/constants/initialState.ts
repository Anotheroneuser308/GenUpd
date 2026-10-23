import { Decimal } from '../utils/decimal';
import { GameState, GeneratorState } from '../types/game';

export const STORAGE_KEY = 'kosmos_prestige_v4';
export const STORAGE_BACKUP_KEY = 'kosmos_prestige_v4_backup';
export const STORAGE_PREV_BACKUP_KEY = 'kosmos_prestige_v4_prev_backup';

export const INITIAL_GENERATORS: () => GeneratorState[] = () => [
  {
    id: 1,
    name: 'Generator 1',
    amount: Decimal.zero(),
    bought: 0,
    baseCost: new Decimal(10),
    costMult: new Decimal(10),
    multiplier: Decimal.one(),
  },
  {
    id: 2,
    name: 'Generator 2',
    amount: Decimal.zero(),
    bought: 0,
    baseCost: new Decimal(100),
    costMult: new Decimal(100),
    multiplier: Decimal.one(),
  },
  {
    id: 3,
    name: 'Generator 3',
    amount: Decimal.zero(),
    bought: 0,
    baseCost: new Decimal(1e4),
    costMult: new Decimal(1e3),
    multiplier: Decimal.one(),
  },
  {
    id: 4,
    name: 'Generator 4',
    amount: Decimal.zero(),
    bought: 0,
    baseCost: new Decimal(1e6),
    costMult: new Decimal(1e4),
    multiplier: Decimal.one(),
  },
  {
    id: 5,
    name: 'Generator 5',
    amount: Decimal.zero(),
    bought: 0,
    baseCost: new Decimal(1e9),
    costMult: new Decimal(1e5),
    multiplier: Decimal.one(),
  },
  {
    id: 6,
    name: 'Generator 6',
    amount: Decimal.zero(),
    bought: 0,
    baseCost: new Decimal(1e13),
    costMult: new Decimal(1e6),
    multiplier: Decimal.one(),
  },
  {
    id: 7,
    name: 'Generator 7',
    amount: Decimal.zero(),
    bought: 0,
    baseCost: new Decimal(1e18),
    costMult: new Decimal(1e8),
    multiplier: Decimal.one(),
  },
  {
    id: 8,
    name: 'Generator 8',
    amount: Decimal.zero(),
    bought: 0,
    baseCost: new Decimal(1e24),
    costMult: new Decimal(1e10),
    multiplier: Decimal.one(),
  },
];

export const createInitialState = (): GameState => ({
  version: 5,
  points: new Decimal(10),
  pointsPerSecond: Decimal.zero(),
  generatorCostSoftcapBought: null,
  lastUpdate: Date.now(),

  generators: INITIAL_GENERATORS(),

  tickspeed: {
    bought: 0,
    baseCost: new Decimal(1e3),
    costMult: new Decimal(15),
    cost: new Decimal(1e3),
    multiplier: 1.10,
  },

  prestige: {
    count: 0,
    points: Decimal.zero(),
    unlockedGenerators: 4,
  },

  prestigeEnergy: {
    unlocked: false,
    amount: Decimal.zero(),
    totalEarned: Decimal.zero(),
    multiplier: Decimal.one(),
    generatorUpgradeLevel: 0,
    boosterLevel: 0,
    resets: 0,
  },

  prestigeUpgrades: {
    pointScaling: false,
    achievementBoost: false,
    cascadingBoostsLevel: 0,
    generatorUnlockLevel: 0,
    tickspeedDiscount: false,
    prestigeSynergy: false,
    amplifiedDoubling: false,
    chronosFlow: false,
    logarithmicCascade: false,
    cascadeSurge: false,
    cosmicResonance: false,
    prestigeSkillSynergy: false,
  },

  infinity: {
    count: 0,
    points: Decimal.zero(),
    skillPoints: 0,
    unlocked: false,
    ipDoublerLevel: 0,
    automationExpand: false,
    achievementMaster: false,
    ipGeneratorBoost: false,
    timeIPBoost: false,
    energySPBoost: false,
    totalEarnedIP: Decimal.zero(),
  },

  infinityTree: {},

  autobuyers: {
    gen1: { id: 'gen1', name: 'Auto: Generator 1', enabled: false, unlocked: false },
    gen2: { id: 'gen2', name: 'Auto: Generator 2', enabled: false, unlocked: false },
    gen3: { id: 'gen3', name: 'Auto: Generator 3', enabled: false, unlocked: false },
    gen4: { id: 'gen4', name: 'Auto: Generator 4', enabled: false, unlocked: false },
    gen5: { id: 'gen5', name: 'Auto: Generator 5', enabled: false, unlocked: false },
    gen6: { id: 'gen6', name: 'Auto: Generator 6', enabled: false, unlocked: false },
    gen7: { id: 'gen7', name: 'Auto: Generator 7', enabled: false, unlocked: false },
    gen8: { id: 'gen8', name: 'Auto: Generator 8', enabled: false, unlocked: false },
    tickspeed: { id: 'tickspeed', name: 'Auto: Tickspeed', enabled: false, unlocked: false },
    prestige: { id: 'prestige', name: 'Auto: Prestige', enabled: false, unlocked: false, target: 1, mode: 'targetPP', timeTarget: 60, ratioTarget: 2, previousPPGain: Decimal.zero() },
    autoPrestigeUpgrades: { id: 'autoPrestigeUpgrades', name: 'Auto: Prestige Upgrades', enabled: false, unlocked: false, priority: 'cheapest', buyAll: true },
    autoPrestigeEnergy: { id: 'autoPrestigeEnergy', name: 'Auto: Prestige Energy', enabled: false, unlocked: false, energyMode: 'target', energyTimeTarget: 60, energyTarget: 2, energyRatioTarget: 2, previousEnergyGain: Decimal.zero() },
    autoInfinity: { id: 'autoInfinity', name: 'Auto: Infinity', enabled: false, unlocked: false, infinityMode: 'targetIP', infinityTimeTarget: 60, infinityTarget: 1, infinityRatioTarget: 2, previousIPGain: Decimal.zero() },
  },

  achievements: {},

  stats: {
    totalTimePlayed: 0,
    onlineTimePlayed: 0,
    offlineTimePlayed: 0,
    sessionTimePlayed: 0,
    timeThisPrestige: 0,
    timeThisInfinity: 0,
    totalPrestiges: 0,
    fastestPrestige: Infinity,
    totalInfinities: 0,
    peakPointsRate: Decimal.zero(),
    totalManualClicks: 0,
    highestPointsEver: new Decimal(10),
    highestPPEver: Decimal.zero(),
    highestIPEver: Decimal.zero(),
    growthHistory: [],
  },

  settings: {
    language: 'en',
    notation: 'scientific',
    soundEnabled: true,
    autoSaveEnabled: true,
    autoSaveInterval: 5,
  },
});

export const serializeState = (state: GameState): string => {
  return JSON.stringify(state, (_key, value) => {
    if (value instanceof Decimal) {
      return { _isDecimal: true, m: value.mantissa, e: value.exponent };
    }
    return value;
  });
};

export const deserializeState = (raw: string): GameState | null => {
  try {
    const parsed = JSON.parse(raw, (_key, value) => {
      if (value && typeof value === 'object' && value._isDecimal) {
        return new Decimal(value.m, value.e);
      }
      return value;
    });

    const initial = createInitialState();
    return {
      ...initial,
      ...parsed,
      version: 5,
      generators: initial.generators.map((g, i) => {
        const saved = parsed.generators?.[i];
        if (!saved) return g;
        return {
          ...g,
          ...saved,
          amount: saved.amount instanceof Decimal ? saved.amount : new Decimal(saved.amount || 0),
          multiplier: saved.multiplier instanceof Decimal ? saved.multiplier : Decimal.one(),
          baseCost: g.baseCost,
          costMult: g.costMult,
        };
      }),
      points: (() => {
        const rawPoints = parsed.points instanceof Decimal ? parsed.points : new Decimal(parsed.points ?? 10);
        const hasGenAmount = parsed.generators?.some((g: { amount?: Decimal | number }) => {
          const amt = g.amount instanceof Decimal ? g.amount : new Decimal(g.amount || 0);
          return amt.gt(0);
        });
        if (rawPoints.lt(10) && !hasGenAmount) {
          return parsed.prestigeUpgrades?.tickspeedDiscount ? new Decimal(110) : new Decimal(10);
        }
        return rawPoints;
      })(),
      pointsPerSecond: parsed.pointsPerSecond instanceof Decimal ? parsed.pointsPerSecond : Decimal.zero(),
      generatorCostSoftcapBought: Array.isArray(parsed.generatorCostSoftcapBought) &&
        parsed.generatorCostSoftcapBought.length === initial.generators.length &&
        parsed.generatorCostSoftcapBought.every((value: unknown) => Number.isInteger(value) && (value as number) >= 0)
        ? parsed.generatorCostSoftcapBought
        : null,
      prestige: {
        ...initial.prestige,
        ...(parsed.prestige || {}),
        points: parsed.prestige?.points instanceof Decimal ? parsed.prestige.points : Decimal.zero(),
        unlockedGenerators: Math.max(
          4,
          Math.min(
            8,
            4 + (typeof parsed.prestigeUpgrades?.generatorUnlockLevel === 'number'
              ? parsed.prestigeUpgrades.generatorUnlockLevel
              : (parsed.prestigeUpgrades?.generatorDoublerLevel && parsed.prestigeUpgrades.generatorDoublerLevel >= 4
                  ? parsed.prestigeUpgrades.generatorDoublerLevel - 4
                  : 0))
          )
        ),
      },
      prestigeEnergy: {
        ...initial.prestigeEnergy,
        ...(parsed.prestigeEnergy || {}),
        amount: parsed.prestigeEnergy?.amount instanceof Decimal ? parsed.prestigeEnergy.amount : Decimal.zero(),
        totalEarned: parsed.prestigeEnergy?.totalEarned instanceof Decimal
          ? parsed.prestigeEnergy.totalEarned
          : (parsed.prestigeEnergy?.amount instanceof Decimal ? parsed.prestigeEnergy.amount : Decimal.zero()).add(
              new Decimal(2).pow(
                typeof parsed.prestigeEnergy?.generatorUpgradeLevel === 'number'
                  ? Math.max(0, Math.min(50, Math.floor(parsed.prestigeEnergy.generatorUpgradeLevel)))
                  : Math.max(0, Math.min(50, Math.floor(Math.max(0, (parsed.prestigeEnergy?.multiplier instanceof Decimal ? parsed.prestigeEnergy.multiplier.log10() : 0) / Math.log10(2))))),
              ).sub(1),
            ),
        multiplier: parsed.prestigeEnergy?.multiplier instanceof Decimal ? parsed.prestigeEnergy.multiplier : Decimal.one(),
        generatorUpgradeLevel: typeof parsed.prestigeEnergy?.generatorUpgradeLevel === 'number'
          ? Math.max(0, Math.min(50, Math.floor(parsed.prestigeEnergy.generatorUpgradeLevel)))
          : Math.max(0, Math.min(50, Math.floor(Math.max(0, (parsed.prestigeEnergy?.multiplier instanceof Decimal ? parsed.prestigeEnergy.multiplier.log10() : 0) / Math.log10(2))))),
      },
      prestigeUpgrades: {
        ...initial.prestigeUpgrades,
        ...(parsed.prestigeUpgrades || {}),
        cascadingBoostsLevel: typeof parsed.prestigeUpgrades?.cascadingBoostsLevel === 'number'
          ? parsed.prestigeUpgrades.cascadingBoostsLevel
          : (typeof (parsed.prestigeUpgrades as Record<string, unknown>)?.generatorDoublerLevel === 'number'
              ? ((parsed.prestigeUpgrades as Record<string, unknown>).generatorDoublerLevel as number)
              : 0),
        generatorUnlockLevel: typeof parsed.prestigeUpgrades?.generatorUnlockLevel === 'number'
          ? parsed.prestigeUpgrades.generatorUnlockLevel
          : (typeof (parsed.prestigeUpgrades as Record<string, unknown>)?.generatorDoublerLevel === 'number' &&
             ((parsed.prestigeUpgrades as Record<string, unknown>).generatorDoublerLevel as number) >= 4
              ? ((parsed.prestigeUpgrades as Record<string, unknown>).generatorDoublerLevel as number) - 4
              : 0),
      },
      infinity: {
        ...initial.infinity,
        ...(parsed.infinity || {}),
        points: parsed.infinity?.points instanceof Decimal ? parsed.infinity.points : Decimal.zero(),
        skillPoints: typeof parsed.infinity?.skillPoints === 'number'
          ? parsed.infinity.skillPoints
          : (typeof parsed.infinity?.count === 'number' ? parsed.infinity.count : 0),
        ipDoublerLevel: typeof parsed.infinity?.ipDoublerLevel === 'number' ? parsed.infinity.ipDoublerLevel : 0,
        automationExpand: !!parsed.infinity?.automationExpand,
        achievementMaster: !!parsed.infinity?.achievementMaster,
        ipGeneratorBoost: !!parsed.infinity?.ipGeneratorBoost,
        timeIPBoost: !!parsed.infinity?.timeIPBoost,
        energySPBoost: !!parsed.infinity?.energySPBoost,
        totalEarnedIP: parsed.infinity?.totalEarnedIP instanceof Decimal
          ? parsed.infinity.totalEarnedIP
          : (parsed.infinity?.points instanceof Decimal ? parsed.infinity.points : Decimal.zero()),
      },
      infinityTree: parsed.infinityTree && typeof parsed.infinityTree === 'object' ? parsed.infinityTree : {},
      autobuyers: {
        ...initial.autobuyers,
        ...(parsed.autobuyers || {}),
        prestige: {
          ...initial.autobuyers.prestige,
          ...(parsed.autobuyers?.prestige || {}),
          mode: ['time', 'targetPP', 'ppMultiplier'].includes(parsed.autobuyers?.prestige?.mode)
            ? parsed.autobuyers.prestige.mode
            : 'targetPP',
          target: typeof parsed.autobuyers?.prestige?.target === 'number' ? parsed.autobuyers.prestige.target : 1,
          timeTarget: typeof parsed.autobuyers?.prestige?.timeTarget === 'number' && parsed.autobuyers.prestige.timeTarget > 0
            ? parsed.autobuyers.prestige.timeTarget
            : 60,
          ratioTarget: typeof parsed.autobuyers?.prestige?.ratioTarget === 'number' && parsed.autobuyers.prestige.ratioTarget >= 1
            ? parsed.autobuyers.prestige.ratioTarget
            : 2,
          previousPPGain: parsed.autobuyers?.prestige?.previousPPGain instanceof Decimal
            ? parsed.autobuyers.prestige.previousPPGain
            : Decimal.zero(),
        },
        autoPrestigeUpgrades: {
          ...initial.autobuyers.autoPrestigeUpgrades,
          ...(parsed.autobuyers?.autoPrestigeUpgrades || {}),
          priority: ['cheapest', 'order'].includes(parsed.autobuyers?.autoPrestigeUpgrades?.priority)
            ? parsed.autobuyers.autoPrestigeUpgrades.priority
            : 'cheapest',
          buyAll: parsed.autobuyers?.autoPrestigeUpgrades?.buyAll !== false,
        },
        autoPrestigeEnergy: {
          ...initial.autobuyers.autoPrestigeEnergy,
          ...(parsed.autobuyers?.autoPrestigeEnergy || {}),
          energyMode: ['time', 'target', 'gainMultiplier'].includes(parsed.autobuyers?.autoPrestigeEnergy?.energyMode)
            ? parsed.autobuyers.autoPrestigeEnergy.energyMode
            : 'target',
          energyTimeTarget: typeof parsed.autobuyers?.autoPrestigeEnergy?.energyTimeTarget === 'number'
            ? parsed.autobuyers.autoPrestigeEnergy.energyTimeTarget
            : 60,
          energyTarget: typeof parsed.autobuyers?.autoPrestigeEnergy?.energyTarget === 'number'
            ? parsed.autobuyers.autoPrestigeEnergy.energyTarget
            : 2,
          energyRatioTarget: typeof parsed.autobuyers?.autoPrestigeEnergy?.energyRatioTarget === 'number'
            ? parsed.autobuyers.autoPrestigeEnergy.energyRatioTarget
            : 2,
          previousEnergyGain: parsed.autobuyers?.autoPrestigeEnergy?.previousEnergyGain instanceof Decimal
            ? parsed.autobuyers.autoPrestigeEnergy.previousEnergyGain
            : Decimal.zero(),
        },
        autoInfinity: {
          ...initial.autobuyers.autoInfinity,
          ...(parsed.autobuyers?.autoInfinity || {}),
          infinityMode: ['time', 'targetIP', 'ipMultiplier'].includes(parsed.autobuyers?.autoInfinity?.infinityMode)
            ? parsed.autobuyers.autoInfinity.infinityMode
            : 'targetIP',
          infinityTimeTarget: typeof parsed.autobuyers?.autoInfinity?.infinityTimeTarget === 'number'
            ? parsed.autobuyers.autoInfinity.infinityTimeTarget
            : 60,
          infinityTarget: typeof parsed.autobuyers?.autoInfinity?.infinityTarget === 'number'
            ? parsed.autobuyers.autoInfinity.infinityTarget
            : 1,
          infinityRatioTarget: typeof parsed.autobuyers?.autoInfinity?.infinityRatioTarget === 'number'
            ? parsed.autobuyers.autoInfinity.infinityRatioTarget
            : 2,
          previousIPGain: parsed.autobuyers?.autoInfinity?.previousIPGain instanceof Decimal
            ? parsed.autobuyers.autoInfinity.previousIPGain
            : Decimal.zero(),
        },
      },
      tickspeed: {
        ...initial.tickspeed,
        ...(parsed.tickspeed || {}),
        cost: parsed.tickspeed?.cost instanceof Decimal ? parsed.tickspeed.cost : initial.tickspeed.cost,
      },
      stats: {
        ...initial.stats,
        ...(parsed.stats || {}),
        totalTimePlayed: typeof parsed.stats?.totalTimePlayed === 'number' && Number.isFinite(parsed.stats.totalTimePlayed)
          ? Math.max(0, parsed.stats.totalTimePlayed)
          : 0,
        // Legacy saves did not split online/offline time. Preserve their existing total as online time.
        onlineTimePlayed: typeof parsed.stats?.onlineTimePlayed === 'number' && Number.isFinite(parsed.stats.onlineTimePlayed)
          ? Math.max(0, parsed.stats.onlineTimePlayed)
          : Math.max(0, typeof parsed.stats?.totalTimePlayed === 'number' ? parsed.stats.totalTimePlayed : 0),
        offlineTimePlayed: typeof parsed.stats?.offlineTimePlayed === 'number' && Number.isFinite(parsed.stats.offlineTimePlayed)
          ? Math.max(0, parsed.stats.offlineTimePlayed)
          : 0,
        // A reload starts a new session rather than restoring the previous session's counter.
        sessionTimePlayed: 0,
        timeThisInfinity: typeof parsed.stats?.timeThisInfinity === 'number' ? parsed.stats.timeThisInfinity : 0,
        peakPointsRate: parsed.stats?.peakPointsRate instanceof Decimal ? parsed.stats.peakPointsRate : Decimal.zero(),
        highestPointsEver: parsed.stats?.highestPointsEver instanceof Decimal ? parsed.stats.highestPointsEver : Decimal.zero(),
        highestPPEver: parsed.stats?.highestPPEver instanceof Decimal ? parsed.stats.highestPPEver : Decimal.zero(),
        highestIPEver: parsed.stats?.highestIPEver instanceof Decimal ? parsed.stats.highestIPEver : Decimal.zero(),
        growthHistory: Array.isArray(parsed.stats?.growthHistory)
          ? parsed.stats.growthHistory.slice(-120)
          : [],
      },
      settings: {
        ...initial.settings,
        ...(parsed.settings || {}),
        language: 'en',
        autoSaveEnabled: parsed.settings?.autoSaveEnabled !== false,
        autoSaveInterval:
          typeof parsed.settings?.autoSaveInterval === 'number' && parsed.settings.autoSaveInterval > 0
            ? parsed.settings.autoSaveInterval
            : 5,
      },
    };
  } catch {
    return null;
  }
};

/**
 * Robust Save System with automated backup rotation.
 * Rotates latest backup to prev_backup, and saves current state to primary and latest backup.
 */
export function saveStateWithBackup(state: GameState): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const serialized = serializeState(state);
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
      localStorage.setItem(STORAGE_PREV_BACKUP_KEY, existing);
    }
    localStorage.setItem(STORAGE_KEY, serialized);
    localStorage.setItem(STORAGE_BACKUP_KEY, serialized);
    return true;
  } catch (err) {
    console.error('Save failed:', err);
    return false;
  }
}

/**
 * Attempts to load from primary storage, falling back to backup if corrupted.
 */
export function loadStateSafe(): GameState {
  if (typeof window === 'undefined') return createInitialState();
  try {
    const primary = localStorage.getItem(STORAGE_KEY);
    if (primary) {
      const parsed = deserializeState(primary);
      if (parsed) return parsed;
    }

    const backup = localStorage.getItem(STORAGE_BACKUP_KEY);
    if (backup) {
      const parsed = deserializeState(backup);
      if (parsed) {
        console.warn('Recovered from latest backup save!');
        return parsed;
      }
    }

    const prevBackup = localStorage.getItem(STORAGE_PREV_BACKUP_KEY);
    if (prevBackup) {
      const parsed = deserializeState(prevBackup);
      if (parsed) {
        console.warn('Recovered from previous backup save!');
        return parsed;
      }
    }
  } catch (err) {
    console.error('Safe load failed:', err);
  }
  return createInitialState();
}
