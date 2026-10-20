import React, { useState } from 'react';
import { GameState } from '../types/game';
import { INFINITY_THRESHOLD } from '../utils/gameCalculations';
import { InfinityTree } from './InfinityTree';
import { Sparkles, Layers, Shield, Atom } from 'lucide-react';

interface InfinityTabProps {
  state: GameState;
  onBuyInfinityTreeNode: (nodeId: string) => void;
}

export const InfinityTab: React.FC<InfinityTabProps> = ({
  state,
  onBuyInfinityTreeNode,
}) => {
  const [subTab, setSubTab] = useState<'tree' | 'chamber'>('tree');
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
            yielding powerful Infinity Points (IP) to reconstruct cosmic reality through the Infinity Skill Tree.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-mono">
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
            onClick={() => setSubTab('chamber')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'chamber'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Atom className="w-3.5 h-3.5" />
            <span>Chamber & Protocols</span>
          </button>
        </div>
      </div>

      {/* Render selected subtab */}
      {subTab === 'tree' ? (
        <InfinityTree
          state={state}
          onBuyInfinityTreeNode={onBuyInfinityTreeNode}
        />
      ) : (
        /* Infinity Chamber Protocols */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-semibold text-base text-slate-100">
                Infinity Protocols & Expansion
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Advanced singularity features unlocked through the New Features branch of the Infinity Tree.
              </p>
            </div>
            <div className="font-mono text-xs text-amber-400 shrink-0">
              Current Balance: {state.infinity.points.format(notation)} IP
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="p-4 rounded-xl border border-dashed border-amber-500/30 bg-amber-950/10 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">Protocol 1</span>
                <h4 className="font-semibold text-xs text-slate-200 mt-1">Infinity Upgrades</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Unlocked via New Features Node 1 (3 IP) on the Infinity Tree.
                </p>
              </div>
              <div className="mt-3 text-[10px] font-mono text-amber-500/80">
                {state.infinityTree?.feat_1 ? 'Unlocked' : 'Requires Node feat_1'}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-dashed border-amber-500/30 bg-amber-950/10 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">Protocol 2</span>
                <h4 className="font-semibold text-xs text-slate-200 mt-1">Prestige Transcendence</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Unlocked via New Features Node 2 (10 IP) on the Infinity Tree.
                </p>
              </div>
              <div className="mt-3 text-[10px] font-mono text-amber-500/80">
                {state.infinityTree?.feat_2 ? 'Unlocked' : 'Requires Node feat_2'}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-dashed border-amber-500/30 bg-amber-950/10 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">Protocol 3</span>
                <h4 className="font-semibold text-xs text-slate-200 mt-1">Infinity Milestones</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Unlocked via New Features Node 3 (50 IP) on the Infinity Tree.
                </p>
              </div>
              <div className="mt-3 text-[10px] font-mono text-amber-500/80">
                {state.infinityTree?.feat_3 ? 'Unlocked' : 'Requires Node feat_3'}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-dashed border-amber-500/30 bg-amber-950/10 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">Protocol 4</span>
                <h4 className="font-semibold text-xs text-slate-200 mt-1">Break Infinity</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Unlocked via New Features Node 4 (10,000 IP) on the Infinity Tree.
                </p>
              </div>
              <div className="mt-3 text-[10px] font-mono text-amber-500/80">
                {state.infinityTree?.feat_4 ? 'Active (Uncapped!)' : 'Requires Node feat_4'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
