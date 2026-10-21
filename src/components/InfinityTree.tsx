import React, { useState } from 'react';
import { GameState } from '../types/game';
import { INFINITY_TREE_NODES, BRANCH_CONFIG } from '../constants/infinityTree';
import { Decimal } from '../utils/decimal';
import { getInfinityGeneratorMultiplier } from '../utils/gameCalculations';
import {
  Sparkles,
  Layers,
  CheckCircle2,
  Lock,
  ArrowDown,
} from 'lucide-react';

interface InfinityTreeProps {
  state: GameState;
  onBuyInfinityTreeNode: (nodeId: string) => void;
}

export const InfinityTree: React.FC<InfinityTreeProps> = ({
  state,
  onBuyInfinityTreeNode,
}) => {
  const [selectedBranch, setSelectedBranch] = useState<'all' | 'pre' | 'auto' | 'feat'>('all');

  const notation = state.settings.notation;
  const currentIP = state.infinity.points;
  const currentSP = state.infinity.skillPoints ?? 0;
  const totalInfinities = state.infinity.count || state.stats.totalInfinities || 0;
  const tree = state.infinityTree || {};
  const temporalSurgeMultiplier = 1 + ((state.stats?.timeThisInfinity || 0) * 0.01);

  // Root node multiplier: 2^Infinities up to 100, then x1.2 per additional Infinity.
  const rootMultiplier = totalInfinities > 0 ? getInfinityGeneratorMultiplier(totalInfinities) : Decimal.one();
  const rootDef = INFINITY_TREE_NODES['root'];

  // 3 branches as specified by user
  const branches = [
    { key: 'pre' as const, title: 'Pre-Infinity', nodes: ['pre_1', 'pre_2', 'pre_3', 'pre_4'] },
    { key: 'auto' as const, title: 'Automation', nodes: ['auto_1', 'auto_2', 'auto_3', 'auto_4', 'auto_5', 'auto_6'] },
    { key: 'feat' as const, title: 'New Features', nodes: ['feat_1', 'feat_2', 'feat_3', 'feat_4'] },
  ];

  return (
    <div className="space-y-6">
      {/* Tree Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <span>Infinity Skill Tree</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            The root node amplifies all generators by <code className="text-amber-400 font-mono font-semibold">2^Infinities</code> up to 100 Infinities, then adds <code className="text-amber-400 font-mono font-semibold">x1.2</code> per extra Infinity. Nodes cost <strong>Skill Points (SP)</strong>, earned at 1 SP per Infinity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-950 border border-amber-500/30 px-3.5 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2">
            <span className="text-slate-400">Balance:</span>
            <span className="text-amber-400 font-bold text-sm">{currentSP} SP</span>
          </div>

          {/* Branch Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            type="button"
            onClick={() => setSelectedBranch('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              selectedBranch === 'all'
                ? 'bg-slate-800 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Branches
          </button>
          {branches.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => setSelectedBranch(b.key)}
              className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-xs ${
                selectedBranch === b.key
                  ? 'bg-amber-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {b.title}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* ROOT NODE CARD */}
      <div className="flex flex-col items-center">
        <div className="w-full max-w-lg bg-gradient-to-b from-amber-950/40 to-slate-950 border-2 border-amber-500/60 rounded-2xl p-5 text-center shadow-xl relative overflow-hidden">
          <div className="absolute top-2 right-2">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <CheckCircle2 className="w-3 h-3 text-amber-400" /> ACTIVE ROOT
            </span>
          </div>

          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shadow-inner mb-2.5">
            ⚡
          </div>

          <h4 className="text-base font-bold text-white tracking-wide">
            {rootDef.title}
          </h4>
          <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
            {rootDef.desc}
          </p>

          <div className="mt-3.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-amber-500/40 text-xs font-mono text-amber-300">
            <span>Generator Boost:</span>
            <strong className="text-amber-400 text-sm">
              x{rootMultiplier.format(notation)}
            </strong>
            <span className="text-[10px] text-slate-400">
              ({totalInfinities <= 100
                ? `2^${totalInfinities}`
                : `2^100 × 1.2^${totalInfinities - 100}`})
            </span>
          </div>
        </div>

        {/* Connector arrow */}
        <div className="flex flex-col items-center my-3 text-slate-600">
          <div className="w-0.5 h-6 bg-gradient-to-b from-amber-500/60 to-slate-700"></div>
          <ArrowDown className="w-4 h-4 text-slate-500 -mt-1" />
        </div>
      </div>

      {/* 3 BRANCHES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {branches.map((branch) => {
          if (selectedBranch !== 'all' && selectedBranch !== branch.key) return null;
          const branchStyle = BRANCH_CONFIG[branch.key];

          return (
            <div
              key={branch.key}
              className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-4"
            >
              {/* Branch Header */}
              <div className={`p-3 rounded-xl border ${branchStyle.badge} flex items-center justify-between`}>
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider">
                    {branch.title}
                  </h4>
                  <span className="text-[10px] opacity-80 font-mono block">
                    Branch Progression
                  </span>
                </div>
                <span className="text-xs font-mono font-bold">
                  {branch.nodes.filter((id) => tree[id]).length}/{branch.nodes.length}
                </span>
              </div>

              {/* Nodes Stack */}
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                {branch.nodes.map((nodeId, idx) => {
                  const node = INFINITY_TREE_NODES[nodeId];
                  if (!node) return null;

                  const isBought = !!tree[nodeId];
                  const parentBought = node.req === 'root' || !!tree[node.req];
                  const upgradeSatisfied = !node.reqUpgrade || !!state.infinity[node.reqUpgrade as keyof typeof state.infinity];
                  const canAfford = currentSP >= node.cost;
                  const canBuy = !isBought && parentBought && upgradeSatisfied && canAfford;
                  const isLocked = !isBought && (!parentBought || !upgradeSatisfied);

                  return (
                    <div key={nodeId} className="relative">
                      {idx > 0 && (
                        <div className="w-0.5 h-3 bg-slate-800 mx-auto -mt-1.5 mb-1.5"></div>
                      )}

                      <div
                        className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                          isBought
                            ? 'bg-slate-900/90 border-emerald-500/40 text-slate-200'
                            : canBuy
                            ? 'bg-slate-900 border-amber-500/50 hover:border-amber-400 hover:shadow-md cursor-pointer'
                            : isLocked
                            ? 'bg-slate-950/40 border-slate-800/60 opacity-50'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1.5 mb-1">
                            <span className="text-sm font-bold flex items-center gap-1.5">
                              <span>{node.icon || '✦'}</span>
                              <span className="text-xs font-semibold text-slate-100">
                                {node.title}
                              </span>
                            </span>
                            {isBought && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                            {isLocked && (
                              <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            )}
                          </div>

                          <p className="text-[11px] text-slate-300 leading-tight">
                            {node.desc}
                          </p>
                          {node.reqUpgrade === 'automationExpand' && !state.infinity.automationExpand && (
                            <p className="text-[10px] text-amber-400 font-mono mt-1">
                              Requires &quot;Automation Expand&quot; in Infinity Upgrades
                            </p>
                          )}
                          {nodeId === 'pre_1' && isBought && (
                            <div className="mt-2 rounded-lg bg-slate-950/80 border border-amber-500/20 p-2 space-y-1 text-[10px] font-mono">
                              <div className="flex justify-between gap-2"><span className="text-slate-500">Base bonus</span><span className="text-slate-300">x1.00</span></div>
                              <div className="flex justify-between gap-2"><span className="text-slate-500">Growth</span><span className="text-amber-300">+0.01x / second</span></div>
                              <div className="flex justify-between gap-2"><span className="text-slate-500">Current bonus</span><span className="text-emerald-300">x{temporalSurgeMultiplier.toFixed(2)}</span></div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] font-mono">
                          <span className="text-slate-400">
                            Cost:{' '}
                            <strong className={isBought ? 'text-emerald-400' : 'text-amber-400'}>
                              {node.cost} SP
                            </strong>
                          </span>

                          {isBought ? (
                            <span className="text-emerald-400 font-semibold uppercase">
                              Purchased
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={!canBuy}
                              onClick={() => onBuyInfinityTreeNode(nodeId)}
                              className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                                canBuy
                                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm active:scale-95'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              {isLocked ? (node.reqUpgrade && !upgradeSatisfied ? 'Need Expand' : 'Locked') : canAfford ? 'Buy' : 'Need SP'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
