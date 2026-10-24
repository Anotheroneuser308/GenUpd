import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, ToastNotification, Achievement, BreakInfinityUpgradeId } from '../types/game';
import { ACHIEVEMENTS } from '../constants/achievements';
import {
  createInitialState,
  serializeState,
  deserializeState,
  INITIAL_GENERATORS,
  STORAGE_KEY,
  STORAGE_BACKUP_KEY,
  STORAGE_PREV_BACKUP_KEY,
  saveStateWithBackup,
  loadStateSafe,
} from '../constants/initialState';
import { INFINITY_TREE_NODES } from '../constants/infinityTree';
import { Decimal } from '../utils/decimal';
import { sound } from '../utils/audio';
import {
  PRESTIGE_REQUIREMENT,
  PRESTIGE_ENERGY_THRESHOLD,
  INFINITY_THRESHOLD,
  GENERATOR_COST_SOFTCAP_THRESHOLD,
  getGeneratorCost,
  getGeneratorMultiplier,
  getTotalTickspeedSpeed,
  getPointsGenerationMultiplier,
  getTickspeedBaseCost,
  getTickspeedCost,
  getTickspeedCostMult,
  getCascadingBoostCost,
  MAX_CASCADING_BOOSTS,
  getGeneratorUnlockCost,
  MAX_GENERATOR_UNLOCKS,
  getUnlockedGeneratorsCount,
  calculatePrestigePointsGain,
  calculatePrestigeEnergyGain,
  getGeneratorEnergyAmplifierCost,
  getPrestigeEnergyBoosterCost,
  calculateInfinityPointGain,
  getInfinityMilestoneExtraSP,
  calculateSkillPointsGain,
  calculateInfinitiesGain,
  getStardustPerSecond,
  getStardustDoublerCost,
  getStardustBaseCost,
  getSkillAmplificationLevel,
  getSkillAmplificationCost,
  getGeneratorAmplificationCost,
  getMaxGeneratorAmplificationPurchases,
} from '../utils/gameCalculations';
import { isInfinityMilestoneUnlocked } from '../utils/infinityMilestones';


/**
 * Keeps a valid best Prestige time. Infinity/zero/invalid legacy values mean no record yet.
 */
function getUpdatedFastestPrestige(currentFastest: number, completedTime: number): number {
  if (!Number.isFinite(completedTime) || completedTime <= 0) return currentFastest;
  if (!Number.isFinite(currentFastest) || currentFastest <= 0) return completedTime;
  return Math.min(currentFastest, completedTime);
}

/**
 * Calculates the maximum number of consecutive geometric-cost purchases affordable
 * with a Decimal balance, without iterating once per level. Costs are firstCost,
 * firstCost * ratio, firstCost * ratio^2, and so on.
 */
function getMaxGeometricPurchases(
  balance: Decimal,
  firstCost: Decimal,
  ratio: Decimal,
): { count: number; totalCost: Decimal } {
  if (balance.lt(firstCost) || firstCost.lte(0)) {
    return { count: 0, totalCost: Decimal.zero() };
  }

  const ratioMinusOne = ratio.sub(1);
  if (ratio.lte(1) || ratioMinusOne.mantissa === 0) {
    // All repeatable upgrade costs in this game grow; keep a safe fallback for
    // malformed/legacy saves rather than trying to handle a non-growing series.
    let remaining = balance;
    let cost = firstCost;
    let count = 0;
    while (remaining.gte(cost) && count < 100000) {
      remaining = remaining.sub(cost);
      count += 1;
      cost = cost.mul(ratio);
    }
    return { count, totalCost: balance.sub(remaining) };
  }

  const estimateArgument = balance.div(firstCost).mul(ratioMinusOne).add(1);
  let count = Math.max(0, Math.floor(estimateArgument.log10() / ratio.log10()));
  const totalFor = (n: number) => firstCost.mul(ratio.pow(n).sub(1)).div(ratioMinusOne);

  // Correct for floating-point logarithm and Decimal rounding at the affordability boundary.
  let corrections = 0;
  while (count > 0 && totalFor(count).gt(balance) && corrections < 10000) {
    count -= 1;
    corrections += 1;
  }
  while (totalFor(count + 1).lte(balance) && corrections < 20000) {
    count += 1;
    corrections += 1;
  }

  return { count, totalCost: count > 0 ? totalFor(count) : Decimal.zero() };
}

