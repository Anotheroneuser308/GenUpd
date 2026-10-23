import React, { useState } from 'react';
import { GameState } from '../types/game';
import { Decimal } from '../utils/decimal';
import {
  PRESTIGE_REQUIREMENT,
  getPrestigeRequirement,
  PRESTIGE_ENERGY_THRESHOLD,
  calculatePrestigePointsGain,
  calculatePrestigeEnergyGain,
  getPassivePrestigeEnergyGeneratorMultiplier,
  getGeneratorEnergyAmplifierCost,
  getPrestigeEnergyBoosterCost,
  getCascadingBoostCost,
  MAX_CASCADING_BOOSTS,
  getCascadingBoostMultiplierForGen,
  getGeneratorUnlockCost,
  MAX_GENERATOR_UNLOCKS,
  getAchievementMasterCompletions,
} from '../utils/gameCalculations';

interface PrestigeTabProps {
  state: GameState;
  onPrestige: () => void;
  onPrestigeEnergy: () => void;
  onBuyPrestigeEnergyUpgrade: () => void;
  onBuyMaxPrestigeEnergyUpgrade: () => void;
  onBuyPrestigeEnergyBooster: () => void;
  onBuyUpgrade: (upgradeId: string) => void;
  onBuyMaxUpgrade?: (upgradeId: 'cascadingBoosts' | 'generatorUnlock') => void;
  onBuyMaxUpgrades?: () => void;
}

