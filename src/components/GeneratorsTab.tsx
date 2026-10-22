import React from 'react';
import { GameState } from '../types/game';
import { Decimal } from '../utils/decimal';
import {
  getGeneratorCost,
  getTotalTickspeedSpeed,
  getPointsGenerationMultiplier,
} from '../utils/gameCalculations';

interface GeneratorsTabProps {
  state: GameState;
  onBuyGenerator: (id: number) => void;
  onBuyMaxGenerator: (id: number) => void;
  onBuyTickspeed: () => void;
  onBuyMaxTickspeed: () => void;
}

export const GeneratorsTab: React.FC<GeneratorsTabProps> = ({
  state,
  onBuyGenerator,
  onBuyMaxGenerator,
  onBuyTickspeed,
  onBuyMaxTickspeed,
}) => {
  const notation = state.settings.notation;
  const totalTickspeed = getTotalTickspeedSpeed(state);
  const pointsMult = getPointsGenerationMultiplier(state);
  const costScaling = state.points.gte(new Decimal(1, 308)) || state.tickspeed.cost.gte(new Decimal(1, 308)) ? '300x' : '15x';
  const canAffordTickspeed = state.points.gte(state.tickspeed.cost);
  const unlockedCount = state.prestige.unlockedGenerators;

  return (
    <div className="space-y-6">
      {/* Tickspeed Controller Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-100">
              Tickspeed Acceleration
            </span>
            <span className="text-xs text-slate-500 font-mono">
              [Hotkey: T]
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5 font-mono">
            <span>
              Speed: <strong className="text-cyan-300">{totalTickspeed.format(notation)}x</strong>
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>
              Points Mult: <strong className="text-emerald-300">{pointsMult.format(notation)}x</strong>
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>
              Bought: {state.tickspeed.bought}
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className={state.points.gte(new Decimal(1, 308)) ? 'text-amber-400 font-semibold' : 'text-slate-500'}>
              Cost Scale: {costScaling}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onBuyTickspeed}
            disabled={!canAffordTickspeed}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-medium transition-colors whitespace-nowrap ${
              canAffordTickspeed
                ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 cursor-pointer'
                : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
            }`}
          >
            Buy Tickspeed ({state.tickspeed.cost.format(notation)})
          </button>
          <button
            type="button"
            onClick={onBuyMaxTickspeed}
            disabled={!canAffordTickspeed}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-colors whitespace-nowrap ${
              canAffordTickspeed
                ? 'bg-cyan-700/80 hover:bg-cyan-600 text-white border border-cyan-500/40 cursor-pointer'
                : 'bg-slate-900 text-slate-700 border border-slate-800 cursor-not-allowed'
            }`}
            title="Buy as many Tickspeed levels as possible"
          >
            MAX
          </button>
        </div>
      </div>

      {/* Mechanics Banner: 2x multiplier rule */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-mono text-slate-400">
        <span>★ Multiplier Rule: Each purchase of a generator multiplies its output by 2x.</span>
        <span className="text-slate-500 text-[11px]">Resets upon Prestige</span>
      </div>

      {/* Generators Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80">
        {state.generators.map((gen, idx) => {
          const genNumber = idx + 1;
          const isUnlocked = genNumber <= unlockedCount;
          const cost = getGeneratorCost(gen.baseCost, gen.costMult, gen.bought, gen.id, state.generatorCostSoftcapBought?.[gen.id - 1] ?? null);
          const canAfford = state.points.gte(cost);

          // Production rate preview
          let producesText = '';
          if (isUnlocked && gen.amount.gt(0)) {
            if (genNumber === 1) {
              producesText = `→ +${state.pointsPerSecond.format(notation)} Points/sec`;
            } else {
              const rate = gen.amount.mul(gen.multiplier);
              producesText = `→ +${rate.format(notation)} Gen ${genNumber - 1}/sec`;
            }
          }

          if (!isUnlocked) {
            return (
              <div
                key={gen.id}
                className="p-4 flex items-center justify-between text-xs text-slate-500 bg-slate-950/40"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-600">
                    Generator {genNumber}
                  </span>
                </div>
                <div className="font-mono text-slate-600">
                  Locked (Requires Generator Expander Level {genNumber - 4} in Prestige)
                </div>
              </div>
            );
          }

          return (
            <div
              key={gen.id}
              className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
            >
              {/* Left Column: Generator Name & Multiplier */}
              <div className="min-w-[200px]">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-sm text-slate-100">
                    {gen.name}
                  </span>
                  <span className="text-xs font-mono font-medium text-indigo-400">
                    x{gen.multiplier.format(notation)}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  {producesText || 'Idle'}
                </div>
              </div>

              {/* Middle Column: Amount and Bought count */}
              <div className="flex items-baseline gap-2 font-mono text-sm">
                <span className="text-slate-100 font-semibold tabular-nums text-base">
                  {gen.amount.format(notation)}
                </span>
                <span className="text-xs text-slate-500 tabular-nums">
                  ({gen.bought} bought · 2^{gen.bought})
                </span>
              </div>

              {/* Right Column: Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onBuyGenerator(gen.id)}
                  disabled={!canAfford}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors whitespace-nowrap ${
                    canAfford
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm cursor-pointer'
                      : 'bg-slate-800/60 text-slate-600 cursor-not-allowed border border-slate-800'
                  }`}
                  title={`Hotkey: ${genNumber}`}
                >
                  Buy 1 ({cost.format(notation)})
                </button>

                <button
                  type="button"
                  onClick={() => onBuyMaxGenerator(gen.id)}
                  disabled={!canAfford}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors whitespace-nowrap ${
                    canAfford
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer'
                      : 'bg-slate-900 text-slate-700 border border-slate-800 cursor-not-allowed'
                  }`}
                >
                  MAX
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
