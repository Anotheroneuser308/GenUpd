import React, { useState } from 'react';
import { GameState } from '../types/game';
import { INFINITY_TREE_NODES, BRANCH_CONFIG } from '../constants/infinityTree';
import { Decimal } from '../utils/decimal';
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
  const totalInfinities = state.infinity.count || state.stats.totalInfinities || 0;
  const tree = state.infinityTree || {};

  // Root node multiplier: 4^Infinities
  const rootMultiplier = totalInfinities > 0 ? new Decimal(4).pow(totalInfinities) : Decimal.one();
  const rootDef = INFINITY_TREE_NODES['root'];

  // 3 branches as specified by user
  const branches = [
    { key: 'pre' as const, title: 'Pre-Infinity', nodes: ['pre_1', 'pre_2', 'pre_3', 'pre_4'] },
    { key: 'auto' as const, title: 'Automation', nodes: ['auto_1', 'auto_2', 'auto_3', 'auto_4'] },
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
            The root node amplifies all generators by <code className="text-amber-400 font-mono font-semibold">4^Infinities</code>, feeding 3 expansion paths.
          </p>
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
              (4^{totalInfinities})
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
                  {branch.nodes.filter((id) => tree[id]).length}/4
                </span>
              </div>

              {/* Nodes Stack */}
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                {branch.nodes.map((nodeId, idx) => {
                  const node = INFINITY_TREE_NODES[nodeId];
                  if (!node) return null;

                  const isBought = !!tree[nodeId];
                  const parentBought = node.req === 'root' || !!tree[node.req];
                  const canAfford = currentIP.gte(node.cost);
                  const canBuy = !isBought && parentBought && canAfford;
                  const isLocked = !isBought && !parentBought;

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
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] font-mono">
                          <span className="text-slate-400">
                            Cost:{' '}
                            <strong className={isBought ? 'text-emerald-400' : 'text-amber-400'}>
                              {node.cost.toLocaleString()} IP
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
                              {isLocked ? 'Locked' : canAfford ? 'Buy' : 'Need IP'}
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