export const PrestigeTab: React.FC<PrestigeTabProps> = ({
  state,
  onPrestige,
  onPrestigeEnergy,
  onBuyPrestigeEnergyUpgrade,
  onBuyMaxPrestigeEnergyUpgrade,
  onBuyPrestigeEnergyBooster,
  onBuyUpgrade,
  onBuyMaxUpgrade,
  onBuyMaxUpgrades,
}) => {
  const [subTab, setSubTab] = useState<'main' | 'energy'>('main');

  const notation = state.settings.notation;
  const prestigeReq = getPrestigeRequirement(state);
  const ppGain = calculatePrestigePointsGain(state.points, state);
  const canPrestige = ppGain.gte(1);
  const currentPP = state.prestige.points;
  const upgs = state.prestigeUpgrades;

  // Progress towards 1.00e18 Points (or 1.00e16 with pre_3) for Prestige
  const currentLog = Math.max(0, state.points.log10());
  const prestigeTargetLog = Math.max(1, prestigeReq.log10());
  // Recompute directly from the live GameState every render; the bar uses a transform
  // so its fill updates smoothly even while this tab remains open.
  const prestigeProgressPercent = Math.min(100, Math.max(0, (currentLog / prestigeTargetLog) * 100));

  // Progress towards 1.00e154 Points for Prestige Energy
  const energyTargetLog = 154; // 1e154
  const energyProgressPercent = Math.min(100, Math.max(0, (currentLog / energyTargetLog) * 100));
  const isEnergyUnlocked = state.prestigeEnergy?.unlocked || state.points.gte(PRESTIGE_ENERGY_THRESHOLD);
  const energyGain = calculatePrestigeEnergyGain(state.points, state);
  const energyUpgradeLevel = state.prestigeEnergy.generatorUpgradeLevel || 0;
  const energyGeneratorMult = new Decimal(2).pow(energyUpgradeLevel);
  const passiveEnergyGeneratorMult = getPassivePrestigeEnergyGeneratorMultiplier(state);
  const lifetimePE = state.prestigeEnergy.totalEarned || state.prestigeEnergy.amount;
  const energyUpgradeCost = getGeneratorEnergyAmplifierCost(energyUpgradeLevel);
  const energyBoosterLevel = Math.max(0, Math.floor(state.prestigeEnergy.boosterLevel || 0));
  const energyBoosterCost = getPrestigeEnergyBoosterCost(energyBoosterLevel);
  const energyBoosterMult = new Decimal(2).pow(energyBoosterLevel);
  const prestigeSkillSynergyBonus = upgs.prestigeSkillSynergy && state.prestige.count >= 10
    ? Math.floor(Math.log10(Math.max(1, state.prestige.count)))
    : 0;
  const canPrestigeEnergy = state.points.gte(PRESTIGE_ENERGY_THRESHOLD);

  // Live effect previews
  const oom6 = Math.floor(Math.max(0, state.points.log10()) / 6);
  const upg1CurrentMult = upgs.pointScaling && oom6 > 0 ? new Decimal(2).pow(oom6) : Decimal.one();
  const unlockedAchCount = Object.values(state.achievements).filter(Boolean).length;
  const achMasterBonus = getAchievementMasterCompletions(state);
  const totalEffectiveAch = unlockedAchCount + achMasterBonus;
  const upg2CurrentMult = upgs.achievementBoost && totalEffectiveAch > 0 ? new Decimal(1.05).pow(totalEffectiveAch) : Decimal.one();

  // Upgrade 3A (Cascading Boosts)
  const boostLevel = upgs.cascadingBoostsLevel || 0;
  const boostCost = getCascadingBoostCost(boostLevel);
  const canAffordBoost = boostLevel < MAX_CASCADING_BOOSTS && currentPP.gte(boostCost);

  // Upgrade 3B (Generator Expander)
  const unlockLevel = upgs.generatorUnlockLevel || 0;
  const unlockCost = getGeneratorUnlockCost(unlockLevel);
  const canAffordUnlock = unlockLevel < MAX_GENERATOR_UNLOCKS && currentPP.gte(unlockCost);

  // Upgrade 5 (PP Synergy) - without exponent: 1 + PP, hardcapped at 1e10
  const rawSynergy = upgs.prestigeSynergy && currentPP.gt(0) ? currentPP.add(1) : Decimal.one();
  const ppSynergyMult = rawSynergy.gt(1e10) ? new Decimal(1e10) : rawSynergy;

  // Upgrade 8 (Log Cascade)
  const logVal = Math.max(1, state.points.log10());
  const logCascadeMult = upgs.logarithmicCascade && state.points.gte(10) ? new Decimal(logVal * logVal) : Decimal.one();

  // Upgrade 10 (Cosmic Resonance) - every 10 purchases multiplies each generator by 1.05x
  const totalPurchases = state.generators.reduce((sum, g) => sum + g.bought, 0);
  const resonanceGroups = Math.floor(totalPurchases / 10);
  const cosmicResonanceMult = upgs.cosmicResonance && resonanceGroups > 0 ? new Decimal(1.05).pow(resonanceGroups) : Decimal.one();

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation (Main vs Prestige Energy) */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setSubTab('main')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            subTab === 'main'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          Main Prestige & Upgrades
        </button>

        <button
          type="button"
          onClick={() => setSubTab('energy')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
            subTab === 'energy'
              ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <span>Prestige Energy</span>
          {!isEnergyUnlocked ? (
            <span className="text-[10px] font-mono text-purple-300 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-500/30">
              1e154
            </span>
          ) : (
            <span className="text-[10px] font-mono text-emerald-400">
              ★ Active
            </span>
          )}
        </button>
      </div>

      {subTab === 'main' ? (
        <>
          {/* Main Prestige Card */}
          <div className="bg-gradient-to-b from-indigo-950/30 via-slate-900 to-slate-900 border border-indigo-500/20 rounded-2xl p-8 flex flex-col items-center text-center gap-6 shadow-xl">
            <div className="max-w-xl">
              <span className="text-xs uppercase tracking-widest text-indigo-400 font-semibold font-mono">
                Primary Reset
              </span>
              <h2 className="text-3xl font-bold text-white mt-1 tracking-tight">
                Prestige
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Reach {prestigeReq.format(notation)} Points to perform a Prestige. Performing Prestige resets your Points,
                Generators, and their purchase multipliers in exchange for valuable Prestige Points (PP).
              </p>
            </div>

            {/* Prestige Summary Stats */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono">
              <div className="bg-slate-950/70 border border-amber-500/40 px-4 py-3 rounded-xl min-w-[150px]">
                <span className="text-slate-500 uppercase text-[10px] block">Prestige Points (PP)</span>
                <span className="text-lg font-bold text-amber-400 mt-0.5 block">
                  {currentPP.format(notation)} PP
                </span>
              </div>

              <div className="bg-slate-950/70 border border-indigo-500/40 px-4 py-3 rounded-xl min-w-[150px]">
                <span className="text-slate-500 uppercase text-[10px] block">Prestige Resets</span>
                <span className="text-lg font-bold text-indigo-300 mt-0.5 block">
                  {state.prestige.count ?? 0}
                </span>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 px-4 py-3 rounded-xl min-w-[150px]">
                <span className="text-slate-500 uppercase text-[10px] block">Current Points</span>
                <span className="text-lg font-bold text-white mt-0.5 block">
                  {state.points.format(notation)}
                </span>
              </div>
            </div>

            {/* Progress Bar towards Prestige Requirement */}
            <div className="w-full max-w-lg space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Progress to Prestige</span>
                <span className="text-indigo-400 font-semibold">{prestigeProgressPercent.toFixed(1)}%</span>
              </div>
              <div
                className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700/60 p-0.5"
                role="progressbar"
                aria-label="Progress to Prestige"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Number(prestigeProgressPercent.toFixed(1))}
              >
                <div
                  className="bg-indigo-500 h-full w-full rounded-full transition-transform duration-150 ease-linear origin-left"
                  style={{ transform: `scaleX(${prestigeProgressPercent / 100})` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>{state.points.format(notation)} Points</span>
                <span>Target: {prestigeReq.format(notation)} Points</span>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onPrestige}
                disabled={!canPrestige}
                className={`px-10 py-3.5 rounded-xl font-bold font-mono text-sm transition-all shadow-lg ${
                  canPrestige
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 active:scale-95 cursor-pointer'
                    : 'bg-slate-800 text-slate-600 border border-slate-750 cursor-not-allowed'
                }`}
              >
                {canPrestige
                  ? `Prestige for +${ppGain.format(notation)} PP [P]`
                  : `Requires ${prestigeReq.format(notation)} Points`}
              </button>
              <span className="text-[11px] font-mono text-slate-500">
                Current Balance: <span className="text-amber-400 font-semibold">{currentPP.format(notation)} PP</span>
              </span>
            </div>

            {/* Reset / Keep Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl text-left pt-4 border-t border-slate-800/80 text-xs">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <span className="font-semibold text-rose-400 font-mono uppercase text-[10px] tracking-wider block mb-1.5">
                  Reset on Prestige
                </span>
                <ul className="space-y-1 text-slate-400">
                  <li>
                    • Points reset back to{' '}
                    <span className="text-white font-medium">
                      {upgs.tickspeedDiscount ? '110 (10 + 100 bonus)' : '10'}
                    </span>
                  </li>
                  <li>• Generator amounts reset to 0</li>
                  <li>• Generator purchase multipliers reset to 1x</li>
                  <li>• Tickspeed upgrades reset to 0</li>
                </ul>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <span className="font-semibold text-emerald-400 font-mono uppercase text-[10px] tracking-wider block mb-1.5">
                  Retained on Prestige
                </span>
                <ul className="space-y-1 text-slate-400">
                  <li>• All purchased Prestige Upgrades (Permanent)</li>
                  <li>• Unlocked Generators (Tiers 5–8 unlocked via Generator Expander)</li>
                  <li>• Prestige Points (PP) balance</li>
                  <li>• Prestige Energy balance, purchased Energy upgrades, and resets</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Prestige Upgrades Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-base text-slate-100">
                  Prestige Upgrades
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Permanent enhancements that accelerate your path towards 1e154 Points and Prestige Energy.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="font-mono text-xs text-amber-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  Balance: {currentPP.format(notation)} PP
                </div>
                {onBuyMaxUpgrades && (
                  <button
                    type="button"
                    onClick={onBuyMaxUpgrades}
                    disabled={currentPP.lt(1)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer shadow-sm ${
                      currentPP.gte(1)
                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Max all upgrades
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {/* Upgrade 1: Order of Magnitude Surge */}
              <div
                className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                  upgs.pointScaling
                    ? 'bg-indigo-950/20 border-indigo-500/40'
                    : currentPP.gte(1)
                    ? 'bg-slate-950/80 border-slate-700 hover:border-indigo-500/60'
                    : 'bg-slate-950/40 border-slate-800 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm text-slate-100">
                      1. Order of Magnitude Surge
                    </h4>
                    {upgs.pointScaling && (
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                        BOUGHT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Points gain is multiplied by 2x for every 1e6 Points you possess (every 6 Orders of Magnitude).
                  </p>
                  <div className="mt-3 text-xs font-mono text-indigo-300">
                    Current: <span className="font-semibold">x{upg1CurrentMult.format(notation)}</span> ({oom6} intervals)
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">
                    Cost: <span className="text-amber-400 font-semibold">1 PP</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onBuyUpgrade('pointScaling')}
                    disabled={upgs.pointScaling || currentPP.lt(1)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                      upgs.pointScaling
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : currentPP.gte(1)
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {upgs.pointScaling ? 'Active' : 'Buy Upgrade'}
                  </button>
                </div>
              </div>

              {/* Upgrade 2: Achievement Resonance */}
              <div
                className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                  upgs.achievementBoost
                    ? 'bg-indigo-950/20 border-indigo-500/40'
                    : currentPP.gte(12)
                    ? 'bg-slate-950/80 border-slate-700 hover:border-indigo-500/60'
                    : 'bg-slate-950/40 border-slate-800 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm text-slate-100">
                      2. Achievement Resonance
                    </h4>
                    {upgs.achievementBoost && (
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                        BOUGHT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    All generators are boosted by 1.05x for each completed achievement, multiplicatively (1.05^achievements). Also factors in honorary achievements from Infinity's Achievement Master!
                  </p>
                  <div className="mt-3 text-xs font-mono text-indigo-300">
                    Current: <span className="font-semibold">x{upg2CurrentMult.format(notation)}</span> to all generators ({totalEffectiveAch} achievements{achMasterBonus > 0 ? `, +${achMasterBonus} bonus` : ''})
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">
                    Cost: <span className="text-amber-400 font-semibold">12 PP</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onBuyUpgrade('achievementBoost')}
                    disabled={upgs.achievementBoost || currentPP.lt(12)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                      upgs.achievementBoost
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : currentPP.gte(12)
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {upgs.achievementBoost ? 'Active' : 'Buy Upgrade'}
                  </button>
                </div>
              </div>

              {/* Upgrade 3A: Cascading Boosts */}
              <div
                className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                  boostLevel >= MAX_CASCADING_BOOSTS
                    ? 'bg-indigo-950/20 border-indigo-500/40'
                    : canAffordBoost
                    ? 'bg-slate-950/80 border-slate-700 hover:border-indigo-500/60'
                    : 'bg-slate-950/40 border-slate-800 opacity-80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm text-slate-100">
                      3A. Cascading Boosts
                    </h4>
                    <span className="text-[10px] font-mono text-indigo-400 font-semibold px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/30">
                      LVL {boostLevel} / {MAX_CASCADING_BOOSTS}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Dimensional boost without reset! Each level multiplies unlocked generators cascadingly by 2x. Price multiplies by 10x per purchase through level 8, then by 40x per purchase!
                  </p>
                  <div className="mt-3 text-xs font-mono text-indigo-300">
                    {boostLevel === 0 ? (
                      <span className="text-slate-500">No active boosts</span>
                    ) : boostLevel < 8 ? (
                      <span>
                        Gen 1: <strong className="text-white">x{getCascadingBoostMultiplierForGen(1, boostLevel).format(notation)}</strong> (Gen 1–{boostLevel} boosted)
                      </span>
                    ) : (
                      <span className="text-emerald-400">
                        Gen 1: x{getCascadingBoostMultiplierForGen(1, boostLevel).format(notation)} · All 8 Gens boosted (Lvl {boostLevel})
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">
                    {boostLevel < MAX_CASCADING_BOOSTS ? (
                      <span>
                        Cost:{' '}
                        <span className="text-amber-400 font-semibold">{boostCost.format(notation)} PP</span>
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-semibold">Max Level Reached</span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onBuyUpgrade('cascadingBoosts')}
                      disabled={!canAffordBoost || boostLevel >= MAX_CASCADING_BOOSTS}
                      className={`px-4 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                        boostLevel >= MAX_CASCADING_BOOSTS
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : canAffordBoost
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold'
                          : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {boostLevel >= MAX_CASCADING_BOOSTS ? 'Maxed' : `Lvl ${boostLevel + 1}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => onBuyMaxUpgrade?.('cascadingBoosts')}
                      disabled={!canAffordBoost || boostLevel >= MAX_CASCADING_BOOSTS}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                        canAffordBoost && boostLevel < MAX_CASCADING_BOOSTS
                          ? 'bg-indigo-800/80 hover:bg-indigo-700 text-white border border-indigo-500/40'
                          : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      }`}
                      title="Buy as many Cascading Boosts levels as possible"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>

              {/* Upgrade 3B: Generator Expander */}
              <div
                className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                  unlockLevel >= MAX_GENERATOR_UNLOCKS
                    ? 'bg-indigo-950/20 border-indigo-500/40'
                    : canAffordUnlock
                    ? 'bg-slate-950/80 border-slate-700 hover:border-indigo-500/60'
                    : 'bg-slate-950/40 border-slate-800 opacity-80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm text-slate-100">
                      3B. Generator Expander
                    </h4>
                    <span className="text-[10px] font-mono text-purple-400 font-semibold px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30">
                      LVL {unlockLevel} / {MAX_GENERATOR_UNLOCKS}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Permanently unlocks higher cascaded generator tiers: sequentially unlocking <strong>Generator 5, 6, 7, and 8</strong>!
                  </p>
                  <div className="mt-3 text-xs font-mono text-purple-300">
                    Active: <span className="text-white font-semibold">{4 + unlockLevel} / 8 Generators</span>
                    {unlockLevel < MAX_GENERATOR_UNLOCKS && (
                      <span className="text-slate-400 block mt-0.5">
                        Next: Unlock Generator {5 + unlockLevel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">
                    {unlockLevel < MAX_GENERATOR_UNLOCKS ? (
                      <span>
                        Unlock Gen {5 + unlockLevel}:{' '}
                        <span className="text-amber-400 font-semibold">{unlockCost.format(notation)} PP</span>
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-semibold">All 8 Gens Unlocked</span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onBuyUpgrade('generatorUnlock')}
                      disabled={!canAffordUnlock || unlockLevel >= MAX_GENERATOR_UNLOCKS}
                      className={`px-4 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                        unlockLevel >= MAX_GENERATOR_UNLOCKS
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : canAffordUnlock
                          ? 'bg-purple-600 hover:bg-purple-500 text-white font-semibold'
                          : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {unlockLevel >= MAX_GENERATOR_UNLOCKS ? 'Maxed' : `Unlock Gen ${5 + unlockLevel}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => onBuyMaxUpgrade?.('generatorUnlock')}
                      disabled={!canAffordUnlock || unlockLevel >= MAX_GENERATOR_UNLOCKS}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                        canAffordUnlock && unlockLevel < MAX_GENERATOR_UNLOCKS
                          ? 'bg-purple-800/80 hover:bg-purple-700 text-white border border-purple-500/40'
                          : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      }`}
                      title="Buy as many Generator Expander levels as possible"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>

              {/* Upgrade 4: Tickspeed Primer */}
              <div
                className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                  upgs.tickspeedDiscount
                    ? 'bg-indigo-950/20 border-indigo-500/40'
                    : currentPP.gte(2)
                    ? 'bg-slate-950/80 border-slate-700 hover:border-indigo-500/60'
                    : 'bg-slate-950/40 border-slate-800 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm text-slate-100">
                      4. Tickspeed Primer
                    </h4>
                    {upgs.tickspeedDiscount && (
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                        BOUGHT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Reduces initial Tickspeed base cost by 100x (from 1,000 down to 10 Points) and grants{' '}
                    <strong className="text-emerald-300 font-semibold">+100 Starting Points</strong> on Prestige (start with 110 Points) so you always have plenty of capital for Generator 1!
                  </p>
                  <div className="mt-3 text-xs font-mono space-y-1">
                    <div className="text-indigo-300">
                      Base Cost: <span className="font-semibold">{upgs.tickspeedDiscount ? '10 Points' : '1,000 Points'}</span>
                    </div>
                    <div className="text-emerald-300">
                      Starting Capital:{' '}
                      <span className="font-semibold text-white">
                        {upgs.tickspeedDiscount ? '110 Points (+100)' : '10 Points'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">
                    Cost: <span className="text-amber-400 font-semibold">2 PP</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onBuyUpgrade('tickspeedDiscount')}
                    disabled={upgs.tickspeedDiscount || currentPP.lt(2)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                      upgs.tickspeedDiscount
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : currentPP.gte(2)
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {upgs.tickspeedDiscount ? 'Active' : 'Buy Upgrade'}
                  </button>
                </div>
              </div>

              {/* Upgrade 5: Prestige Synergy */}
              <div
                className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                  upgs.prestigeSynergy
                    ? 'bg-indigo-950/20 border-indigo-500/40'
                    : currentPP.gte(5)
                    ? 'bg-slate-950/80 border-slate-700 hover:border-indigo-500/60'
                    : 'bg-slate-950/40 border-slate-800 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm text-slate-100">
                      5. Prestige Synergy
                    </h4>
                    {upgs.prestigeSynergy && (
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                        BOUGHT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Points gain is amplified based on unspent Prestige Points directly (1 + PP linear multiplier, without exponent, hardcapped at 1.00e10).
                  </p>
                  <div className="mt-3 text-xs font-mono text-indigo-300">
                    Current: <span className="font-semibold">x{ppSynergyMult.format(notation)}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">
                    Cost: <span className="text-amber-400 font-semibold">5 PP</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onBuyUpgrade('prestigeSynergy')}
                    disabled={upgs.prestigeSynergy || currentPP.lt(5)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                      upgs.prestigeSynergy
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : currentPP.gte(5)
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {upgs.prestigeSynergy ? 'Active' : 'Buy Upgrade'}
                  </button>
                </div>
              </div>

              {/* Upgrade 6: Amplified Doubling (2.25x per purchase) */}
              <div
                className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                  upgs.amplifiedDoubling
                    ? 'bg-indigo-950/20 border-indigo-500/40'
                    : currentPP.gte(15)
                    ? 'bg-slate-950/80 border-slate-700 hover:border-indigo-500/60'
                    : 'bg-slate-950/40 border-slate-800 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm text-slate-100">
                      6. Amplified Doubling
                    </h4>
                    {upgs.amplifiedDoubling && (
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                        BOUGHT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Generator purchase multiplier is boosted from 2.00x to <strong>2.25x per purchase</strong>!
                  </p>
                  <div className="mt-3 text-xs font-mono text-indigo-300">
                    Mult per Buy: <span className="font-semibold">{upgs.amplifiedDoubling ? '2.25x' : '2.00x'}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">
                    Cost: <span className="text-amber-400 font-semibold">15 PP</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onBuyUpgrade('amplifiedDoubling')}
                    disabled={upgs.amplifiedDoubling || currentPP.lt(15)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                      upgs.amplifiedDoubling
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : currentPP.gte(15)
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {upgs.amplifiedDoubling ? 'Active' : 'Buy Upgrade'}
                  </button>
                </div>
              </div>

              {/* Upgrade 7: Chronos Flow */}
              <div
                className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                  upgs.chronosFlow
                    ? 'bg-indigo-950/20 border-indigo-500/40'
                    : currentPP.gte(25)
                    ? 'bg-slate-950/80 border-slate-700 hover:border-indigo-500/60'
                    : 'bg-slate-950/40 border-slate-800 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm text-slate-100">
                      7. Chronos Flow
                    </h4>
                    {upgs.chronosFlow && (
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                        BOUGHT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Tickspeed rate per purchase is increased from 1.10x to <strong>1.15x speed</strong>.
                  </p>
                  <div className="mt-3 text-xs font-mono text-indigo-300">
                    Tickspeed Rate: <span className="font-semibold">{upgs.chronosFlow ? '1.15x' : '1.10x'}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">
                    Cost: <span className="text-amber-400 font-semibold">25 PP</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onBuyUpgrade('chronosFlow')}
                    disabled={upgs.chronosFlow || currentPP.lt(25)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                      upgs.chronosFlow
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : currentPP.gte(25)
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {upgs.chronosFlow ? 'Active' : 'Buy Upgrade'}
                  </button>
                </div>
              </div>

              {/* Upgrade 8: Logarithmic Cascade */}
              <div
                className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                  upgs.logarithmicCascade
                    ? 'bg-indigo-950/20 border-indigo-500/40'
                    : currentPP.gte(50)
                    ? 'bg-slate-950/80 border-slate-700 hover:border-indigo-500/60'
                    : 'bg-slate-950/40 border-slate-800 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm text-slate-100">
                      8. Logarithmic Cascade
                    </h4>
                    {upgs.logarithmicCascade && (
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                        BOUGHT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Points gain is multiplied by log10(points)^2, supercharging deep late-game progression.
                  </p>
                  <div className="mt-3 text-xs font-mono text-indigo-300">
                    Current: <span className="font-semibold">x{logCascadeMult.format(notation)}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">
                    Cost: <span className="text-amber-400 font-semibold">50 PP</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onBuyUpgrade('logarithmicCascade')}
                    disabled={upgs.logarithmicCascade || currentPP.lt(50)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                      upgs.logarithmicCascade
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : currentPP.gte(50)
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {upgs.logarithmicCascade ? 'Active' : 'Buy Upgrade'}
                  </button>
                </div>
              </div>

              {/* Upgrade 9: Cascade Surge */}
              <div
                className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                  upgs.cascadeSurge
                    ? 'bg-indigo-950/20 border-indigo-500/40'
                    : currentPP.gte(100)
                    ? 'bg-slate-950/80 border-slate-700 hover:border-indigo-500/60'
                    : 'bg-slate-950/40 border-slate-800 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm text-slate-100">
                      9. Cascade Surge
                    </h4>
                    {upgs.cascadeSurge && (
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                        BOUGHT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    All generators receive a permanent x2 production multiplier!
                  </p>
                  <div className="mt-3 text-xs font-mono text-indigo-300">
                    Effect: <span className="font-semibold">x2 Output for All Generators</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">
                    Cost: <span className="text-amber-400 font-semibold">100 PP</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onBuyUpgrade('cascadeSurge')}
                    disabled={upgs.cascadeSurge || currentPP.lt(100)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                      upgs.cascadeSurge
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : currentPP.gte(100)
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {upgs.cascadeSurge ? 'Active' : 'Buy Upgrade'}
                  </button>
                </div>
              </div>

              {/* Upgrade 10: Cosmic Resonance */}
              <div
                className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                  upgs.cosmicResonance
                    ? 'bg-indigo-950/20 border-indigo-500/40'
                    : currentPP.gte(50)
                    ? 'bg-slate-950/80 border-slate-700 hover:border-indigo-500/60'
                    : 'bg-slate-950/40 border-slate-800 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm text-slate-100">
                      10. Cosmic Resonance
                    </h4>
                    {upgs.cosmicResonance && (
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                        BOUGHT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Every 10 total generator purchases multiplies each generator by 1.05x multiplicatively.
                  </p>
                  <div className="mt-3 text-xs font-mono text-indigo-300">
                    Current: <span className="font-semibold">x{cosmicResonanceMult.format(notation)} to each Generator</span> ({totalPurchases} purchases)
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">
                    Cost: <span className="text-amber-400 font-semibold">50 PP</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onBuyUpgrade('cosmicResonance')}
                    disabled={upgs.cosmicResonance || currentPP.lt(50)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                      upgs.cosmicResonance
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : currentPP.gte(50)
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {upgs.cosmicResonance ? 'Active' : 'Buy Upgrade'}
                  </button>
                </div>
              </div>
              {state.infinityTree?.feat_2 && (
                <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                  upgs.prestigeSkillSynergy
                    ? 'bg-purple-950/20 border-purple-500/40'
                    : currentPP.gte(1e8)
                    ? 'bg-slate-950/80 border-purple-500/30 hover:border-purple-500/60'
                    : 'bg-slate-950/40 border-slate-800 opacity-70'
                }`}>
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm text-slate-100">11. Prestige Skill Synergy</h4>
                      {upgs.prestigeSkillSynergy && <span className="text-[10px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">BOUGHT</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Unlocks after purchasing Prestige Transcendence (feat_2). When you Infinity, grants extra SP based on Prestige resets in this run: +1 SP at 10 Prestiges, +2 at 100, +3 at 1,000, and so on.
                    </p>
                    <div className="mt-3 text-xs font-mono text-purple-300">Current bonus on next Infinity: <strong>+{prestigeSkillSynergyBonus} SP</strong> ({state.prestige.count} Prestige resets)</div>
                  </div>
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">Cost: <strong className="text-amber-400">1e8 PP</strong></span>
                    {upgs.prestigeSkillSynergy ? <span className="text-xs font-mono text-emerald-400 font-semibold">Active</span> : (
                      <button type="button" onClick={() => onBuyUpgrade('prestigeSkillSynergy')} disabled={currentPP.lt(1e8)} className={`px-4 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${currentPP.gte(1e8) ? 'bg-purple-600 hover:bg-purple-500 text-white font-semibold' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>Buy Upgrade</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Prestige Energy Sub-tab */
        <div className="space-y-6">
          <div className="bg-gradient-to-b from-purple-950/30 via-slate-900 to-slate-900 border border-purple-500/30 rounded-2xl p-8 flex flex-col items-center text-center gap-6 shadow-xl">
            <div className="max-w-xl">
              <span className="text-xs uppercase tracking-widest text-purple-400 font-semibold font-mono">
                Sub-Prestige Layer
              </span>
              <h2 className="text-3xl font-bold text-white mt-1 tracking-tight">
                Prestige Energy
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Prestige Energy is a reset layer unlocked at 1.00e154 Points. It resets Points, Generators, Tickspeed, Prestige Points, and Prestige Upgrades, granting PE using 10^(log10(Points) / 154). Purchased Generator Energy Amplifier levels, Energy Booster levels, and the passive PE generator bonus reset when you Big Crunch into Infinity.
              </p>
            </div>

            {/* Threshold Progress */}
            <div className="w-full max-w-lg space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Energy Threshold Progress</span>
                <span className="text-purple-400 font-semibold">{energyProgressPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700/60 p-0.5">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${energyProgressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>{state.points.format(notation)} Points</span>
                <span>Requirement: {PRESTIGE_ENERGY_THRESHOLD.format(notation)} Points</span>
              </div>
            </div>

            {/* Prestige Energy Action */}
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={onPrestigeEnergy}
                disabled={!canPrestigeEnergy}
                className={`px-10 py-3.5 rounded-xl font-bold font-mono text-sm transition-all shadow-lg ${
                  canPrestigeEnergy
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30 active:scale-95 cursor-pointer'
                    : 'bg-slate-800 text-slate-600 border border-slate-750 cursor-not-allowed'
                }`}
              >
                {canPrestigeEnergy
                  ? `Channel Energy (+${energyGain.format(notation)} PE)`
                  : `Requires ${PRESTIGE_ENERGY_THRESHOLD.format(notation)} Points`}
              </button>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-slate-400">
                  Prestige Energy Balance:{' '}
                  <span className="text-purple-300 font-bold">
                    {state.prestigeEnergy.amount.format(notation)} PE
                  </span>
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400">
                  Bought Upgrade: <span className="text-slate-200">Lv. {energyUpgradeLevel} (x{energyGeneratorMult.format(notation)})</span>
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400">
                  PE Generator Bonus This Infinity: <span className="text-emerald-300">x{passiveEnergyGeneratorMult.format(notation)}</span>
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400">
                  PE Earned This Infinity: <span className="text-slate-200">{lifetimePE.format(notation)}</span>
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400">
                  Total Energy Resets: <span className="text-slate-200">{state.prestigeEnergy.resets}</span>
                </span>
              </div>
            </div>

            {/* Prestige Energy currency upgrade */}
            <div className="w-full max-w-xl rounded-xl border border-purple-500/30 bg-slate-950/70 p-5 text-left space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-100">Generator Energy Amplifier</h3>
                <span className="text-[10px] font-mono rounded border border-purple-500/30 bg-purple-950/50 px-2 py-1 text-purple-300">LEVEL {energyUpgradeLevel}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">Spend Prestige Energy to buy levels. Each level doubles all generator production. The price multiplier starts at x2 and increases by +0.1x for every 10 levels (x2.1 after level 10, x2.2 after level 20, etc.). PE earned during the current Infinity also grants a passive generator multiplier, doubled: 1 PE gives ×4, 2 gives about ×5.10, 3 gives ×7.07, and 4 gives ×10.4. This passive bonus resets on Big Crunch and growth softcaps after 10 PE.</p>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
                <div className="text-xs font-mono text-slate-400">Next level: <strong className="text-purple-300">x{new Decimal(2).pow(energyUpgradeLevel + 1).format(notation)}</strong> all generators · Cost: <strong className="text-amber-400">{energyUpgradeCost.format(notation)} PE</strong></div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={onBuyPrestigeEnergyUpgrade} disabled={state.prestigeEnergy.amount.lt(energyUpgradeCost)} className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold ${state.prestigeEnergy.amount.gte(energyUpgradeCost) ? 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>Buy Level</button>
                  <button type="button" onClick={onBuyMaxPrestigeEnergyUpgrade} disabled={state.prestigeEnergy.amount.lt(energyUpgradeCost)} className={`px-4 py-2 rounded-lg text-xs font-mono font-bold ${state.prestigeEnergy.amount.gte(energyUpgradeCost) ? 'bg-purple-800/80 hover:bg-purple-700 text-white border border-purple-500/40 cursor-pointer' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`} title="Buy as many Generator Energy Amplifier levels as possible">MAX</button>
                </div>
              </div>
            </div>

            {/* Energy Booster: doubles PE gained per Prestige Energy reset. */}
            <div className="w-full max-w-xl rounded-xl border border-amber-500/30 bg-slate-950/70 p-5 text-left space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-100">Energy Booster</h3>
                <span className="text-[10px] font-mono rounded border border-amber-500/30 bg-amber-950/50 px-2 py-1 text-amber-300">LEVEL {energyBoosterLevel}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Each level doubles the Prestige Energy gained from every Energy reset. Cost starts at 10 PE and multiplies by x10 per level.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
                <div className="text-xs font-mono text-slate-400">
                  Current bonus: <strong className="text-emerald-300">x{energyBoosterMult.format(notation)} PE gain</strong>
                  {' · '}Next level: <strong className="text-purple-300">x{new Decimal(2).pow(energyBoosterLevel + 1).format(notation)}</strong>
                  {' · '}Cost: <strong className="text-amber-400">{energyBoosterCost.format(notation)} PE</strong>
                </div>
                <button
                  type="button"
                  onClick={onBuyPrestigeEnergyBooster}
                  disabled={state.prestigeEnergy.amount.lt(energyBoosterCost)}
                  className={state.prestigeEnergy.amount.gte(energyBoosterCost)
                    ? 'px-4 py-2 rounded-lg text-xs font-mono font-semibold bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'
                    : 'px-4 py-2 rounded-lg text-xs font-mono font-semibold bg-slate-800 text-slate-600 cursor-not-allowed'}
                >
                  Buy Level
                </button>
              </div>
            </div>

            {/* Prestige Energy Contract */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl text-left pt-4 border-t border-slate-800/80 text-xs">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <span className="font-semibold text-rose-400 font-mono uppercase text-[10px] tracking-wider block mb-1.5">
                  Reset on Energy Channel
                </span>
                <ul className="space-y-1 text-slate-400">
                  <li>• Points reset back to 10</li>
                  <li>• Generator amounts and bought counts reset</li>
                  <li>• Tickspeed upgrades reset to 0</li>
                  <li>• Prestige Points (PP) and count reset to 0</li>
                  <li>• ALL Prestige Upgrades reset to initial</li>
                  <li>• Active generators reset back to base 4</li>
                </ul>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <span className="font-semibold text-emerald-400 font-mono uppercase text-[10px] tracking-wider block mb-1.5">
                  Retained on Energy Channel
                </span>
                <ul className="space-y-1 text-slate-400">
                  <li>• Unspent Prestige Energy, Generator Energy Amplifier levels, and Energy Booster levels</li>
                  <li>• Total Energy Resets count</li>
                  <li>• Permanent Achievements and Lifetime Statistics</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
