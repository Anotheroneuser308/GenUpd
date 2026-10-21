import React, { useState } from 'react';
import { Decimal } from '../utils/decimal';
import { GameState, PrestigeAutobuyerMode } from '../types/game';
import { INFINITY_THRESHOLD } from '../utils/gameCalculations';
import { InfinityTree } from './InfinityTree';
import { Layers, Atom, Cpu } from 'lucide-react';
import { AutomationTab } from './AutomationTab';

interface InfinityTabProps {
  state: GameState;
  onBuyInfinityTreeNode: (nodeId: string) => void;
  onBuyIpDoubler?: () => void;
  onBuyAutomationExpand?: () => void;
  onBuyAchievementMaster?: () => void;
  onToggleAutobuyer: (id: string) => void;
  onSetAutobuyerTarget: (id: string, target: number) => void;
  onSetPrestigeAutobuyerSettings: (settings: Partial<{ target: number; mode: PrestigeAutobuyerMode; timeTarget: number; ratioTarget: number }>) => void;
  onSetAutoPrestigeUpgradesSettings?: (settings: Partial<{ priority: 'cheapest' | 'order'; buyAll: boolean }>) => void;
  onSetAutoPrestigeEnergySettings?: (settings: Partial<{ energyMode: 'time' | 'target' | 'gainMultiplier'; energyTimeTarget: number; energyTarget: number; energyRatioTarget: number }>) => void;
}

export const InfinityTab: React.FC<InfinityTabProps> = ({
  state,
  onBuyInfinityTreeNode,
  onBuyIpDoubler,
  onBuyAutomationExpand,
  onBuyAchievementMaster,
  onToggleAutobuyer,
  onSetAutobuyerTarget,
  onSetPrestigeAutobuyerSettings,
  onSetAutoPrestigeUpgradesSettings,
  onSetAutoPrestigeEnergySettings,
}) => {
  const [subTab, setSubTab] = useState<'tree' | 'chamber' | 'automation'>('tree');
  const notation = state.settings.notation;

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
        </div>
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
        />
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

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-400">
                          Cost: <strong className="text-amber-400">{cost.format(notation)} IP</strong>
                        </span>
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
              </div>

              {/* Advanced System Tiers */}
              <div className="border-t border-slate-800 pt-4">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono mb-3">
                  Transcendental Systems
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">Tier 2</span>
                      <h5 className="font-semibold text-xs text-slate-200 mt-1">Prestige Transcendence</h5>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Unlocked via New Features Node 2 (feat_2) on the Infinity Tree.
                      </p>
                    </div>
                    <div className="mt-3 text-[10px] font-mono text-purple-400">
                      {state.infinityTree?.feat_2 ? 'Unlocked' : 'Requires Node feat_2'}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">Tier 3</span>
                      <h5 className="font-semibold text-xs text-slate-200 mt-1">Infinity Milestones</h5>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Unlocked via New Features Node 3 (feat_3) on the Infinity Tree.
                      </p>
                    </div>
                    <div className="mt-3 text-[10px] font-mono text-purple-400">
                      {state.infinityTree?.feat_3 ? 'Unlocked' : 'Requires Node feat_3'}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">Tier 4</span>
                      <h5 className="font-semibold text-xs text-slate-200 mt-1">Break Infinity</h5>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Unlocked via Break Infinity (feat_4) on the Infinity Tree.
                      </p>
                    </div>
                    <div className="mt-3 text-[10px] font-mono text-purple-400">
                      {state.infinityTree?.feat_4 ? 'Active (Uncapped!)' : 'Requires Node feat_4'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
