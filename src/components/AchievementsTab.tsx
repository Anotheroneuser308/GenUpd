import React from 'react';
import { GameState } from '../types/game';
import { ACHIEVEMENTS } from '../constants/achievements';

interface AchievementsTabProps {
  state: GameState;
}

export const AchievementsTab: React.FC<AchievementsTabProps> = ({ state }) => {
  const unlockedCount = Object.values(state.achievements).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            Achievements Matrix
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Milestones and honorary badges marking your journey through points and cascading dimensions.
          </p>
        </div>

        <div className="text-right shrink-0">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-mono">
            Completed
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {unlockedCount} / {ACHIEVEMENTS.length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {ACHIEVEMENTS.map((ach) => {
          const isUnlocked = !!state.achievements[ach.id];

          return (
            <div
              key={ach.id}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                isUnlocked
                  ? 'bg-slate-900 border-emerald-500/30'
                  : 'bg-slate-950/40 border-slate-800/80 opacity-50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-xs text-slate-100">
                    {ach.name}
                  </span>
                  <span className={`text-[10px] font-mono shrink-0 ${isUnlocked ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {isUnlocked ? '✓ Completed' : 'Locked'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  {ach.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
