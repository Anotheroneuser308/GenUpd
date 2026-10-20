import React from 'react';
import { GameState } from '../types/game';
import { getTotalTickspeedSpeed } from '../utils/gameCalculations';

interface PointsDisplayProps {
  state: GameState;
}

export const PointsDisplay: React.FC<PointsDisplayProps> = ({ state }) => {
  const notation = state.settings.notation;
  const tickspeedSpeed = getTotalTickspeedSpeed(state);

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
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
            <span>+{state.pointsPerSecond.format(notation)} / sec</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>
              Tickspeed: {tickspeedSpeed.format(notation)}x
            </span>
          </div>
        </div>

        {/* Secondary Prestige Indicators */}
        <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400 font-mono">
          <div className="flex flex-col">
            <span className="text-slate-500 uppercase tracking-wider text-[10px]">
              Prestige Points
            </span>
            <span className="text-amber-400 font-semibold text-base tabular-nums">
              {state.prestige.points.format(notation)} PP
            </span>
          </div>

          <div className="h-8 w-px bg-slate-800 hidden sm:block" />

          <div className="flex flex-col">
            <span className="text-slate-500 uppercase tracking-wider text-[10px]">
              Total Prestiges
            </span>
            <span className="text-indigo-400 font-semibold text-base tabular-nums">
              {state.prestige.count}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-800 hidden sm:block" />

          <div className="flex flex-col">
            <span className="text-slate-500 uppercase tracking-wider text-[10px]">
              Active Generators
            </span>
            <span className="text-emerald-400 font-semibold text-base tabular-nums">
              {state.prestige.unlockedGenerators} / 8
            </span>
          </div>

          {state.prestigeEnergy?.unlocked && (
            <>
              <div className="h-8 w-px bg-slate-800 hidden sm:block" />
              <div className="flex flex-col">
                <span className="text-slate-500 uppercase tracking-wider text-[10px]">
                  Generators Mult
                </span>
                <span className="text-purple-400 font-semibold text-base tabular-nums">
                  x{state.prestigeEnergy.multiplier.format(notation)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
