import React, { useState } from 'react';
import { Decimal } from '../utils/decimal';
import { GameState, PrestigeAutobuyerMode, InfinityAutobuyerMode } from '../types/game';
import {
  INFINITY_THRESHOLD,
  calculateInfinityPointGain,
  calculateSkillPointsGain,
  getInfinityMilestoneExtraSP,
  getTemporalInfinityMultiplier,
} from '../utils/gameCalculations';
import { INFINITY_MILESTONES, getInfinityMilestoneRequirementProgress, isInfinityMilestoneUnlocked } from '../utils/infinityMilestones';
import { InfinityTree } from './InfinityTree';
import { Layers, Atom, Cpu } from 'lucide-react';
import { AutomationTab } from './AutomationTab';

interface InfinityTabProps {
  state: GameState;
  onBuyInfinityTreeNode: (nodeId: string) => void;
  onBuyIpDoubler?: () => void;
  onBuyMaxIpDoubler?: () => void;
  onBuyAutomationExpand?: () => void;
  onBuyAchievementMaster?: () => void;
  onBuyIpGeneratorBoost?: () => void;
  onBuyTimeIPBoost?: () => void;
  onBuyEnergySPBoost?: () => void;
  onInfinityReset?: () => void;
  onToggleAutobuyer: (id: string) => void;
  onSetAutobuyerTarget: (id: string, target: number) => void;
  onSetPrestigeAutobuyerSettings: (settings: Partial<{ target: number; mode: PrestigeAutobuyerMode; timeTarget: number; ratioTarget: number }>) => void;
  onSetAutoPrestigeUpgradesSettings?: (settings: Partial<{ priority: 'cheapest' | 'order'; buyAll: boolean }>) => void;
  onSetAutoPrestigeEnergySettings?: (settings: Partial<{ energyMode: 'time' | 'target' | 'gainMultiplier'; energyTimeTarget: number; energyTarget: number; energyRatioTarget: number }>) => void;
  onSetAutoInfinitySettings?: (settings: Partial<{ infinityMode: InfinityAutobuyerMode; infinityTimeTarget: number; infinityTarget: number; infinityRatioTarget: number }>) => void;
}

