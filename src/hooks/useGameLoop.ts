import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, ToastNotification, Achievement } from '../types/game';
import { ACHIEVEMENTS } from '../constants/achievements';
import {
  createInitialState,
  serializeState,
  deserializeState,
  INITIAL_GENERATORS,
  STORAGE_KEY,
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
  getCascadingBoostCost,
  MAX_CASCADING_BOOSTS,
  getGeneratorUnlockCost,
  MAX_GENERATOR_UNLOCKS,
  getUnlockedGeneratorsCount,
  calculatePrestigePointsGain,
  calculatePrestigeEnergyMultiplier,
} from '../utils/gameCalculations';

export function useGameLoop() {
  const [gameState, setGameState] = useState<GameState>(() => {
    return loadStateSafe();
  });

  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);
  const [showInfinityOverlay, setShowInfinityOverlay] = useState<boolean>(false);
  const infinityTriggeredRef = useRef<boolean>(false);
  const proceedInfinityRef = useRef<() => void>(() => {});

  const stateRef = useRef<GameState>(gameState);
  stateRef.current = gameState;

  // Sync sound settings
  useEffect(() => {
    sound.enabled = gameState.settings.soundEnabled;
  }, [gameState.settings.soundEnabled]);

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

        // Tree Node feat_2: Passive Prestige Energy accumulation
        if (state.infinityTree?.feat_2 && state.prestigeEnergy?.unlocked) {
          const passiveEnergy = calculatePrestigeEnergyMultiplier(state.points).mul(0.005 * subDt);
          state.prestigeEnergy.multiplier = state.prestigeEnergy.multiplier.add(passiveEnergy);
        }
      }

      const pointsGained = state.points.sub(initialPoints);
      state.stats.totalTimePlayed += simulatedSeconds;
      state.stats.timeThisPrestige += simulatedSeconds;
      state.lastUpdate = now;

      if (pointsGained.gt(0)) {
        const msg = `Welcome back! While you were away (${Math.floor(simulatedSeconds)}s), all active generators worked in cascade, producing ${pointsGained.format(state.settings.notation)} Points.`;
        setOfflineMessage(msg);
        setGameState(state);
        saveStateWithBackup(state);
      }
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
    check('speed_prestige', state.stats.fastestPrestige <= 600);
    check('rapid_prestige', state.stats.fastestPrestige <= 180);
    check('ten_prestiges', state.stats.totalPrestiges >= 10);
    check('hundred_prestige_points', state.prestige.points.gte(100));
    check('all_eight_gens', state.prestige.unlockedGenerators >= 8);
    check('prestige_energy', state.prestigeEnergy?.resets >= 1);
    check('reach_infinity', state.points.gte(INFINITY_THRESHOLD) || state.infinity.count >= 1);

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
      if (dt <= 0) return;

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

        // Stats tracking
        state.stats.totalTimePlayed += dt;
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

        // Check Infinity Threshold (1.79e308 Points)
        // If Break Infinity (feat_4) is NOT active, trigger forced collapse
        if (!state.infinityTree?.feat_4 && state.points.gte(INFINITY_THRESHOLD) && !infinityTriggeredRef.current) {
          infinityTriggeredRef.current = true;
          if (state.infinity.count < 10) {
            setShowInfinityOverlay(true);
            sound.playCollapse();
          } else {
            // After 10 infinities, the "YOU REACHED INFINITY" overlay no longer appears
            setTimeout(() => {
              proceedInfinityRef.current();
            }, 0);
          }
        }

        // Autobuyers execution (every ~0.25s, or 0.05s with auto_4)
        const autoInterval = state.infinityTree?.auto_4 ? 0.05 : 0.25;
        autoAccumulator += dt;
        if (autoAccumulator >= autoInterval) {
          autoAccumulator = 0;

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
                  state.points = state.points.sub(cost);
                  gen.amount = gen.amount.add(1);
                  gen.bought++;
                }
              } else {
                const cost = getGeneratorCost(gen.baseCost, gen.costMult, gen.bought, gen.id, state.generatorCostSoftcapBought?.[gen.id - 1] ?? null);
                if (state.points.gte(cost)) {
                  state.points = state.points.sub(cost);
                  gen.amount = gen.amount.add(1);
                  gen.bought++;
                }
              }
            }
          }

          // Auto Tickspeed
          const autoTick = state.autobuyers['tickspeed'];
          if (autoTick && autoTick.unlocked && autoTick.enabled) {
            const baseTick = getTickspeedBaseCost(state);
            if (state.infinityTree?.auto_4) {
              while (state.points.gte(state.tickspeed.cost)) {
                state.points = state.points.sub(state.tickspeed.cost);
                state.tickspeed.bought++;
                state.tickspeed.cost = baseTick.mul(state.tickspeed.costMult.pow(state.tickspeed.bought));
              }
            } else {
              const tickCost = state.tickspeed.cost;
              if (state.points.gte(tickCost)) {
                state.points = state.points.sub(tickCost);
                state.tickspeed.bought++;
                state.tickspeed.cost = getTickspeedCost(state);
              }
            }
          }

          // Auto Prestige (Branch 2 Node 3)
          const autoPres = state.autobuyers['prestige'];
          if (autoPres && autoPres.unlocked && autoPres.enabled) {
            const ppGain = calculatePrestigePointsGain(state.points, state);
            const target = typeof autoPres.target === 'number' ? autoPres.target : 1;
            const mode = autoPres.mode || 'targetPP'; // Keeps existing saves on their previous behavior.
            const previousGain = autoPres.previousPPGain instanceof Decimal
              ? autoPres.previousPPGain
              : Decimal.zero();
            const timeTarget = Math.max(1, autoPres.timeTarget || 60);
            const ratioTarget = Math.max(1.01, autoPres.ratioTarget || 2);
            let shouldPrestige = false;

            // Never reset until this run can actually award at least 1 PP.
            if (ppGain.gte(1)) {
              if (mode === 'time') {
                shouldPrestige = state.stats.timeThisPrestige >= timeTarget;
              } else if (mode === 'ppMultiplier') {
                // If there is no recorded previous run yet, use the first successful run
                // to establish a baseline; later runs must beat it by the configured ratio.
                shouldPrestige = previousGain.gt(0)
                  ? ppGain.gte(previousGain.mul(ratioTarget))
                  : true;
              } else {
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
              state.stats.fastestPrestige = Math.min(state.stats.fastestPrestige, completedPrestigeTime);
              state.stats.highestPPEver = totalPP.gt(state.stats.highestPPEver) ? totalPP : state.stats.highestPPEver;
              state.autobuyers['prestige'] = { ...autoPres, previousPPGain: ppGain };
              state.stats.timeThisPrestige = 0;
              state.points = state.infinityTree?.pre_2 ? new Decimal(1e6) : (state.prestigeUpgrades?.tickspeedDiscount ? new Decimal(110) : new Decimal(10));
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
      const newBought = prev.tickspeed.bought + 1;
      const nextCost = getTickspeedBaseCost(prev).mul(prev.tickspeed.costMult.pow(newBought));

      return {
        ...prev,
        points: prev.points.sub(cost),
        tickspeed: {
          ...prev.tickspeed,
          bought: newBought,
          cost: nextCost,
        },
        stats: {
          ...prev.stats,
          totalManualClicks: prev.stats.totalManualClicks + 1,
        },
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
      const baseTick = getTickspeedBaseCost(prev);
      while (currentPoints.gte(tickCost)) {
        currentPoints = currentPoints.sub(tickCost);
        tickBought++;
        tickCost = baseTick.mul(prev.tickspeed.costMult.pow(tickBought));
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
      const fastest = Math.min(prev.stats.fastestPrestige, prev.stats.timeThisPrestige);
      const resetGenerators = INITIAL_GENERATORS();
      const newPP = prev.prestige.points.add(ppGain);

      const baseTickCost = prev.prestigeUpgrades.tickspeedDiscount ? new Decimal(10) : new Decimal(1000);
      let startingPoints = prev.prestigeUpgrades.tickspeedDiscount ? new Decimal(110) : new Decimal(10);
      if (prev.infinityTree?.pre_2) {
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
  // in exchange for a permanent compounded Generators multiplier!
  const performPrestigeEnergy = useCallback(() => {
    setGameState((prev) => {
      if (prev.points.lt(PRESTIGE_ENERGY_THRESHOLD)) return prev;

      const gainedMult = calculatePrestigeEnergyMultiplier(prev.points);
      if (gainedMult.lt(2)) return prev;

      sound.playBoost();

      const newMultiplier = prev.prestigeEnergy.multiplier.mul(gainedMult);
      const newAmount = prev.prestigeEnergy.amount.add(gainedMult);
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
          multiplier: newMultiplier,
          resets: prev.prestigeEnergy.resets + 1,
        },
        stats: {
          ...prev.stats,
          timeThisPrestige: 0,
        },
      };
    });
  }, []);

  // Buy any Prestige Upgrade
  const buyPrestigeUpgrade = useCallback((upgradeId: string) => {
    setGameState((prev) => {
      const currentPP = prev.prestige.points;
      const upgs = prev.prestigeUpgrades;

      const costs: Record<string, Decimal> = {
        pointScaling: new Decimal(1),
        achievementBoost: new Decimal(2),
        tickspeedDiscount: new Decimal(2),
        prestigeSynergy: new Decimal(5),
        amplifiedDoubling: new Decimal(15),
        chronosFlow: new Decimal(25),
        logarithmicCascade: new Decimal(50),
        cascadeSurge: new Decimal(100),
        cosmicResonance: new Decimal(50),
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

  // Complete reset to Infinity layer: grants IP, unlocks Infinity tab, and resets pre-infinity progress
  const proceedInfinity = useCallback(() => {
    setShowInfinityOverlay(false);
    infinityTriggeredRef.current = false;

    setGameState((prev) => {
      const newCount = prev.infinity.count + 1;
      let ipGain = 1;
      if (prev.infinityTree?.feat_4 && prev.points.gte(INFINITY_THRESHOLD)) {
        const excess = Math.max(0, prev.points.log10() - 308);
        ipGain += Math.floor(excess / 10);
      }
      const newIP = prev.infinity.points.add(ipGain);

      const resetGenerators = INITIAL_GENERATORS();
      let startingPoints = new Decimal(10);
      if (prev.infinityTree?.pre_2) {
        startingPoints = new Decimal(1e6);
        for (let i = 0; i < 4; i++) {
          resetGenerators[i].amount = new Decimal(1);
          resetGenerators[i].bought = 1;
        }
      }

      // Root node auto-unlocks upon first Infinity
      const nextTree = {
        ...(prev.infinityTree || {}),
        root: true,
      };

      const nextState: GameState = {
        ...prev,
        points: startingPoints,
        generatorCostSoftcapBought: null,
        generators: resetGenerators,
        tickspeed: {
          ...prev.tickspeed,
          bought: 0,
          cost: new Decimal(1000),
        },
        prestige: {
          count: 0,
          points: Decimal.zero(),
          unlockedGenerators: 4,
        },
        prestigeEnergy: {
          unlocked: false,
          amount: Decimal.zero(),
          multiplier: Decimal.one(),
          resets: 0,
        },
        prestigeUpgrades: {
          ...createInitialState().prestigeUpgrades,
        },
        infinity: {
          count: newCount,
          points: newIP,
          unlocked: true,
        },
        infinityTree: nextTree,
        stats: {
          ...prev.stats,
          totalInfinities: newCount,
          timeThisPrestige: 0,
          timeThisInfinity: 0,
          highestIPEver: newIP.gt(prev.stats.highestIPEver) ? newIP : prev.stats.highestIPEver,
        },
      };

      saveStateWithBackup(nextState);
      return nextState;
    });
  }, []);
  proceedInfinityRef.current = proceedInfinity;

  const buyInfinityTreeNode = useCallback((nodeId: string) => {
    setGameState((prev) => {
      const def = INFINITY_TREE_NODES[nodeId];
      if (!def) return prev;
      const tree = prev.infinityTree || {};
      if (tree[nodeId]) return prev;

      // Check parent requirement
      if (def.req !== 'none' && !tree[def.req]) {
        return prev;
      }

      const cost = new Decimal(def.cost);
      if (prev.infinity.points.lt(cost)) {
        return prev;
      }

      sound.playBuy();
      const nextIP = prev.infinity.points.sub(cost);
      const nextTree = { ...tree, [nodeId]: true };

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
      }

      const nextState: GameState = {
        ...prev,
        infinity: {
          ...prev.infinity,
          points: nextIP,
        },
        infinityTree: nextTree,
        autobuyers: nextAutobuyers,
      };

      saveStateWithBackup(nextState);
      return nextState;
    });
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
    setGameState(fresh);
  }, []);

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
    buyMaxAll,
    performPrestige,
    performPrestigeEnergy,
    buyPrestigeUpgrade,
    buyInfinityTreeNode,
    setAutobuyerTarget,
    setPrestigeAutobuyerSettings,
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