export function useGameLoop() {
  const [gameState, setGameState] = useState<GameState>(() => {
    return loadStateSafe();
  });

  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);
  const [showInfinityOverlay, setShowInfinityOverlay] = useState<boolean>(false);
  const showInfinityOverlayRef = useRef<boolean>(false);
  showInfinityOverlayRef.current = showInfinityOverlay;
  const infinityTriggeredRef = useRef<boolean>(false);
  const proceedInfinityRef = useRef<() => void>(() => {});
  const lastInfinityResetTimeRef = useRef<number>(0);

  const stateRef = useRef<GameState>(gameState);
  stateRef.current = gameState;

  // Sync sound settings
  useEffect(() => {
    sound.enabled = gameState.settings.soundEnabled;
  }, [gameState.settings.soundEnabled]);

  // Automatically trigger the dramatic Infinity Collapse Overlay when 1.79e308 is reached (for first 10 Infinities)
  useEffect(() => {
    if (gameState.points.gte(INFINITY_THRESHOLD) && gameState.infinity.count < 10 && !showInfinityOverlay) {
      setShowInfinityOverlay(true);
      showInfinityOverlayRef.current = true;
      sound.playCollapse();
    }
  }, [gameState.points, gameState.infinity.count, showInfinityOverlay]);

  // Handle Offline Progress on Mount (Simulate ALL unlocked generators cascading downward)
  useEffect(() => {
    const now = Date.now();
    const last = stateRef.current.lastUpdate;
    const diffSec = Math.max(0, (now - last) / 1000);

    if (diffSec > 5) {
      const state = {
        ...stateRef.current,
        generators: stateRef.current.generators.map((g) => ({ ...g })),
      };

      // Cap simulated time to 3 days (259,200s)
      const simulatedSeconds = Math.min(diffSec, 86400 * 3);
      const initialPoints = state.points;

      // 100 discrete substeps accurately simulate cascading generator exponential growth
      const steps = Math.min(150, Math.max(20, Math.floor(simulatedSeconds)));
      const subDt = simulatedSeconds / steps;

      for (let s = 0; s < steps; s++) {
        state.stats.timeThisInfinity = (state.stats.timeThisInfinity || 0) + subDt;
        const unlockedCount = getUnlockedGeneratorsCount(state);
        const tickspeed = getTotalTickspeedSpeed(state);
        const pointsMult = getPointsGenerationMultiplier(state);

        // Update multipliers for each generator
        for (let i = 0; i < state.generators.length; i++) {
          state.generators[i].multiplier = getGeneratorMultiplier(i + 1, state);
        }

        // Cascade Generation: higher tiers produce lower tiers
        for (let i = unlockedCount - 1; i >= 1; i--) {
          const producer = state.generators[i];
          const receiver = state.generators[i - 1];
          if (producer.amount.gt(0)) {
            const produced = producer.amount.mul(producer.multiplier).mul(subDt);
            receiver.amount = receiver.amount.add(produced);
          }
        }

        // Generator 1 produces Points
        const gen1 = state.generators[0];
        if (gen1.amount.gt(0)) {
          const pointsRate = gen1.amount.mul(gen1.multiplier).mul(tickspeed).mul(pointsMult);
          state.points = state.points.add(pointsRate.mul(subDt));
        }

        if (state.generatorCostSoftcapBought === null && state.points.gte(GENERATOR_COST_SOFTCAP_THRESHOLD)) {
          state.generatorCostSoftcapBought = state.generators.map((generator) => generator.bought);
        }

      }

      const pointsGained = state.points.sub(initialPoints);
      state.stats.totalTimePlayed += simulatedSeconds;
      state.stats.offlineTimePlayed = (state.stats.offlineTimePlayed || 0) + simulatedSeconds;
      state.stats.timeThisPrestige += simulatedSeconds;
      state.lastUpdate = now;

      if (pointsGained.gt(0)) {
        const msg = `Welcome back! While you were away (${Math.floor(simulatedSeconds)}s), all active generators worked in cascade, producing ${pointsGained.format(state.settings.notation)} Points.`;
        setOfflineMessage(msg);
      }
      // Always persist the elapsed offline time and new lastUpdate, even when no generators produced Points.
      setGameState(state);
      saveStateWithBackup(state);
    }
  }, []);

  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = useCallback(
    (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastNotification = {
        ...toast,
        id,
        timestamp: Date.now(),
      };
      setToasts((prev) => [...prev.slice(-4), newToast]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Check achievements against current state
  const checkAchievements = useCallback((state: GameState): {
    updated: Record<string, boolean>;
    newAchievements: Achievement[];
  } => {
    const updated = { ...state.achievements };
    const newlyUnlockedIds: string[] = [];

    const check = (id: string, condition: boolean) => {
      if (!updated[id] && condition) {
        updated[id] = true;
        newlyUnlockedIds.push(id);
      }
    };

    check('first_step', state.generators[0].bought > 0);
    check('cascade_begins', state.generators[1].bought > 0);
    check('deep_production', state.generators[2].bought > 0);
    check('peak_tier', state.generators[3].bought > 0);
    check('tick_master', state.tickspeed.bought > 0);
    check('hundred_points', state.points.gte(100));
    check('thousand_points', state.points.gte(1000));
    check('million_points', state.points.gte(1e6));
    check('billion_points', state.points.gte(1e9));
    check('trillion_points', state.points.gte(1e12));
    check('prestige_ready', state.points.gte(PRESTIGE_REQUIREMENT));
    check('first_prestige', state.stats.totalPrestiges >= 1);
    // A speed achievement requires a real, recorded Prestige time. Zero/Infinity means no valid record.
    const hasRecordedPrestigeTime = Number.isFinite(state.stats.fastestPrestige) && state.stats.fastestPrestige > 0;
    check('speed_prestige', state.stats.totalPrestiges >= 1 && hasRecordedPrestigeTime && state.stats.fastestPrestige < 600);
    check('rapid_prestige', state.stats.totalPrestiges >= 1 && hasRecordedPrestigeTime && state.stats.fastestPrestige < 180);
    check('ten_prestiges', state.stats.totalPrestiges >= 10);
    check('hundred_prestige_points', state.prestige.points.gte(100));
    check('all_eight_gens', state.prestige.unlockedGenerators >= 8);
    check('prestige_energy', state.prestigeEnergy?.resets >= 1);
    check('reach_infinity', state.points.gte(INFINITY_THRESHOLD) || state.infinity.count >= 1);

    // New Achievements
    const totalGensBought = state.generators.reduce((sum, g) => sum + g.bought, 0);
    check('assembly_line', totalGensBought >= 25);

    const countPrestigeUpgs = (state.prestigeUpgrades.pointScaling ? 1 : 0) +
      (state.prestigeUpgrades.achievementBoost ? 1 : 0) +
      (state.prestigeUpgrades.tickspeedDiscount ? 1 : 0) +
      (state.prestigeUpgrades.prestigeSynergy ? 1 : 0) +
      (state.prestigeUpgrades.amplifiedDoubling ? 1 : 0) +
      (state.prestigeUpgrades.chronosFlow ? 1 : 0) +
      (state.prestigeUpgrades.logarithmicCascade ? 1 : 0) +
      (state.prestigeUpgrades.cascadeSurge ? 1 : 0) +
      (state.prestigeUpgrades.cosmicResonance ? 1 : 0) +
      (state.prestigeUpgrades.cascadingBoostsLevel || 0) +
      (state.prestigeUpgrades.generatorUnlockLevel || 0);
    check('upgrade_architect', countPrestigeUpgs >= 5);

    check('charged_core', !!state.prestigeEnergy?.amount && state.prestigeEnergy.amount.gte(10));
    check('triple_digit', state.points.gte(new Decimal(1, 100)));
    check('second_infinity', state.infinity.count >= 2 || state.stats.totalInfinities >= 2);
    check('return_ticket', state.infinity.count >= 10 || state.stats.totalInfinities >= 10);
    check('hundred_returns', state.infinity.count >= 100 || state.stats.totalInfinities >= 100);

    const tree = state.infinityTree || {};
    const treeUnlockedBeyondRoot = Object.keys(tree).some((k) => k !== 'root' && tree[k]);
    check('tree_climber', treeUnlockedBeyondRoot);

    const hasPre = ['pre_1', 'pre_2', 'pre_3', 'pre_4'].some((k) => tree[k]);
    const hasAuto = ['auto_1', 'auto_2', 'auto_3', 'auto_4', 'auto_5', 'auto_6'].some((k) => tree[k]);
    const hasFeat = ['feat_1', 'feat_2', 'feat_3', 'feat_4'].some((k) => tree[k]);
    check('three_paths', hasPre && hasAuto && hasFeat);

    check('machine_mind', !!tree['auto_3'] || !!state.autobuyers?.prestige?.unlocked);
    check('hyperautomation', !!tree['auto_4']);
    check('matrix_initiated', !!tree['feat_1']);
    check('breaking_point', !!tree['feat_4']);

    const newAchievements: Achievement[] = [];
    for (const id of newlyUnlockedIds) {
      const found = ACHIEVEMENTS.find((a) => a.id === id);
      if (found) newAchievements.push(found);
    }

    return { updated, newAchievements };
  }, []);

  // Main Loop with Background Execution (runs continuously when window is minimized or inactive)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let saveAccumulator = 0;
    let autoAccumulator = 0;
    let growthAccumulator = 0;

    // Create an inline Web Worker that ticks every 50ms even when the window is minimized or in the background
    let worker: Worker | null = null;
    try {
      if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
        const workerScript = `
          let timer = null;
          self.onmessage = function(e) {
            if (e.data === 'start') {
              if (!timer) {
                timer = setInterval(function() {
                  self.postMessage('tick');
                }, 50);
              }
            } else if (e.data === 'stop') {
              if (timer) {
                clearInterval(timer);
                timer = null;
              }
            }
          };
        `;
        const blob = new Blob([workerScript], { type: 'application/javascript' });
        worker = new Worker(URL.createObjectURL(blob));
        worker.postMessage('start');
      }
    } catch {
      worker = null;
    }

    const runSimulationStep = (dt: number) => {
      if (dt <= 0 || showInfinityOverlayRef.current) return;

      setGameState((prev) => {
        const state: GameState = {
          ...prev,
          generators: prev.generators.map((g) => ({ ...g })),
          tickspeed: { ...prev.tickspeed },
          prestige: { ...prev.prestige },
          prestigeEnergy: { ...prev.prestigeEnergy },
          prestigeUpgrades: { ...prev.prestigeUpgrades },
          infinity: { ...prev.infinity },
          autobuyers: Object.fromEntries(
            Object.entries(prev.autobuyers).map(([key, buyer]) => [key, { ...buyer }] as const)
          ),
          stats: { ...prev.stats },
          settings: { ...prev.settings },
        };

        // Dynamically compute unlocked generators from Cascading Doublers (4 up to 8)
        const unlockedCount = getUnlockedGeneratorsCount(state);
        state.prestige.unlockedGenerators = unlockedCount;

        const tickspeedSpeed = getTotalTickspeedSpeed(state);

        // Update multipliers for each generator
        for (let i = 0; i < state.generators.length; i++) {
          state.generators[i].multiplier = getGeneratorMultiplier(i + 1, state);
        }

        // Cascade Generation: Gen 8 -> Gen 7 -> ... -> Gen 1
        for (let i = unlockedCount - 1; i >= 1; i--) {
          const producer = state.generators[i];
          const receiver = state.generators[i - 1];
          if (producer.amount.gt(0)) {
            const produced = producer.amount.mul(producer.multiplier).mul(dt);
            receiver.amount = receiver.amount.add(produced);
          }
        }

        // Gen 1 produces Points
        const gen1 = state.generators[0];
        let pointsRate = Decimal.zero();
        if (gen1.amount.gt(0)) {
          const pointsMult = getPointsGenerationMultiplier(state);
          pointsRate = gen1.amount.mul(gen1.multiplier).mul(tickspeedSpeed).mul(pointsMult);
          state.points = state.points.add(pointsRate.mul(dt));
        }
        state.pointsPerSecond = pointsRate;

        // Anti-softlock safety: if player has 0 generators and cannot afford Generator 1 (< 10 points)
        if (state.points.lt(10) && state.generators.every((g) => g.amount.lte(0))) {
          const startingCapital = state.prestigeUpgrades?.tickspeedDiscount ? new Decimal(110) : new Decimal(10);
          state.points = startingCapital;
        }

        // Capture each generator's current purchase count once this run reaches 1e100 points.
        // The rule is intentionally kept out of all game-facing descriptions.
        if (state.generatorCostSoftcapBought === null && state.points.gte(GENERATOR_COST_SOFTCAP_THRESHOLD)) {
          state.generatorCostSoftcapBought = state.generators.map((generator) => generator.bought);
        }

        // Auto-unlock Prestige Energy flag once 1e154 is reached
        if (state.points.gte(PRESTIGE_ENERGY_THRESHOLD)) {
          state.prestigeEnergy.unlocked = true;
        }

        // Online Stardust generation (only active while game is open, not offline)
        if (state.infinityTree?.feat_6 || state.stardust?.unlocked) {
          if (!state.stardust) {
            state.stardust = {
              unlocked: true,
              amount: Decimal.zero(),
              totalEarned: Decimal.zero(),
              doublerLevel: 0,
              baseUpgradeLevel: 0,
            };
          } else {
            state.stardust.unlocked = true;
          }
          const stardustRate = getStardustPerSecond(state);
          state.stardust.amount = state.stardust.amount.add(stardustRate.mul(dt));
          state.stardust.totalEarned = state.stardust.totalEarned.add(stardustRate.mul(dt));
        }


        // Stats tracking
        state.stats.totalTimePlayed += dt;
        state.stats.onlineTimePlayed = (state.stats.onlineTimePlayed || 0) + dt;
        state.stats.sessionTimePlayed = (state.stats.sessionTimePlayed || 0) + dt;
        state.stats.timeThisPrestige += dt;
        state.stats.timeThisInfinity = (state.stats.timeThisInfinity || 0) + dt;
        if (pointsRate.gt(state.stats.peakPointsRate)) {
          state.stats.peakPointsRate = pointsRate;
        }
        if (state.points.gt(state.stats.highestPointsEver)) {
          state.stats.highestPointsEver = state.points;
        }

        // Growth History tracking (record every 2s, capped at 100 points)
        growthAccumulator += dt;
        if (growthAccumulator >= 2 || !state.stats.growthHistory || state.stats.growthHistory.length === 0) {
          growthAccumulator = 0;
          const currentHistory = state.stats.growthHistory ? [...state.stats.growthHistory] : [];
          const logVal = state.points.mantissa > 0 ? Math.max(0, state.points.log10()) : 0;

          currentHistory.push({
            timestamp: Date.now(),
            timePlayed: Math.floor(state.stats.totalTimePlayed),
            points: state.points.toNumber(),
            logPoints: Math.round(logVal * 100) / 100,
            formattedPoints: state.points.format(state.settings.notation),
            rate: pointsRate.mantissa > 0 ? Math.round(pointsRate.log10() * 100) / 100 : 0,
          });

          if (currentHistory.length > 100) {
            currentHistory.shift();
          }
          state.stats.growthHistory = currentHistory;
        }

        // Tree Node root auto-unlock if player has >= 1 Infinity
        if (state.infinity.count > 0 && !state.infinityTree?.root) {
          state.infinityTree = { ...(state.infinityTree || {}), root: true };
        }

        // Sync autobuyer unlocked status based on Tree Nodes
        if (state.infinityTree?.auto_1) {
          ['gen1', 'gen2', 'gen3', 'gen4'].forEach((k) => {
            if (state.autobuyers[k] && !state.autobuyers[k].unlocked) {
              state.autobuyers[k].unlocked = true;
            }
          });
        }
        if (state.infinityTree?.auto_2) {
          ['tickspeed', 'gen5', 'gen6', 'gen7', 'gen8'].forEach((k) => {
            if (state.autobuyers[k] && !state.autobuyers[k].unlocked) {
              state.autobuyers[k].unlocked = true;
            }
          });
        }
        if (state.infinityTree?.auto_3) {
          if (state.autobuyers['prestige'] && !state.autobuyers['prestige'].unlocked) {
            state.autobuyers['prestige'].unlocked = true;
          }
        }
        if (state.infinityTree?.auto_5) {
          if (state.autobuyers['autoPrestigeUpgrades'] && !state.autobuyers['autoPrestigeUpgrades'].unlocked) {
            state.autobuyers['autoPrestigeUpgrades'].unlocked = true;
          }
        }
        if (state.infinityTree?.auto_6) {
          if (state.autobuyers['autoPrestigeEnergy'] && !state.autobuyers['autoPrestigeEnergy'].unlocked) {
            state.autobuyers['autoPrestigeEnergy'].unlocked = true;
          }
        }
        if (state.infinityTree?.auto_7) {
          if (state.autobuyers['autoInfinity'] && !state.autobuyers['autoInfinity'].unlocked) {
            state.autobuyers['autoInfinity'].unlocked = true;
          }
        }

        // Check Infinity Threshold (1.79e308 Points)
        // If Break Infinity (feat_4) is NOT active, cap at 1.79e308
        if (!state.infinityTree?.feat_4 && state.points.gte(INFINITY_THRESHOLD)) {
          state.points = INFINITY_THRESHOLD;
        }

        // Autobuyers execution (every ~0.25s, or 0.05s with auto_4)
        const autoInterval = state.infinityTree?.auto_4 ? 0.05 : 0.25;
        autoAccumulator += dt;
        if (autoAccumulator >= autoInterval) {
          autoAccumulator = 0;

          // Branch 2 Node 9: Free Automation Matrix - autobuyers do not consume currency!
          const isFreeAuto = !!state.infinityTree?.auto_9;

          // Auto Generators (only unlocked tiers)
          for (let i = 0; i < unlockedCount; i++) {
            const abKey = `gen${i + 1}`;
            const ab = state.autobuyers[abKey];
            if (ab && ab.unlocked && ab.enabled) {
              const gen = state.generators[i];
              if (state.infinityTree?.auto_4) {
                // Quantum Autobuyer: Buy max available
                while (true) {
                  const cost = getGeneratorCost(gen.baseCost, gen.costMult, gen.bought, gen.id, state.generatorCostSoftcapBought?.[gen.id - 1] ?? null);
                  if (state.points.lt(cost)) break;
                  if (!isFreeAuto) {
                    state.points = state.points.sub(cost);
                  }
                  gen.amount = gen.amount.add(1);
                  gen.bought++;
                }
              } else {
                const cost = getGeneratorCost(gen.baseCost, gen.costMult, gen.bought, gen.id, state.generatorCostSoftcapBought?.[gen.id - 1] ?? null);
                if (state.points.gte(cost)) {
                  if (!isFreeAuto) {
                    state.points = state.points.sub(cost);
                  }
                  gen.amount = gen.amount.add(1);
                  gen.bought++;
                }
              }
            }
          }

          // Auto Tickspeed
          const autoTick = state.autobuyers['tickspeed'];
          if (autoTick && autoTick.unlocked && autoTick.enabled) {
            const tickMult = getTickspeedCostMult(state);
            state.tickspeed.costMult = tickMult;
            if (state.infinityTree?.auto_4) {
              while (state.points.gte(state.tickspeed.cost)) {
                if (!isFreeAuto) {
                  state.points = state.points.sub(state.tickspeed.cost);
                }
                state.tickspeed.bought++;
                const curMult = getTickspeedCostMult(state);
                state.tickspeed.costMult = curMult;
                state.tickspeed.cost = state.tickspeed.cost.mul(curMult);
              }
            } else {
              const tickCost = state.tickspeed.cost;
              if (state.points.gte(tickCost)) {
                if (!isFreeAuto) {
                  state.points = state.points.sub(tickCost);
                }
                state.tickspeed.bought++;
                const curMult = getTickspeedCostMult(state);
                state.tickspeed.costMult = curMult;
                state.tickspeed.cost = tickCost.mul(curMult);
              }
            }
          }

          // Auto Prestige (Branch 2 Node 3)
          const autoPres = state.autobuyers['prestige'];
          if (autoPres && autoPres.unlocked && autoPres.enabled) {
            const ppGain = calculatePrestigePointsGain(state.points, state);
            const rawTarget = typeof autoPres.target === 'number' ? autoPres.target : Number(autoPres.target || 1);
            const target = new Decimal(Math.max(1, isNaN(rawTarget) ? 1 : rawTarget));
            const mode = autoPres.mode || 'targetPP'; // Keeps existing saves on their previous behavior.
            const previousGain = autoPres.previousPPGain instanceof Decimal
              ? autoPres.previousPPGain
              : (typeof autoPres.previousPPGain === 'number' ? new Decimal(autoPres.previousPPGain) : Decimal.zero());
            const timeTarget = Math.max(1, autoPres.timeTarget || 60);
            const ratioTarget = Math.max(1.01, autoPres.ratioTarget || 2);
            let shouldPrestige = false;

            // Never reset until this run can actually award at least 1 PP.
            if (ppGain.gte(1)) {
              if (mode === 'time') {
                shouldPrestige = state.stats.timeThisPrestige >= timeTarget;
              } else if (mode === 'ppMultiplier') {
                if (previousGain.lte(0)) {
                  shouldPrestige = ppGain.gte(target);
                } else {
                  shouldPrestige = ppGain.gte(previousGain.mul(ratioTarget));
                }
              } else {
                // targetPP: triggers when PP gain reaches or exceeds the configured target
                shouldPrestige = ppGain.gte(target);
              }
            }

            if (shouldPrestige) {
              const totalPP = state.prestige.points.add(ppGain);
              const completedPrestigeTime = state.stats.timeThisPrestige;
              // Trigger automated Prestige and remember the gain for ratio mode.
              state.prestige.count++;
              state.prestige.points = totalPP;
              state.stats.totalPrestiges++;
              state.stats.fastestPrestige = getUpdatedFastestPrestige(state.stats.fastestPrestige, completedPrestigeTime);
              state.stats.highestPPEver = totalPP.gt(state.stats.highestPPEver) ? totalPP : state.stats.highestPPEver;
              state.autobuyers['prestige'] = { ...autoPres, previousPPGain: ppGain };
              state.stats.timeThisPrestige = 0;
              if (!state.infinityTree?.auto_10) {
                state.points = state.infinityTree?.pre_2 ? new Decimal(1e6) : (state.prestigeUpgrades?.tickspeedDiscount ? new Decimal(110) : new Decimal(10));
              }
              state.generators = INITIAL_GENERATORS();
              if (state.infinityTree?.pre_2) {
                for (let k = 0; k < 4; k++) {
                  state.generators[k].amount = new Decimal(1);
                  state.generators[k].bought = 1;
                }
              }
              state.tickspeed.bought = 0;
              state.tickspeed.cost = getTickspeedBaseCost(state);
            }
          }

          // Auto: Prestige Upgrades (Branch 2 Node 5)
          const autoPresUpg = state.autobuyers['autoPrestigeUpgrades'];
          if (autoPresUpg && autoPresUpg.unlocked && autoPresUpg.enabled) {
            const singleCosts: Record<string, number> = {
              pointScaling: 1,
              achievementBoost: 12,
              tickspeedDiscount: 2,
              prestigeSynergy: 5,
              amplifiedDoubling: 15,
              chronosFlow: 25,
              logarithmicCascade: 50,
              cascadeSurge: 100,
              cosmicResonance: 50,
              prestigeSkillSynergy: 1e8,
            };
            const upgsList = Object.entries(singleCosts);
            if (autoPresUpg.priority === 'cheapest') {
              upgsList.sort((a, b) => a[1] - b[1]);
            }
            for (const [id, costNum] of upgsList) {
              if (id === 'prestigeSkillSynergy' && !state.infinityTree?.feat_2) continue;
              if (!state.prestigeUpgrades[id as keyof typeof state.prestigeUpgrades]) {
                const cost = new Decimal(costNum);
                if (state.prestige.points.gte(cost)) {
                  if (!isFreeAuto) {
                    state.prestige.points = state.prestige.points.sub(cost);
                  }
                  (state.prestigeUpgrades as unknown as Record<string, unknown>)[id] = true;
                }
              }
            }
            if (autoPresUpg.buyAll !== false) {
              let bLvl = state.prestigeUpgrades.cascadingBoostsLevel || 0;
              while (bLvl < MAX_CASCADING_BOOSTS) {
                const cost = getCascadingBoostCost(bLvl);
                if (state.prestige.points.lt(cost)) break;
                if (!isFreeAuto) {
                  state.prestige.points = state.prestige.points.sub(cost);
                }
                bLvl++;
              }
              state.prestigeUpgrades.cascadingBoostsLevel = bLvl;

              let uLvl = state.prestigeUpgrades.generatorUnlockLevel || 0;
              while (uLvl < MAX_GENERATOR_UNLOCKS) {
                const cost = getGeneratorUnlockCost(uLvl);
                if (state.prestige.points.lt(cost)) break;
                if (!isFreeAuto) {
                  state.prestige.points = state.prestige.points.sub(cost);
                }
                uLvl++;
              }
              state.prestigeUpgrades.generatorUnlockLevel = uLvl;
            }
          }

          // Auto: PE Upgrades (Branch 2 Node 8, unlocked at 100 Infinities, cost: 50 SP, or autoPrestigeUpgrades)
          if ((state.infinityTree?.auto_8 || (autoPresUpg && autoPresUpg.unlocked && autoPresUpg.enabled)) && state.prestigeEnergy?.unlocked) {
            let pLvl = Math.max(0, Math.floor(state.prestigeEnergy.generatorUpgradeLevel || 0));
            while (true) {
              const cost = getGeneratorEnergyAmplifierCost(pLvl);
              if (state.prestigeEnergy.amount.lt(cost)) break;
              if (!isFreeAuto) {
                state.prestigeEnergy.amount = state.prestigeEnergy.amount.sub(cost);
              }
              pLvl++;
              state.prestigeEnergy.generatorUpgradeLevel = pLvl;
              if (!state.infinityTree?.auto_4) break;
            }

            let bLvl = Math.max(0, Math.floor(state.prestigeEnergy.boosterLevel || 0));
            while (true) {
              const cost = getPrestigeEnergyBoosterCost(bLvl);
              if (state.prestigeEnergy.amount.lt(cost)) break;
              if (!isFreeAuto) {
                state.prestigeEnergy.amount = state.prestigeEnergy.amount.sub(cost);
              }
              bLvl++;
              state.prestigeEnergy.boosterLevel = bLvl;
              if (!state.infinityTree?.auto_4) break;
            }
          }

          // Auto: Prestige Energy (Branch 2 Node 6)
          const autoEnergy = state.autobuyers['autoPrestigeEnergy'];
          if (autoEnergy && autoEnergy.unlocked && autoEnergy.enabled && state.points.gte(PRESTIGE_ENERGY_THRESHOLD)) {
            const gainedEnergy = calculatePrestigeEnergyGain(state.points, state);
            if (gainedEnergy.gte(1)) {
              const eMode = autoEnergy.energyMode || 'target';
              const eTimeTarget = Math.max(1, autoEnergy.energyTimeTarget || 60);
              const eTarget = Math.max(2, autoEnergy.energyTarget || 2);
              const eRatioTarget = Math.max(1.01, autoEnergy.energyRatioTarget || 2);
              const prevGain = autoEnergy.previousEnergyGain instanceof Decimal ? autoEnergy.previousEnergyGain : Decimal.zero();
              let shouldResetEnergy = false;
              if (eMode === 'time') {
                shouldResetEnergy = state.stats.timeThisPrestige >= eTimeTarget;
              } else if (eMode === 'gainMultiplier') {
                shouldResetEnergy = prevGain.gt(0) ? gainedEnergy.gte(prevGain.mul(eRatioTarget)) : gainedEnergy.gte(eTarget);
              } else {
                shouldResetEnergy = gainedEnergy.gte(eTarget);
              }

              if (shouldResetEnergy) {
                const newAmount = state.prestigeEnergy.amount.add(gainedEnergy);
                const newTotalEarned = (state.prestigeEnergy.totalEarned || state.prestigeEnergy.amount).add(gainedEnergy);
                const initial = createInitialState();
                state.points = new Decimal(10);
                state.generatorCostSoftcapBought = null;
                state.generators = INITIAL_GENERATORS();
                state.tickspeed = { ...initial.tickspeed };
                state.prestige = { count: 0, points: Decimal.zero(), unlockedGenerators: 4 };
                state.prestigeUpgrades = { ...initial.prestigeUpgrades };
                state.prestigeEnergy = {
                  unlocked: true,
                  amount: newAmount,
                  totalEarned: newTotalEarned,
                  multiplier: Decimal.one(),
                  generatorUpgradeLevel: state.prestigeEnergy.generatorUpgradeLevel || 0,
                  boosterLevel: state.prestigeEnergy.boosterLevel || 0,
                  resets: state.prestigeEnergy.resets + 1,
                };
                state.stats.timeThisPrestige = 0;
                state.autobuyers['autoPrestigeEnergy'] = {
                  ...autoEnergy,
                  previousEnergyGain: gainedEnergy,
                };
                if (state.autobuyers['prestige']) {
                  state.autobuyers['prestige'] = {
                    ...state.autobuyers['prestige'],
                    previousPPGain: Decimal.zero(),
                  };
                }
              }
            }
          }

          // Auto: Infinity (Branch 2 Node 7, unlocked via Milestone 1500)
          const autoInf = state.autobuyers['autoInfinity'];
          if (autoInf && autoInf.unlocked && autoInf.enabled && state.points.gte(INFINITY_THRESHOLD)) {
            const now = Date.now();
            const lastInfTime = state.infinity.lastInfinityTime ?? 0;
            const timeSinceLastInf = state.stats.timeThisInfinity || 0;

            // Enforce fast infinity cooldown of 0.1s (100ms)
            if (now - lastInfTime >= 100 && timeSinceLastInf >= 0.1) {
              const ipGain = calculateInfinityPointGain(state.points, state, state.infinity.count + 1);
              const infTarget = typeof autoInf.infinityTarget === 'number' ? autoInf.infinityTarget : 1;
              const infMode = autoInf.infinityMode || 'targetIP';
              const prevIPGain = autoInf.previousIPGain instanceof Decimal ? autoInf.previousIPGain : Decimal.zero();
              const infTimeTarget = Math.max(1, autoInf.infinityTimeTarget || 60);
              const infRatioTarget = Math.max(1.01, autoInf.infinityRatioTarget || 2);
              let shouldCrunch = false;

              if (infMode === 'time') {
                shouldCrunch = (state.stats.timeThisInfinity || 0) >= infTimeTarget;
              } else if (infMode === 'ipMultiplier') {
                shouldCrunch = prevIPGain.gt(0) ? ipGain.gte(prevIPGain.mul(infRatioTarget)) : ipGain.gte(infTarget);
              } else {
                shouldCrunch = ipGain.gte(infTarget);
              }

              if (shouldCrunch) {
                lastInfinityResetTimeRef.current = now;
                state.infinity.lastInfinityTime = now;
                state.autobuyers['autoInfinity'] = {
                  ...autoInf,
                  previousIPGain: ipGain,
                };
                setTimeout(() => {
                  proceedInfinityRef.current();
                }, 0);
              }
            }
          }
        }

        // Achievements check & Toast Notifications
        const { updated, newAchievements } = checkAchievements(state);
        state.achievements = updated;
        if (newAchievements.length > 0) {
          sound.playAchievement();
          newAchievements.forEach((ach) => {
            addToast({
              title: ach.name,
              message: ach.name,
              description: ach.desc,
              icon: '🏆',
              type: 'achievement',
            });
          });
        }

        // Auto Save to localStorage (if enabled in settings) with automated backup rotation
        if (state.settings.autoSaveEnabled) {
          saveAccumulator += dt;
          if (saveAccumulator >= state.settings.autoSaveInterval) {
            saveAccumulator = 0;
            state.lastUpdate = Date.now();
            saveStateWithBackup(state);
          }
        }

        return state;
      });
    };

    // When worker sends tick: if window is hidden / minimized, process background simulation
    if (worker) {
      worker.onmessage = () => {
        if (document.hidden) {
          const now = performance.now();
          const rawDt = (now - lastTime) / 1000;
          lastTime = now;
          if (rawDt > 0.01) {
            const maxStep = 0.25;
            const steps = Math.min(60, Math.ceil(rawDt / maxStep));
            const stepDt = rawDt / steps;
            for (let s = 0; s < steps; s++) {
              runSimulationStep(stepDt);
            }
          }
        }
      };
    }

    // Secondary interval heartbeat to guarantee active execution even if browser throttles workers
    const bgInterval = setInterval(() => {
      if (document.hidden) {
        const now = performance.now();
        const rawDt = (now - lastTime) / 1000;
        lastTime = now;
        if (rawDt > 0.05) {
          const maxStep = 0.25;
          const steps = Math.min(60, Math.ceil(rawDt / maxStep));
          const stepDt = rawDt / steps;
          for (let s = 0; s < steps; s++) {
            runSimulationStep(stepDt);
          }
        }
      }
    }, 100);

    // Main 60fps loop for active window
    const tick = (currentTime: number) => {
      if (!document.hidden) {
        const rawDt = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        const dt = Math.min(0.5, Math.max(0.001, rawDt));
        runSimulationStep(dt);
      }
      animId = requestAnimationFrame(tick);
    };

    // Immediate catch-up listener when window becomes visible or gains focus
    const handleFocusOrVisible = () => {
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      if (rawDt > 0.05) {
        // Step in increments of at most 0.25s up to 100 steps so cascading & autobuyers catch up cleanly
        const steps = Math.min(100, Math.ceil(rawDt / 0.25));
        const stepDt = rawDt / steps;
        for (let s = 0; s < steps; s++) {
          runSimulationStep(stepDt);
        }
      }
    };

    document.addEventListener('visibilitychange', handleFocusOrVisible);
    window.addEventListener('focus', handleFocusOrVisible);

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(bgInterval);
      if (worker) {
        worker.postMessage('stop');
        worker.terminate();
      }
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      window.removeEventListener('focus', handleFocusOrVisible);
    };
  }, [checkAchievements, addToast]);

  // Actions
  const buyGenerator = useCallback((id: number) => {
    setGameState((prev) => {
      const unlockedCount = getUnlockedGeneratorsCount(prev);
      if (id > unlockedCount) return prev;
      const genIndex = id - 1;
      const gen = prev.generators[genIndex];
      if (!gen) return prev;

      const cost = getGeneratorCost(gen.baseCost, gen.costMult, gen.bought, gen.id, prev.generatorCostSoftcapBought?.[gen.id - 1] ?? null);
      if (prev.points.lt(cost)) return prev;

      sound.playBuy();

      const newGenerators = prev.generators.map((g, idx) => {
        if (idx === genIndex) {
          return {
            ...g,
            amount: g.amount.add(1),
            bought: g.bought + 1,
          };
        }
        return g;
      });

      return {
        ...prev,
        points: prev.points.sub(cost),
        generators: newGenerators,
        stats: {
          ...prev.stats,
          totalManualClicks: prev.stats.totalManualClicks + 1,
        },
      };
    });
  }, []);

  const buyMaxGenerator = useCallback((id: number) => {
    setGameState((prev) => {
      const unlockedCount = getUnlockedGeneratorsCount(prev);
      if (id > unlockedCount) return prev;
      const genIndex = id - 1;
      const gen = prev.generators[genIndex];
      if (!gen) return prev;

      let currentPoints = prev.points;
      let currentAmount = gen.amount;
      let currentBought = gen.bought;
      let purchases = 0;

      while (true) {
        const cost = getGeneratorCost(gen.baseCost, gen.costMult, currentBought, gen.id, prev.generatorCostSoftcapBought?.[gen.id - 1] ?? null);
        if (currentPoints.lt(cost) || purchases >= 50) break;
        currentPoints = currentPoints.sub(cost);
        currentAmount = currentAmount.add(1);
        currentBought++;
        purchases++;
      }

      if (purchases === 0) return prev;
      sound.playBuy();

      const newGenerators = prev.generators.map((g, idx) => {
        if (idx === genIndex) {
          return { ...g, amount: currentAmount, bought: currentBought };
        }
        return g;
      });

      return {
        ...prev,
        points: currentPoints,
        generators: newGenerators,
      };
    });
  }, []);

  const buyTickspeed = useCallback(() => {
    setGameState((prev) => {
      const cost = prev.tickspeed.cost;
      if (prev.points.lt(cost)) return prev;

      sound.playBuy();
      const mult = getTickspeedCostMult(prev);
      const newBought = prev.tickspeed.bought + 1;
      const nextCost = cost.mul(mult);

      return {
        ...prev,
        points: prev.points.sub(cost),
        tickspeed: {
          ...prev.tickspeed,
          bought: newBought,
          costMult: mult,
          cost: nextCost,
        },
        stats: {
          ...prev.stats,
          totalManualClicks: prev.stats.totalManualClicks + 1,
        },
      };
    });
  }, []);

  // Buy as many Tickspeed levels as the current Points balance allows.
  const buyMaxTickspeed = useCallback(() => {
    setGameState((prev) => {
      const mult = getTickspeedCostMult(prev);
      const boughtNow = getMaxGeometricPurchases(
        prev.points,
        prev.tickspeed.cost,
        mult,
      );
      if (boughtNow.count === 0) return prev;

      sound.playBuy();
      const bought = prev.tickspeed.bought + boughtNow.count;
      const cost = prev.tickspeed.cost.mul(mult.pow(boughtNow.count));
      return {
        ...prev,
        points: prev.points.sub(boughtNow.totalCost),
        tickspeed: { ...prev.tickspeed, bought, costMult: mult, cost },
      };
    });
  }, []);

  const buyMaxAll = useCallback(() => {
    setGameState((prev) => {
      let currentPoints = prev.points;
      const newGenerators = prev.generators.map((g) => ({ ...g }));
      const unlockedCount = getUnlockedGeneratorsCount(prev);
      let didBuy = false;

      // Buy Tickspeed
      let tickBought = prev.tickspeed.bought;
      let tickCost = prev.tickspeed.cost;
      let tickMult = getTickspeedCostMult(prev);
      while (currentPoints.gte(tickCost)) {
        currentPoints = currentPoints.sub(tickCost);
        tickBought++;
        tickMult = (currentPoints.gte(new Decimal(1, 308)) || tickCost.gte(new Decimal(1, 308)))
          ? new Decimal(300)
          : new Decimal(15);
        tickCost = tickCost.mul(tickMult);
        didBuy = true;
      }

      // Buy all unlocked generators
      for (let i = unlockedCount - 1; i >= 0; i--) {
        const g = newGenerators[i];
        while (true) {
          const cost = getGeneratorCost(g.baseCost, g.costMult, g.bought, g.id, prev.generatorCostSoftcapBought?.[g.id - 1] ?? null);
          if (currentPoints.lt(cost)) break;
          currentPoints = currentPoints.sub(cost);
          g.amount = g.amount.add(1);
          g.bought++;
          didBuy = true;
        }
      }

      if (!didBuy) return prev;
      sound.playBuy();

      return {
        ...prev,
        points: currentPoints,
        generators: newGenerators,
        tickspeed: {
          ...prev.tickspeed,
          bought: tickBought,
          cost: tickCost,
        },
      };
    });
  }, []);

  const performPrestige = useCallback(() => {
    setGameState((prev) => {
      const ppGain = calculatePrestigePointsGain(prev.points, prev);
      if (ppGain.lt(1)) return prev;

      sound.playCollapse();

      const totalPrestiges = prev.stats.totalPrestiges + 1;
      const fastest = getUpdatedFastestPrestige(prev.stats.fastestPrestige, prev.stats.timeThisPrestige);
      const resetGenerators = INITIAL_GENERATORS();
      const newPP = prev.prestige.points.add(ppGain);

      const baseTickCost = prev.prestigeUpgrades.tickspeedDiscount ? new Decimal(10) : new Decimal(1000);
      let startingPoints = prev.infinityTree?.auto_10
        ? prev.points
        : (prev.prestigeUpgrades.tickspeedDiscount ? new Decimal(110) : new Decimal(10));
      if (!prev.infinityTree?.auto_10 && prev.infinityTree?.pre_2) {
        startingPoints = new Decimal(1e6);
        for (let i = 0; i < 4; i++) {
          resetGenerators[i].amount = new Decimal(1);
          resetGenerators[i].bought = 1;
        }
      }

      return {
        ...prev,
        points: startingPoints,
        generatorCostSoftcapBought: null,
        prestige: {
          ...prev.prestige,
          count: prev.prestige.count + 1,
          points: newPP,
        },
        tickspeed: {
          ...prev.tickspeed,
          bought: 0,
          cost: baseTickCost,
        },
        generators: resetGenerators,
        autobuyers: {
          ...prev.autobuyers,
          prestige: prev.autobuyers.prestige
            ? { ...prev.autobuyers.prestige, previousPPGain: ppGain }
            : prev.autobuyers.prestige,
        },
        stats: {
          ...prev.stats,
          totalPrestiges,
          fastestPrestige: fastest,
          timeThisPrestige: 0,
          highestPPEver: newPP.gt(prev.stats.highestPPEver) ? newPP : prev.stats.highestPPEver,
        },
      };
    });
  }, []);

  // Mini-reset: Prestige Energy
  // Resets everything prior to Prestige Energy (including prestige points, prestige count, and ALL prestige upgrades)
  // in exchange for Prestige Energy currency; generator boosts are purchased separately.
  const performPrestigeEnergy = useCallback(() => {
    setGameState((prev) => {
      if (prev.points.lt(PRESTIGE_ENERGY_THRESHOLD)) return prev;

      const gainedEnergy = calculatePrestigeEnergyGain(prev.points, prev);
      if (gainedEnergy.lt(1)) return prev;

      sound.playBoost();

      const newAmount = prev.prestigeEnergy.amount.add(gainedEnergy);
      const newTotalEarned = (prev.prestigeEnergy.totalEarned || prev.prestigeEnergy.amount).add(gainedEnergy);
      const initial = createInitialState();

      return {
        ...prev,
        points: new Decimal(10),
        generatorCostSoftcapBought: null,
        generators: INITIAL_GENERATORS(),
        tickspeed: {
          ...initial.tickspeed,
        },
        prestige: {
          count: 0,
          points: Decimal.zero(),
          unlockedGenerators: 4,
        },
        prestigeUpgrades: {
          ...initial.prestigeUpgrades,
        },
        prestigeEnergy: {
          unlocked: true,
          amount: newAmount,
          totalEarned: newTotalEarned,
          multiplier: Decimal.one(),
          generatorUpgradeLevel: prev.prestigeEnergy.generatorUpgradeLevel || 0,
          boosterLevel: prev.prestigeEnergy.boosterLevel || 0,
          resets: prev.prestigeEnergy.resets + 1,
        },
        autobuyers: {
          ...prev.autobuyers,
          prestige: prev.autobuyers.prestige
            ? { ...prev.autobuyers.prestige, previousPPGain: Decimal.zero() }
            : prev.autobuyers.prestige,
        },
        stats: {
          ...prev.stats,
          timeThisPrestige: 0,
        },
      };
    });
  }, []);

  // Purchase a Prestige Energy upgrade: each level doubles all generator production.
  // Unlike the old reset-based multiplier, these levels only increase when PE is spent.
  const buyPrestigeEnergyUpgrade = useCallback(() => {
    setGameState((prev) => {
      const level = Math.max(0, Math.floor(prev.prestigeEnergy.generatorUpgradeLevel || 0));
      const cost = getGeneratorEnergyAmplifierCost(level);
      if (prev.prestigeEnergy.amount.lt(cost)) return prev;

      sound.playBuy();
      const nextState: GameState = {
        ...prev,
        prestigeEnergy: {
          ...prev.prestigeEnergy,
          amount: prev.prestigeEnergy.amount.sub(cost),
          multiplier: Decimal.one(),
          generatorUpgradeLevel: level + 1,
        },
      };
      saveStateWithBackup(nextState);
      return nextState;
    });
  }, []);

  // Buy the maximum number of affordable Prestige Energy amplifier levels.
  const buyMaxPrestigeEnergyUpgrade = useCallback(() => {
    setGameState((prev) => {
      const level = Math.max(0, Math.floor(prev.prestigeEnergy.generatorUpgradeLevel || 0));
      let currentLevel = level;
      let currentCost = getGeneratorEnergyAmplifierCost(currentLevel);
      let remainingEnergy = prev.prestigeEnergy.amount;
      let totalCost = Decimal.zero();
      let boughtCount = 0;

      // Costs no longer follow one fixed geometric ratio after the softcap.
      while (remainingEnergy.gte(currentCost) && boughtCount < 100000) {
        remainingEnergy = remainingEnergy.sub(currentCost);
        totalCost = totalCost.add(currentCost);
        const growthMultiplier = 2 + 0.1 * Math.floor(currentLevel / 10);
        currentCost = currentCost.mul(growthMultiplier);
        currentLevel += 1;
        boughtCount += 1;
      }
      if (boughtCount === 0) return prev;

      sound.playBuy();
      const nextState: GameState = {
        ...prev,
        prestigeEnergy: {
          ...prev.prestigeEnergy,
          amount: prev.prestigeEnergy.amount.sub(totalCost),
          multiplier: Decimal.one(),
          generatorUpgradeLevel: level + boughtCount,
        },
      };
      saveStateWithBackup(nextState);
      return nextState;
    });
  }, []);

  // Buy Energy Booster: costs 10 PE initially, grows x10 each level, doubles PE gain.
  const buyPrestigeEnergyBooster = useCallback(() => {
    setGameState((prev) => {
      const level = Math.max(0, Math.floor(prev.prestigeEnergy.boosterLevel || 0));
      const cost = getPrestigeEnergyBoosterCost(level);
      if (prev.prestigeEnergy.amount.lt(cost)) return prev;

      sound.playBuy();
      const nextState: GameState = {
        ...prev,
        prestigeEnergy: {
          ...prev.prestigeEnergy,
          amount: prev.prestigeEnergy.amount.sub(cost),
          boosterLevel: level + 1,
        },
      };
      saveStateWithBackup(nextState);
      return nextState;
    });
  }, []);

  // Buy any Prestige Upgrade
  const buyPrestigeUpgrade = useCallback((upgradeId: string) => {
    setGameState((prev) => {
      const currentPP = prev.prestige.points;
      const upgs = prev.prestigeUpgrades;

      const costs: Record<string, Decimal> = {
        pointScaling: new Decimal(1),
        achievementBoost: new Decimal(12),
        tickspeedDiscount: new Decimal(2),
        prestigeSynergy: new Decimal(5),
        amplifiedDoubling: new Decimal(15),
        chronosFlow: new Decimal(25),
        logarithmicCascade: new Decimal(50),
        cascadeSurge: new Decimal(100),
        cosmicResonance: new Decimal(50),
        prestigeSkillSynergy: new Decimal(1e8),
      };

      // Upgrade 3A: Cascading Boosts (up to 20 levels)
      if (upgradeId === 'cascadingBoosts') {
        const currentLvl = upgs.cascadingBoostsLevel;
        if (currentLvl >= MAX_CASCADING_BOOSTS) return prev;
        const cost = getCascadingBoostCost(currentLvl);
        if (currentPP.lt(cost)) return prev;
        sound.playBuy();

        return {
          ...prev,
          prestige: {
            ...prev.prestige,
            points: currentPP.sub(cost),
          },
          prestigeUpgrades: {
            ...upgs,
            cascadingBoostsLevel: currentLvl + 1,
          },
        };
      }

      // Upgrade 3B: Generator Expander (up to 4 levels, unlocking Gen 5, 6, 7, 8)
      if (upgradeId === 'generatorUnlock') {
        const currentLvl = upgs.generatorUnlockLevel;
        if (currentLvl >= MAX_GENERATOR_UNLOCKS) return prev;
        const cost = getGeneratorUnlockCost(currentLvl);
        if (currentPP.lt(cost)) return prev;
        sound.playBuy();

        const nextLvl = currentLvl + 1;
        const nextUnlockedGens = 4 + nextLvl;

        return {
          ...prev,
          prestige: {
            ...prev.prestige,
            points: currentPP.sub(cost),
            unlockedGenerators: nextUnlockedGens,
          },
          prestigeUpgrades: {
            ...upgs,
            generatorUnlockLevel: nextLvl,
          },
        };
      }

      const cost = costs[upgradeId];
      if (!cost || currentPP.lt(cost)) return prev;
      if (upgradeId === 'prestigeSkillSynergy' && !prev.infinityTree?.feat_2) return prev;

      // Check if already bought boolean upgrade
      if ((upgs as unknown as Record<string, boolean>)[upgradeId]) return prev;

      sound.playBuy();

      const nextUpgrades = {
        ...upgs,
        [upgradeId]: true,
      };

      const nextState = {
        ...prev,
        prestige: { ...prev.prestige, points: currentPP.sub(cost) },
        prestigeUpgrades: nextUpgrades,
      };

      if (upgradeId === 'tickspeedDiscount') {
        return {
          ...nextState,
          points: nextState.points.add(100),
          tickspeed: {
            ...nextState.tickspeed,
            cost: getTickspeedCost(nextState),
          },
        };
      }

      return nextState;
    });
  }, []);

  // Complete reset to Infinity layer: grants IP & SP, unlocks Infinity tab, and resets pre-infinity progress
  const proceedInfinity = useCallback(() => {
    const now = Date.now();
    // Fast infinity cooldown: at most once every 0.1 seconds (100ms)
    if (now - lastInfinityResetTimeRef.current < 100) return;

    setShowInfinityOverlay(false);
    showInfinityOverlayRef.current = false;

    setGameState((prev) => {
      if (prev.points.lt(INFINITY_THRESHOLD)) return prev;
      const curTime = Date.now();
      if (prev.infinity.lastInfinityTime && curTime - prev.infinity.lastInfinityTime < 100) {
        return prev;
      }
      lastInfinityResetTimeRef.current = curTime;

      const infGain = calculateInfinitiesGain(prev);
      const newCount = prev.infinity.count + infGain;
      const spGain = calculateSkillPointsGain(prev, newCount);
      const newSP = (prev.infinity.skillPoints || 0) + spGain;
      const totalIpGain = calculateInfinityPointGain(prev.points, prev, newCount);
      const newIP = prev.infinity.points.add(totalIpGain);
      const totalEarnedIP = (prev.infinity.totalEarnedIP instanceof Decimal ? prev.infinity.totalEarnedIP : prev.infinity.points).add(totalIpGain);

      const resetGenerators = INITIAL_GENERATORS();
      let startingPoints = new Decimal(10);
      if (prev.infinityTree?.pre_2) {
        startingPoints = new Decimal(1e6);
        for (let i = 0; i < 4; i++) {
          resetGenerators[i].amount = new Decimal(1);
          resetGenerators[i].bought = 1;
        }
      }

      // Root node is now purchasable for 1 SP in the Infinity Tree map
      const nextTree = {
        ...(prev.infinityTree || {}),
      };

      const prevHighestIP = prev.stats?.highestIPEver instanceof Decimal
        ? prev.stats.highestIPEver
        : Decimal.zero();
      const highestIP = newIP.gt(prevHighestIP) ? newIP : prevHighestIP;

      const nextState: GameState = {
        ...prev,
        points: startingPoints,
        generatorCostSoftcapBought: null,
        generators: resetGenerators,
        tickspeed: {
          ...prev.tickspeed,
          bought: 0,
          costMult: new Decimal(15),
          cost: getTickspeedBaseCost(prev),
        },
        prestige: {
          count: 0,
          points: Decimal.zero(),
          unlockedGenerators: 4,
        },
        prestigeEnergy: {
          unlocked: false,
          amount: Decimal.zero(),
          // PE progress and its passive generator bonus belong to the current Infinity run.
          totalEarned: Decimal.zero(),
          multiplier: Decimal.one(),
          generatorUpgradeLevel: 0,
          boosterLevel: 0,
          resets: 0,
        },
        prestigeUpgrades: {
          ...createInitialState().prestigeUpgrades,
        },
        infinity: {
          ...prev.infinity,
          count: newCount,
          points: newIP,
          skillPoints: newSP,
          totalEarnedIP,
          unlocked: true,
          lastInfinityTime: curTime,
        },
        autobuyers: {
          ...prev.autobuyers,
          prestige: prev.autobuyers.prestige
            ? { ...prev.autobuyers.prestige, previousPPGain: Decimal.zero() }
            : prev.autobuyers.prestige,
          autoPrestigeEnergy: prev.autobuyers.autoPrestigeEnergy
            ? { ...prev.autobuyers.autoPrestigeEnergy, previousEnergyGain: Decimal.zero() }
            : prev.autobuyers.autoPrestigeEnergy,
        },
        infinityTree: nextTree,
        stats: {
          ...prev.stats,
          totalPrestiges: 0,
          totalInfinities: newCount,
          timeThisPrestige: 0,
          timeThisInfinity: 0,
          highestIPEver: highestIP,
        },
      };


      infinityTriggeredRef.current = false;
      saveStateWithBackup(nextState);
      return nextState;
    });
  }, []);
  proceedInfinityRef.current = proceedInfinity;

  const buyInfinityTreeNode = useCallback((nodeId: string) => {
    setGameState((prev) => {
      const tree = prev.infinityTree || {};

      // MAX-buy the repeatable Generator Amplification node using arithmetic/geometric cost scaling.
      if (nodeId === 'pre_5_max') {
        if (!tree.pre_4) return prev;
        const level = typeof tree.pre_5Level === 'number' ? Math.max(0, Math.floor(tree.pre_5Level)) : 0;
        const currentSP = Math.max(0, prev.infinity.skillPoints || 0);
        const { levelsToBuy, totalCost } = getMaxGeneratorAmplificationPurchases(level, currentSP);
        if (levelsToBuy <= 0) return prev;

        sound.playBuy();
        const nextState: GameState = {
          ...prev,
          infinity: { ...prev.infinity, skillPoints: Math.max(0, currentSP - totalCost) },
          infinityTree: { ...tree, pre_5: true, pre_5Level: level + levelsToBuy },
        };
        saveStateWithBackup(nextState);
        return nextState;
      }

      const def = INFINITY_TREE_NODES[nodeId];
      if (!def) return prev;
      if (tree[nodeId] && !def.repeatable) return prev;

      // Check parent requirement
      if (def.req !== 'none' && !tree[def.req]) {
        return prev;
      }

      // Check Infinity Upgrade requirement (e.g. automationExpand, prestigePreservationUnlock)
      if (def.reqUpgrade === 'automationExpand' && !prev.infinity.automationExpand) {
        return prev;
      }
      if (def.reqUpgrade === 'prestigePreservationUnlock' && !prev.infinity.breakInfinityUpgrades?.prestigePreservationUnlock) {
        return prev;
      }

      // Check Milestone requirement (e.g. milestone_1500_auto_infinity, milestone_2250_post_infinity)
      if (def.reqMilestone && !isInfinityMilestoneUnlocked(prev, def.reqMilestone as any)) {
        return prev;
      }

      const storedLevel = tree[nodeId + 'Level'];
      const currentLevel = def.repeatable && typeof storedLevel === 'number' ? Math.max(0, Math.floor(storedLevel)) : 0;
      const costSP = nodeId === 'pre_5'
        ? getGeneratorAmplificationCost(currentLevel)
        : (def.repeatable ? currentLevel + 1 : def.cost);
      const currentSP = prev.infinity.skillPoints ?? 0;
      if (currentSP < costSP) {
        return prev;
      }

      sound.playBuy();
      const nextSP = currentSP - costSP;
      const nextTree = def.repeatable
        ? { ...tree, [nodeId]: true, [nodeId + 'Level']: currentLevel + 1 }
        : { ...tree, [nodeId]: true };

      // Unlock corresponding autobuyers immediately
      const nextAutobuyers = { ...prev.autobuyers };
      if (nodeId === 'auto_1') {
        ['gen1', 'gen2', 'gen3', 'gen4'].forEach((k) => {
          if (nextAutobuyers[k]) nextAutobuyers[k] = { ...nextAutobuyers[k], unlocked: true };
        });
      } else if (nodeId === 'auto_2') {
        ['tickspeed', 'gen5', 'gen6', 'gen7', 'gen8'].forEach((k) => {
          if (nextAutobuyers[k]) nextAutobuyers[k] = { ...nextAutobuyers[k], unlocked: true };
        });
      } else if (nodeId === 'auto_3') {
        if (nextAutobuyers['prestige']) nextAutobuyers['prestige'] = { ...nextAutobuyers['prestige'], unlocked: true };
      } else if (nodeId === 'auto_5') {
        if (nextAutobuyers['autoPrestigeUpgrades']) nextAutobuyers['autoPrestigeUpgrades'] = { ...nextAutobuyers['autoPrestigeUpgrades'], unlocked: true };
      } else if (nodeId === 'auto_6') {
        if (nextAutobuyers['autoPrestigeEnergy']) nextAutobuyers['autoPrestigeEnergy'] = { ...nextAutobuyers['autoPrestigeEnergy'], unlocked: true };
      } else if (nodeId === 'auto_7') {
        if (nextAutobuyers['autoInfinity']) nextAutobuyers['autoInfinity'] = { ...nextAutobuyers['autoInfinity'], unlocked: true };
      }

      const nextStardust = nodeId === 'feat_6'
        ? {
            ...(prev.stardust || {
              unlocked: true,
              amount: Decimal.zero(),
              totalEarned: Decimal.zero(),
              doublerLevel: 0,
              baseUpgradeLevel: 0,
            }),
            unlocked: true,
          }
        : prev.stardust;

      const nextState: GameState = {
        ...prev,
        infinity: {
          ...prev.infinity,
          skillPoints: nextSP,
        },
        infinityTree: nextTree,
        autobuyers: nextAutobuyers,
        ...(nextStardust ? { stardust: nextStardust } : {}),
      };

      saveStateWithBackup(nextState);
      return nextState;
    });
  }, []);

  // Infinity Upgrade 1: Double IP Gain (Repeatable infinitely)
  const buyIpDoubler = useCallback(() => {
    setGameState((prev) => {
      const level = prev.infinity.ipDoublerLevel || 0;
      const cost = new Decimal(10).mul(new Decimal(10).pow(level));
      if (prev.infinity.points.lt(cost)) return prev;

      sound.playBuy();
      const nextState: GameState = {
        ...prev,
        infinity: {
          ...prev.infinity,
          points: prev.infinity.points.sub(cost),
          ipDoublerLevel: level + 1,
        },
      };
      saveStateWithBackup(nextState);
      return nextState;
    });
  }, []);

  // Buy as many levels of the repeatable IP Doubler as current IP allows.
  const buyMaxIpDoubler = useCallback(() => {
    setGameState((prev) => {
      const level = prev.infinity.ipDoublerLevel || 0;
      const firstCost = new Decimal(10).mul(new Decimal(10).pow(level));
      const boughtNow = getMaxGeometricPurchases(prev.infinity.points, firstCost, new Decimal(10));
      if (boughtNow.count === 0) return prev;

      sound.playBuy();
      const nextState: GameState = {
        ...prev,
        infinity: {
          ...prev.infinity,
          points: prev.infinity.points.sub(boughtNow.totalCost),
          ipDoublerLevel: level + boughtNow.count,
        },
      };
      saveStateWithBackup(nextState);
      return nextState;
    });
  }, []);

  // Infinity Upgrade 2: Automation Expand (Unlocks auto_5 and auto_6 in tree)
  const buyAutomationExpand = useCallback(() => {
    setGameState((prev) => {
      if (prev.infinity.automationExpand) return prev;
      const cost = new Decimal(20);
      if (prev.infinity.points.lt(cost)) return prev;

      sound.playBuy();
      const nextState: GameState = {
        ...prev,
        infinity: {
          ...prev.infinity,
          points: prev.infinity.points.sub(cost),
          automationExpand: true,
        },
      };
      saveStateWithBackup(nextState);
      return nextState;
    });
  }, []);

  // Infinity Upgrade 3: Achievement Master (15 IP, +1 completion per 3 OoMs of points)
  const buyAchievementMaster = useCallback(() => {
    setGameState((prev) => {
      if (prev.infinity.achievementMaster) return prev;
      const cost = new Decimal(15);
      if (prev.infinity.points.lt(cost)) return prev;

      sound.playBuy();
      const nextState: GameState = {
        ...prev,
        infinity: {
          ...prev.infinity,
          points: prev.infinity.points.sub(cost),
          achievementMaster: true,
        },
      };
      saveStateWithBackup(nextState);
      return nextState;
    });
  }, []);

  // Infinity Upgrade: generator output scales with lifetime IP (3^log10(total IP earned)).
  const buyIpGeneratorBoost = useCallback(() => {
    setGameState((prev) => {
      if (prev.infinity.ipGeneratorBoost || prev.infinity.points.lt(1)) return prev;
      sound.playBuy();
      const nextState: GameState = {
        ...prev,
        infinity: { ...prev.infinity, points: prev.infinity.points.sub(1), ipGeneratorBoost: true },
      };
      saveStateWithBackup(nextState);
      return nextState;
    });
  }, []);

  // Infinity Upgrade: IP gain multiplier is based on time spent in the current Infinity.
  const buyTimeIPBoost = useCallback(() => {
    setGameState((prev) => {
      if (prev.infinity.timeIPBoost || prev.infinity.points.lt(5)) return prev;
      sound.playBuy();
      const nextState: GameState = {
        ...prev,
        infinity: { ...prev.infinity, points: prev.infinity.points.sub(5), timeIPBoost: true },
      };
      saveStateWithBackup(nextState);
      return nextState;
    });
  }, []);

  // Infinity Upgrade: PE gain is multiplied by (unspent SP + 1).
  const buyEnergySPBoost = useCallback(() => {
    setGameState((prev) => {
      if (prev.infinity.energySPBoost || prev.infinity.points.lt(8)) return prev;
      sound.playBuy();
      const nextState: GameState = {
        ...prev,
        infinity: { ...prev.infinity, points: prev.infinity.points.sub(8), energySPBoost: true },
      };
      saveStateWithBackup(nextState);
      return nextState;
    });
  }, []);

  // Infinity Upgrade: Skill Amplification (cost: 1000 IP initially; repeatable with pre_6)
  const buySpDoublerUpgrade = useCallback(() => {
    setGameState((prev) => {
      const isRepeatable = !!prev.infinityTree?.pre_6;
      const currentLevel = getSkillAmplificationLevel(prev);
      if (!isRepeatable && currentLevel >= 1) return prev;

      const cost = getSkillAmplificationCost(currentLevel);
      if (prev.infinity.points.lt(cost)) return prev;

      sound.playBuy();
      const nextState: GameState = {
        ...prev,
        infinity: {
          ...prev.infinity,
          points: prev.infinity.points.sub(cost),
          spDoublerUpgrade: true,
          spDoublerLevel: currentLevel + 1,
        },
      };
      saveStateWithBackup(nextState);
      return nextState;
    });
  }, []);

  const buyMaxSkillAmplification = useCallback(() => {
    setGameState((prev) => {
      if (!prev.infinityTree?.pre_6) return prev;
      let currentLevel = getSkillAmplificationLevel(prev);
      let remainingIP = prev.infinity.points;
      let cost = getSkillAmplificationCost(currentLevel);
      let purchases = 0;

      while (remainingIP.gte(cost) && purchases < 500) {
        remainingIP = remainingIP.sub(cost);
        currentLevel++;
        purchases++;
        cost = getSkillAmplificationCost(currentLevel);
      }

      if (purchases === 0) return prev;

      sound.playBuy();
      const nextState: GameState = {
        ...prev,
        infinity: {
          ...prev.infinity,
          points: remainingIP,
          spDoublerUpgrade: true,
          spDoublerLevel: currentLevel,
        },
      };
      saveStateWithBackup(nextState);
      return nextState;
    });
  }, []);

  // Stardust Upgrades
  const buyStardustDoubler = useCallback(() => {
    setGameState((prev) => {
      if (!prev.stardust) return prev;
      const currentLevel = prev.stardust.doublerLevel || 0;
      const cost = getStardustDoublerCost(currentLevel);
      if (prev.stardust.amount.lt(cost)) return prev;

      sound.playBuy();
      const nextState: GameState = {
        ...prev,
        stardust: {
          ...prev.stardust,
          amount: prev.stardust.amount.sub(cost),
          doublerLevel: currentLevel + 1,
        },
      };
      saveStateWithBackup(nextState);
      return nextState;
    });
  }, []);

  const buyStardustBase = useCallback(() => {
    setGameState((prev) => {
      if (!prev.stardust) return prev;
      const currentLevel = prev.stardust.baseUpgradeLevel || 0;
      const cost = getStardustBaseCost(currentLevel);
      if (prev.stardust.amount.lt(cost)) return prev;

      sound.playBuy();
      const nextState: GameState = {
        ...prev,
        stardust: {
          ...prev.stardust,
          amount: prev.stardust.amount.sub(cost),
          baseUpgradeLevel: currentLevel + 1,
        },
      };
      saveStateWithBackup(nextState);
      return nextState;
    });
  }, []);

  // Break Infinity Upgrades, including the new late-game extension from 1e40 IP and 1e200 IP.
  const buyBreakInfinityUpgrade = useCallback((upgradeId: BreakInfinityUpgradeId) => {
    const costs: Record<BreakInfinityUpgradeId, Decimal> = {
      limitless: new Decimal(1e16),
      singularityResonance: new Decimal(1e18),
      hypercharge: new Decimal(1e20),
      vacuumMomentum: new Decimal(1e22),
      fractalIgnition: new Decimal(1, 40),
      singularityOverdrive: new Decimal(1, 50),
      hyperchargeOverdrive: new Decimal(1, 60),
      vacuumCascade: new Decimal(1, 75),
      transcendentCascade: new Decimal(1, 90),
      absoluteHorizon: new Decimal(1, 110),
      prestigePreservationUnlock: new Decimal(1, 200),
    };

    setGameState((prev) => {
      if (!prev.infinityTree?.feat_5) return prev;
      const currentUpgs = prev.infinity.breakInfinityUpgrades || {};
      if (currentUpgs[upgradeId]) return prev;
      if (upgradeId === 'singularityOverdrive' && !currentUpgs.singularityResonance) return prev;
      if (upgradeId === 'hyperchargeOverdrive' && !currentUpgs.hypercharge) return prev;

      const cost = costs[upgradeId];
      if (!cost) return prev;
      if (prev.infinity.points.lt(cost)) return prev;

      sound.playBuy();
      const nextState: GameState = {
        ...prev,
        infinity: {
          ...prev.infinity,
          points: prev.infinity.points.sub(cost),
          breakInfinityUpgrades: {
            ...currentUpgs,
            [upgradeId]: true,
          },
        },
      };
      saveStateWithBackup(nextState);
      return nextState;
    });
  }, []);

  // Buy maximum affordable levels of one repeatable Prestige upgrade.
  const buyMaxPrestigeUpgrade = useCallback((upgradeId: 'cascadingBoosts' | 'generatorUnlock') => {
    setGameState((prev) => {
      let currentPP = prev.prestige.points;
      const upgs = { ...prev.prestigeUpgrades };
      let purchases = 0;

      if (upgradeId === 'cascadingBoosts') {
        let level = Math.max(0, upgs.cascadingBoostsLevel || 0);
        while (level < MAX_CASCADING_BOOSTS && purchases < MAX_CASCADING_BOOSTS) {
          const cost = getCascadingBoostCost(level);
          if (currentPP.lt(cost)) break;
          currentPP = currentPP.sub(cost);
          level += 1;
          purchases += 1;
        }
        if (purchases === 0) return prev;
        upgs.cascadingBoostsLevel = level;
      } else {
        let level = Math.max(0, upgs.generatorUnlockLevel || 0);
        while (level < MAX_GENERATOR_UNLOCKS && purchases < MAX_GENERATOR_UNLOCKS) {
          const cost = getGeneratorUnlockCost(level);
          if (currentPP.lt(cost)) break;
          currentPP = currentPP.sub(cost);
          level += 1;
          purchases += 1;
        }
        if (purchases === 0) return prev;
        upgs.generatorUnlockLevel = level;
      }

      sound.playBuy();
      const nextState: GameState = {
        ...prev,
        prestige: {
          ...prev.prestige,
          points: currentPP,
          unlockedGenerators: 4 + (upgs.generatorUnlockLevel || 0),
        },
        prestigeUpgrades: upgs,
      };
      saveStateWithBackup(nextState);
      return nextState;
    });
  }, []);

  // Max All Prestige Upgrades
  const buyMaxPrestigeUpgrades = useCallback(() => {
    setGameState((prev) => {
      let currentPP = prev.prestige.points;
      const upgs = { ...prev.prestigeUpgrades };
      let didBuy = false;

      const singleCosts: Record<string, number> = {
        pointScaling: 1,
        achievementBoost: 2,
        tickspeedDiscount: 2,
        prestigeSynergy: 5,
        amplifiedDoubling: 15,
        chronosFlow: 25,
        logarithmicCascade: 50,
        cascadeSurge: 100,
        cosmicResonance: 50,
        prestigeSkillSynergy: 1e8,
      };

      for (const [id, costNum] of Object.entries(singleCosts)) {
        if (id === 'prestigeSkillSynergy' && !prev.infinityTree?.feat_2) continue;
        if (!upgs[id as keyof typeof upgs]) {
          const cost = new Decimal(costNum);
          if (currentPP.gte(cost)) {
            currentPP = currentPP.sub(cost);
            (upgs as unknown as Record<string, unknown>)[id] = true;
            didBuy = true;
          }
        }
      }

      // Cascading Boosts
      let boostLvl = upgs.cascadingBoostsLevel || 0;
      while (boostLvl < MAX_CASCADING_BOOSTS) {
        const cost = getCascadingBoostCost(boostLvl);
        if (currentPP.lt(cost)) break;
        currentPP = currentPP.sub(cost);
        boostLvl++;
        didBuy = true;
      }
      upgs.cascadingBoostsLevel = boostLvl;

      // Generator Expander
      let unlockLvl = upgs.generatorUnlockLevel || 0;
      while (unlockLvl < MAX_GENERATOR_UNLOCKS) {
        const cost = getGeneratorUnlockCost(unlockLvl);
        if (currentPP.lt(cost)) break;
        currentPP = currentPP.sub(cost);
        unlockLvl++;
        didBuy = true;
      }
      upgs.generatorUnlockLevel = unlockLvl;

      if (!didBuy) return prev;
      sound.playBuy();

      return {
        ...prev,
        prestige: { ...prev.prestige, points: currentPP },
        prestigeUpgrades: upgs,
      };
    });
  }, []);

  const setAutoPrestigeUpgradesSettings = useCallback((settings: Partial<{ priority: 'cheapest' | 'order'; buyAll: boolean }>) => {
    setGameState((prev) => ({
      ...prev,
      autobuyers: {
        ...prev.autobuyers,
        autoPrestigeUpgrades: {
          ...prev.autobuyers.autoPrestigeUpgrades,
          ...settings,
        },
      },
    }));
  }, []);

  const setAutoPrestigeEnergySettings = useCallback((settings: Partial<{
    energyMode: 'time' | 'target' | 'gainMultiplier';
    energyTimeTarget: number;
    energyTarget: number;
    energyRatioTarget: number;
  }>) => {
    setGameState((prev) => ({
      ...prev,
      autobuyers: {
        ...prev.autobuyers,
        autoPrestigeEnergy: {
          ...prev.autobuyers.autoPrestigeEnergy,
          ...settings,
        },
      },
    }));
  }, []);

  const setAutoInfinitySettings = useCallback((settings: Partial<{
    infinityMode: 'time' | 'targetIP' | 'ipMultiplier';
    infinityTimeTarget: number;
    infinityTarget: number;
    infinityRatioTarget: number;
  }>) => {
    setGameState((prev) => ({
      ...prev,
      autobuyers: {
        ...prev.autobuyers,
        autoInfinity: {
          ...prev.autobuyers.autoInfinity,
          ...settings,
        },
      },
    }));
  }, []);

  const setAutobuyerTarget = useCallback((id: string, target: number) => {
    setGameState((prev) => {
      const ab = prev.autobuyers[id];
      if (!ab) return prev;
      return {
        ...prev,
        autobuyers: {
          ...prev.autobuyers,
          [id]: {
            ...ab,
            target,
          },
        },
      };
    });
  }, []);

  const setPrestigeAutobuyerSettings = useCallback((settings: Partial<{
    target: number;
    mode: 'time' | 'targetPP' | 'ppMultiplier';
    timeTarget: number;
    ratioTarget: number;
  }>) => {
    setGameState((prev) => {
      const current = prev.autobuyers.prestige;
      if (!current) return prev;
      return {
        ...prev,
        autobuyers: {
          ...prev.autobuyers,
          prestige: {
            ...current,
            ...settings,
          },
        },
      };
    });
  }, []);

  const toggleAutobuyer = useCallback((id: string) => {
    setGameState((prev) => {
      const target = prev.autobuyers[id];
      if (!target || !target.unlocked) return prev;
      return {
        ...prev,
        autobuyers: {
          ...prev.autobuyers,
          [id]: {
            ...target,
            enabled: !target.enabled,
          },
        },
      };
    });
  }, []);

  const toggleSound = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        soundEnabled: !prev.settings.soundEnabled,
      },
    }));
  }, []);

  const setLanguage = useCallback((language: 'en' | 'ru') => {
    setGameState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        language,
      },
    }));
  }, []);

  const setNotation = useCallback((notation: 'scientific' | 'engineering' | 'standard' | 'logarithm') => {
    setGameState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        notation,
      },
    }));
  }, []);

  const exportSave = useCallback((): string => {
    try {
      const json = serializeState(stateRef.current);
      return btoa(unescape(encodeURIComponent(json)));
    } catch {
      return '';
    }
  }, []);

  const importSave = useCallback((raw: string): boolean => {
    try {
      let json = raw.trim();
      try {
        json = decodeURIComponent(escape(atob(json)));
      } catch {
        // Fallback
      }
      const state = deserializeState(json);
      if (state) {
        setGameState(state);
        saveStateWithBackup(state);
        return true;
      }
    } catch {
      // Failed
    }
    return false;
  }, []);

  const saveGame = useCallback(() => {
    setGameState((prev) => {
      const now = Date.now();
      const updated = {
        ...prev,
        lastUpdate: now,
      };
      const saved = saveStateWithBackup(updated);
      if (saved) {
        addToast({
          title: 'Game Saved',
          message: 'Saved with automated backup snapshot!',
          description: `Time: ${new Date(now).toLocaleTimeString()}`,
          icon: '💾',
          type: 'save',
        });
      }
      return updated;
    });
  }, [addToast]);

  const restoreBackup = useCallback((): boolean => {
    const backupState = loadStateSafe();
    if (backupState) {
      setGameState(backupState);
      saveStateWithBackup(backupState);
      sound.playBoost();
      addToast({
        title: 'Backup Restored',
        message: 'Successfully restored from automatic backup snapshot!',
        icon: '🛡️',
        type: 'save',
      });
      return true;
    }
    return false;
  }, [addToast]);

  const setAutoSaveEnabled = useCallback((enabled: boolean) => {
    setGameState((prev) => {
      const next = {
        ...prev,
        settings: {
          ...prev.settings,
          autoSaveEnabled: enabled,
        },
      };
      saveStateWithBackup(next);
      return next;
    });
  }, []);

  const setAutoSaveInterval = useCallback((interval: number) => {
    setGameState((prev) => {
      const next = {
        ...prev,
        settings: {
          ...prev.settings,
          autoSaveInterval: interval,
        },
      };
      saveStateWithBackup(next);
      return next;
    });
  }, []);

  const exportSaveToFile = useCallback(() => {
    try {
      const json = serializeState(stateRef.current);
      const encoded = btoa(unescape(encodeURIComponent(json)));
      const blob = new Blob([encoded], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `generators_save_${dateStr}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast({
        title: 'Save File Exported',
        message: 'File downloaded successfully!',
        description: `generators_save_${dateStr}.txt`,
        type: 'save',
      });
    } catch {
      addToast({
        title: 'Export Failed',
        message: 'Could not generate save file.',
        type: 'info',
      });
    }
  }, [addToast]);

  const importSaveFromFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') return;
        let json = text.trim();
        try {
          json = decodeURIComponent(escape(atob(json)));
        } catch {
          // May be direct JSON
        }
        const state = deserializeState(json);
        if (state) {
          setGameState(state);
          saveStateWithBackup(state);
          sound.playBoost();
          addToast({
            title: 'Save File Loaded',
            message: `Successfully loaded from ${file.name}!`,
            type: 'save',
          });
        } else {
          addToast({
            title: 'Import Failed',
            message: 'Invalid save file content.',
            type: 'info',
          });
        }
      } catch {
        addToast({
          title: 'Import Error',
          message: 'Error reading save file.',
          type: 'info',
        });
      }
    };
    reader.readAsText(file);
  }, [addToast]);

  const hardReset = useCallback(() => {
    const fresh = createInitialState();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_BACKUP_KEY);
    localStorage.removeItem(STORAGE_PREV_BACKUP_KEY);
    saveStateWithBackup(fresh);
    setGameState(fresh);
    addToast({
      title: 'Game Wiped',
      message: 'All save data has been completely wiped.',
      type: 'info',
    });
  }, [addToast]);

  return {
    gameState,
    offlineMessage,
    showInfinityOverlay,
    proceedInfinity,
    clearOfflineMessage: () => setOfflineMessage(null),
    toasts,
    dismissToast,
    buyGenerator,
    buyMaxGenerator,
    buyTickspeed,
    buyMaxTickspeed,
    buyMaxAll,
    performPrestige,
    performPrestigeEnergy,
    buyPrestigeEnergyUpgrade,
    buyMaxPrestigeEnergyUpgrade,
    buyPrestigeEnergyBooster,
    buyPrestigeUpgrade,
    buyMaxPrestigeUpgrade,
    buyMaxPrestigeUpgrades,
    buyInfinityTreeNode,
    buyIpDoubler,
    buyMaxIpDoubler,
    buyAutomationExpand,
    buyAchievementMaster,
    buyIpGeneratorBoost,
    buyTimeIPBoost,
    buyEnergySPBoost,
    buySpDoublerUpgrade,
    buyMaxSkillAmplification,
    buyStardustDoubler,
    buyStardustBase,
    buyBreakInfinityUpgrade,
    setAutobuyerTarget,
    setPrestigeAutobuyerSettings,
    setAutoPrestigeUpgradesSettings,
    setAutoPrestigeEnergySettings,
    setAutoInfinitySettings,
    restoreBackup,
    toggleAutobuyer,
    toggleSound,
    setLanguage,
    setNotation,
    saveGame,
    setAutoSaveEnabled,
    setAutoSaveInterval,
    exportSave,
    importSave,
    exportSaveToFile,
    importSaveFromFile,
    hardReset,
  };
}