export const InfinityTab: React.FC<InfinityTabProps> = ({
  state,
  onBuyInfinityTreeNode,
  onBuyIpDoubler,
  onBuyMaxIpDoubler,
  onBuyAutomationExpand,
  onBuyAchievementMaster,
  onBuyIpGeneratorBoost,
  onBuyTimeIPBoost,
  onBuyEnergySPBoost,
  onInfinityReset,
  onToggleAutobuyer,
  onSetAutobuyerTarget,
  onSetPrestigeAutobuyerSettings,
  onSetAutoPrestigeUpgradesSettings,
  onSetAutoPrestigeEnergySettings,
  onSetAutoInfinitySettings,
}) => {
  const [subTab, setSubTab] = useState<'tree' | 'chamber' | 'automation' | 'milestones'>('tree');
  const notation = state.settings.notation;
  const canCrunch = state.points.gte(INFINITY_THRESHOLD);
  const crunchIPGain = calculateInfinityPointGain(state.points, state, state.infinity.count + 1);
  const crunchSPGain = calculateSkillPointsGain(state, state.infinity.count + 1);
  const totalInfinities = Math.max(state.infinity.count || 0, state.stats.totalInfinities || 0);

  return (
    <div className="space-y-6">
      {/* Infinity Banner */}
      <div className="bg-gradient-to-b from-amber-950/40 via-orange-950/20 to-slate-900 border border-amber-500/30 rounded-2xl p-6 md:p-8 flex flex-col items-center text-center gap-6 shadow-xl">
        <div className="max-w-xl">
          <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold font-mono">
            Singularity Tier
          </span>
          <h2 className="text-3xl font-bold text-white mt-1 tracking-tight">
            The Infinity Dimension
          </h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            You have transcended beyond 1.79e308 Points. At this layer, the universe undergoes complete collapse,
            yielding powerful Skill Points (SP) and Infinity Points (IP) to reconstruct cosmic reality.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-mono">
          <div className="bg-slate-950/70 border border-amber-500/40 p-4 rounded-xl min-w-[160px]">
            <span className="text-slate-500 uppercase text-[10px] block">Skill Points (SP)</span>
            <span className="text-xl font-bold text-amber-300 mt-1 block">
              {state.infinity.skillPoints ?? 0} SP
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl min-w-[160px]">
            <span className="text-slate-500 uppercase text-[10px] block">Infinity Points (IP)</span>
            <span className="text-xl font-bold text-amber-400 mt-1 block">
              {state.infinity.points.format(notation)} IP
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl min-w-[160px]">
            <span className="text-slate-500 uppercase text-[10px] block">Total Infinities</span>
            <span className="text-xl font-bold text-orange-400 mt-1 block">
              {state.infinity.count}
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl min-w-[160px]">
            <span className="text-slate-500 uppercase text-[10px] block">Threshold</span>
            <span className="text-xl font-bold text-slate-200 mt-1 block">
              {INFINITY_THRESHOLD.format(notation)}
            </span>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-2 border-t border-slate-800/80 pt-4">
          <button
            type="button"
            onClick={() => setSubTab('tree')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'tree'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Infinity Skill Tree</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('automation')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'automation'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Automation</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('chamber')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'chamber'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Atom className="w-3.5 h-3.5" />
            <span>Infinity Upgrades</span>
          </button>
          {state.infinityTree?.feat_3 && (
            <button
              type="button"
              onClick={() => setSubTab('milestones')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                subTab === 'milestones'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
              }`}
            >
              <span>🏆</span>
              <span>Milestones</span>
            </button>
          )}
        </div>
        {(state.infinityTree?.feat_4 || totalInfinities >= 10 || state.points.gte(INFINITY_THRESHOLD)) && (
          <div className="flex flex-col items-center gap-2 border-t border-slate-800/80 pt-4 w-full">
            <button
              type="button"
              onClick={onInfinityReset}
              disabled={!canCrunch}
              className={`px-8 py-3 rounded-xl text-sm font-bold font-mono transition-all ${
                canCrunch
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30 active:scale-95 cursor-pointer animate-pulse'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              Big Crunch — +{crunchIPGain.format(notation)} IP · +{crunchSPGain} SP
            </button>
            <p className="text-[11px] text-slate-500 font-mono">
              {canCrunch ? 'Reset your current run to gain IP and Skill Points.' : `Reach ${INFINITY_THRESHOLD.format(notation)} Points to Crunch.`}
            </p>
          </div>
        )}
      </div>

      {subTab === 'tree' ? (
        <InfinityTree
          state={state}
          onBuyInfinityTreeNode={onBuyInfinityTreeNode}
        />
      ) : subTab === 'automation' ? (
        <AutomationTab
          state={state}
          onToggleAutobuyer={onToggleAutobuyer}
          onSetAutobuyerTarget={onSetAutobuyerTarget}
          onSetPrestigeAutobuyerSettings={onSetPrestigeAutobuyerSettings}
          onSetAutoPrestigeUpgradesSettings={onSetAutoPrestigeUpgradesSettings}
          onSetAutoPrestigeEnergySettings={onSetAutoPrestigeEnergySettings}
          onSetAutoInfinitySettings={onSetAutoInfinitySettings}
        />
      ) : subTab === 'milestones' ? (
        <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-semibold text-base text-slate-100 flex items-center gap-2"><span>🏆</span> Infinity Milestones</h3>
              <p className="text-xs text-slate-400 mt-1">Rewards unlock after meeting a combination of Infinity count and run-history requirements.</p>
            </div>
            <div className="text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-amber-300">{totalInfinities} Infinities</div>
          </div>
          <div className="space-y-3">
            <p className="text-xs text-slate-400">Milestones unlock when their listed requirements are met. Lifetime IP and playtime requirements are cumulative, so spending IP does not undo progress.</p>
            {INFINITY_MILESTONES.map((milestone) => {
              const unlocked = isInfinityMilestoneUnlocked(state, milestone.id);
              const requirementProgress = getInfinityMilestoneRequirementProgress(state, milestone.id);
              return (
                <div key={milestone.id} className={`flex gap-4 p-4 rounded-xl border ${unlocked ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-slate-950/50 border-slate-800'}`}>
                  <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center text-2xl ${unlocked ? 'bg-emerald-900/40' : 'bg-slate-900 grayscale opacity-70'}`}>{milestone.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-100">{milestone.title}</h4><span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${unlocked ? 'text-emerald-300 border-emerald-500/30 bg-emerald-950/30' : 'text-slate-500 border-slate-700 bg-slate-900'}`}>{unlocked ? 'UNLOCKED' : 'LOCKED'}</span></div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{milestone.reward}</p>
                    <p className="text-[11px] text-slate-500 mt-2">Requirements: {milestone.requirement}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                      {requirementProgress.map((progress, index) => <span key={`${milestone.id}-${index}`} className={`text-[10px] font-mono ${unlocked ? 'text-emerald-400/80' : 'text-slate-500'}`}>{progress}</span>)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500">Additional Skill Points from Endless Momentum and later Skill Point milestones are included in the Big Crunch reward preview.</p>
        </div>
      ) : (
        /* Infinity Chamber Protocols */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-semibold text-base text-slate-100 flex items-center gap-2">
                <Atom className="w-5 h-5 text-amber-400" />
                <span>Infinity Upgrades Matrix</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Permanent upgrades powered by Infinity Points (IP). Unlocked via the Infinity Upgrades Matrix node in the Infinity Tree.
              </p>
            </div>
            <div className="font-mono text-xs text-amber-400 shrink-0 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              Current Balance: {state.infinity.points.format(notation)} IP
            </div>
          </div>

          {!state.infinityTree?.feat_1 ? (
            <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center space-y-3">
              <span className="text-3xl">🔒</span>
              <h4 className="font-bold text-sm text-slate-300">Infinity Upgrades Matrix Locked</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Purchase the <strong className="text-purple-400">Infinity Upgrades Matrix (feat_1)</strong> node in the New Features branch of the Infinity Tree to activate this terminal.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Infinity Upgrades Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Upgrade 1: IP Doubler (Repeatable) */}
                {(() => {
                  const level = state.infinity.ipDoublerLevel || 0;
                  const cost = new Decimal(10).mul(new Decimal(10).pow(level));
                  const canAfford = state.infinity.points.gte(cost);
                  const currentBonus = Math.pow(2, level);

                  return (
                    <div className="p-5 rounded-xl border border-amber-500/40 bg-slate-950/80 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-sm text-slate-100">
                            Double IP Gain
                          </h4>
                          <span className="text-[10px] font-mono text-amber-400 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 font-bold">
                            LVL {level}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                          Doubles the amount of IP gained on each subsequent Infinity. Each purchase increases cost by 10x. Can be purchased infinitely many times!
                        </p>
                        <div className="mt-3 text-xs font-mono text-amber-300">
                          Multiplier: <span className="font-bold">x{currentBonus} IP</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                        <span className="text-xs font-mono text-slate-400">
                          Cost: <strong className="text-amber-400">{cost.format(notation)} IP</strong>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={onBuyIpDoubler}
                            disabled={!canAfford}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                              canAfford
                                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30'
                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            }`}
                          >
                            Buy Upgrade
                          </button>
                          <button
                            type="button"
                            onClick={onBuyMaxIpDoubler}
                            disabled={!canAfford}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                              canAfford
                                ? 'bg-amber-800/80 hover:bg-amber-700 text-white border border-amber-500/40'
                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            }`}
                            title="Buy as many IP Doubler levels as possible"
                          >
                            MAX
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Upgrade 2: Automation Expand */}
                {(() => {
                  const isBought = !!state.infinity.automationExpand;
                  const canAfford = state.infinity.points.gte(20);

                  return (
                    <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                      isBought
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : 'bg-slate-950/80 border-slate-700'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-sm text-slate-100">
                            Automation Expand
                          </h4>
                          {isBought ? (
                            <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 font-bold">
                              UNLOCKED
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-500">
                              ONE-TIME
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                          Unlocks 2 new advanced automation nodes in the Infinity Tree: <strong>Auto: Prestige Upgrades (15 SP)</strong> and <strong>Prestige Energy Autobuyer (30 SP)</strong>.
                        </p>
                        <div className="mt-3 text-xs font-mono text-emerald-300">
                          Status: {isBought ? 'Branch Expanded' : 'Available'}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-400">
                          Cost: <strong className={isBought ? 'text-emerald-400' : 'text-amber-400'}>20 IP</strong>
                        </span>
                        {isBought ? (
                          <span className="text-xs font-mono text-emerald-400 font-semibold">Active</span>
                        ) : (
                          <button
                            type="button"
                            onClick={onBuyAutomationExpand}
                            disabled={!canAfford}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                              canAfford
                                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30'
                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            }`}
                          >
                            Unlock
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Upgrade 3: Achievement Master */}
                {(() => {
                  const isBought = !!state.infinity.achievementMaster;
                  const canAfford = state.infinity.points.gte(15);
                  const extraCompletions = isBought && state.points.gt(0) && state.points.mantissa
                    ? Math.floor(Math.max(0, state.points.log10()))
                    : 0;

                  return (
                    <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                      isBought
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : 'bg-slate-950/80 border-slate-700'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-sm text-slate-100">
                            Achievement Master
                          </h4>
                          {isBought ? (
                            <span className="text-[10px] font-mono text-amber-400 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 font-bold">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-500">
                              ONE-TIME
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                          For every magnitude (log10) of Points achieved, grants +1 honorary achievement completion. Infinite scalability without notification spam. Directly multiplies Achievement Resonance!
                        </p>
                        {isBought && (
                          <div className="mt-3 text-xs font-mono text-amber-300">
                            Current Bonus: <span className="font-bold">+{extraCompletions} achievements</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-400">
                          Cost: <strong className={isBought ? 'text-amber-400' : 'text-amber-400'}>15 IP</strong>
                        </span>
                        {isBought ? (
                          <span className="text-xs font-mono text-amber-400 font-semibold">Active</span>
                        ) : (
                          <button
                            type="button"
                            onClick={onBuyAchievementMaster}
                            disabled={!canAfford}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                              canAfford
                                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30'
                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            }`}
                          >
                            Unlock
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Upgrade 4: IP-scaled Generator Boost */}
                {(() => {
                  const isBought = !!state.infinity.ipGeneratorBoost;
                  const lifetimeIP = state.infinity.totalEarnedIP || state.infinity.points;
                  const currentMult = lifetimeIP.gt(0) ? new Decimal(3).pow(Math.max(0, lifetimeIP.log10())) : Decimal.one();
                  const canAfford = state.infinity.points.gte(1);
                  return (
                    <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 ${isBought ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-slate-950/80 border-slate-700'}`}>
                      <div>
                        <div className="flex items-center justify-between gap-2"><h4 className="font-semibold text-sm text-slate-100">IP Resonance</h4><span className="text-[10px] font-mono text-amber-400">ONE-TIME</span></div>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">All generators are boosted by 3^log10(total IP ever earned). Spent IP still counts toward this effect.</p>
                        <div className="mt-3 text-xs font-mono text-amber-300">Current generator bonus: <strong>x{currentMult.format(notation)}</strong></div>
                      </div>
                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between"><span className="text-xs font-mono text-slate-400">Cost: <strong className="text-amber-400">1 IP</strong></span>{isBought ? <span className="text-xs text-emerald-400 font-semibold">Active</span> : <button type="button" onClick={onBuyIpGeneratorBoost} disabled={!canAfford} className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold ${canAfford ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>Buy Upgrade</button>}</div>
                    </div>
                  );
                })()}

                {/* Upgrade 5: Time-based IP gain */}
                {(() => {
                  const isBought = !!state.infinity.timeIPBoost;
                  const currentMult = getTemporalInfinityMultiplier(state);
                  const has400 = isInfinityMilestoneUnlocked(state, 'milestone_400_temporal_boost');
                  const canAfford = state.infinity.points.gte(5);
                  return (
                    <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 ${isBought ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-slate-950/80 border-slate-700'}`}>
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-sm text-slate-100">Temporal Infinity</h4>
                          <span className="text-[10px] font-mono text-amber-400">ONE-TIME</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                          Infinity Point gain is multiplied by 1 + 0.002 × seconds spent in the current Infinity
                          {has400 ? ' (strengthened by 5x from Milestone 400!)' : '.'}
                        </p>
                        <div className="mt-3 text-xs font-mono text-amber-300">
                          Current time bonus: <strong>x{currentMult.toFixed(2)}</strong>
                          {has400 && <span className="ml-2 text-emerald-400 font-bold">(5x Boosted)</span>}
                        </div>
                      </div>
                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between"><span className="text-xs font-mono text-slate-400">Cost: <strong className="text-amber-400">5 IP</strong></span>{isBought ? <span className="text-xs text-emerald-400 font-semibold">Active</span> : <button type="button" onClick={onBuyTimeIPBoost} disabled={!canAfford} className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold ${canAfford ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>Buy Upgrade</button>}</div>
                    </div>
                  );
                })()}

                {/* Upgrade 6: SP-based Prestige Energy gain */}
                {(() => {
                  const isBought = !!state.infinity.energySPBoost;
                  const currentMult = Math.max(1, (state.infinity.skillPoints || 0) + 1);
                  const canAfford = state.infinity.points.gte(8);
                  return (
                    <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 ${isBought ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-slate-950/80 border-slate-700'}`}>
                      <div>
                        <div className="flex items-center justify-between gap-2"><h4 className="font-semibold text-sm text-slate-100">Skill-Powered Energy</h4><span className="text-[10px] font-mono text-amber-400">ONE-TIME</span></div>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">Prestige Energy gain is multiplied by (unspent SP + 1). Spending SP on the tree lowers this bonus.</p>
                        <div className="mt-3 text-xs font-mono text-amber-300">Current PE bonus: <strong>x{currentMult}</strong></div>
                      </div>
                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between"><span className="text-xs font-mono text-slate-400">Cost: <strong className="text-amber-400">8 IP</strong></span>{isBought ? <span className="text-xs text-emerald-400 font-semibold">Active</span> : <button type="button" onClick={onBuyEnergySPBoost} disabled={!canAfford} className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold ${canAfford ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>Buy Upgrade</button>}</div>
                    </div>
                  );
                })()}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
};
