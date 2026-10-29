import React from 'react';
import { Decimal } from '../utils/decimal';
import { GameState } from '../types/game';
import { getTotalTickspeedSpeed, getPointsGenerationMultiplier, MY_SOFTCAP_THRESHOLD } from '../utils/gameCalculations';

interface PointsDisplayProps {
  state: GameState;
  activeTab?: string;
}

export const PointsDisplay: React.FC<PointsDisplayProps> = ({ state, activeTab }) => {
  const notation = state.settings.notation;
  const tickspeedSpeed = getTotalTickspeedSpeed(state);
  const pointsMult = getPointsGenerationMultiplier(state);
  const prestigeResets = state.prestige.count ?? 0;
  const hasReachedMySoftcap = (state.points?.exponent ?? 0) >= 1_000_000 || (state.points instanceof Decimal ? state.points.gte(MY_SOFTCAP_THRESHOLD) : false);

  return (
    <div className="bg-slate-900/90 border-b border-slate-800/80 px-6 py-5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Main Points Display */}
        <div className="flex flex-col">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl md:text-4xl font-bold tracking-tight text-white font-mono tabular-nums">
              {state.points.format(notation)}
            </span>
            <span className="text-sm font-medium text-slate-400">
              Points
            </span>
            {hasReachedMySoftcap && (
              <span className="ml-1 text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 tracking-wide uppercase shadow-sm">
                My Softcap
              </span>
            )}
          </div>
          {hasReachedMySoftcap && (
            <div className="mt-1 text-xs font-mono text-cyan-300 font-medium">
              Starts at 1e1,000,000 Points · Point gain is softened to ^0.95 beyond this threshold
            </div>
          )}
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono flex-wrap">
            <span>+{state.pointsPerSecond.format(notation)} / sec</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>
              Tickspeed: {tickspeedSpeed.format(notation)}x
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span title="Points multiplier from Prestige Upgrades, Achievements, and PP Synergy">
              Points Mult: <strong className="text-emerald-400 font-semibold">{pointsMult.format(notation)}x</strong>
            </span>
          </div>
        </div>

        {/* Secondary Prestige Indicators displayed next to points when in Prestige tab */}
        {activeTab === 'prestige' && (
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <div className="bg-slate-950/80 border border-amber-500/30 px-3.5 py-2 rounded-xl shadow-sm flex items-center gap-2">
              <span className="text-slate-400 uppercase text-[10px] tracking-wider">Prestige Points:</span>
              <span className="text-amber-400 font-bold text-sm">
                {state.prestige.points.format(notation)} PP
              </span>
            </div>
            <div className="bg-slate-950/80 border border-indigo-500/30 px-3.5 py-2 rounded-xl shadow-sm flex items-center gap-2">
              <span className="text-slate-400 uppercase text-[10px] tracking-wider">Prestige Resets:</span>
              <span className="text-indigo-400 font-bold text-sm">
                {prestigeResets}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
