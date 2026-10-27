import React from 'react';
import { GameState } from '../types/game';
import { ACHIEVEMENTS, TieredAchievement } from '../constants/achievements';
import { getAchievementMasterCompletions } from '../utils/gameCalculations';

interface AchievementsTabProps {
  state: GameState;
}

const TIER_COLORS: Record<number, { badge: string; activeBorder: string }> = {
  1: { badge: 'bg-blue-950/80 text-blue-300 border-blue-500/40', activeBorder: 'border-blue-500/40 bg-blue-950/15' },
  2: { badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40', activeBorder: 'border-emerald-500/40 bg-emerald-950/15' },
  3: { badge: 'bg-amber-950/80 text-amber-300 border-amber-500/40', activeBorder: 'border-amber-500/40 bg-amber-950/15' },
  4: { badge: 'bg-purple-950/80 text-purple-300 border-purple-500/40', activeBorder: 'border-purple-500/40 bg-purple-950/15' },
  5: { badge: 'bg-orange-950/80 text-orange-300 border-orange-500/40', activeBorder: 'border-orange-500/40 bg-orange-950/15' },
  6: { badge: 'bg-rose-950/80 text-rose-300 border-rose-500/40', activeBorder: 'border-rose-500/40 bg-rose-950/15' },
};

export const AchievementsTab: React.FC<AchievementsTabProps> = ({ state }) => {
  const unlockedCount = Object.values(state.achievements).filter(Boolean).length;
  const masterBonus = getAchievementMasterCompletions(state);

  // Group achievements by Tier
  const tiers = [1, 2, 3, 4, 5, 6] as const;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            Achievements Matrix
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            24 tiered milestones tracking your progression from the First Spark to Cosmic Supernova.
          </p>
        </div>

        <div className="text-right shrink-0">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-mono">
            Completed
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 flex items-center justify-end gap-1.5 flex-wrap">
            <span>{unlockedCount} / {ACHIEVEMENTS.length}</span>
            {masterBonus > 0 && (
              <span className="text-amber-400 text-sm font-semibold">
                +{masterBonus} from upgrade
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {tiers.map((tierNum) => {
          const tierAchs = ACHIEVEMENTS.filter((a) => a.tier === tierNum);
          if (tierAchs.length === 0) return null;
          const tierName = tierAchs[0].tierName;
          const completedInTier = tierAchs.filter((a) => !!state.achievements[a.id]).length;
          const styling = TIER_COLORS[tierNum] || TIER_COLORS[1];

          return (
            <div key={tierNum} className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${styling.badge}`}>
                    Tier {tierNum}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-200">
                    {tierName}
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {completedInTier} / {tierAchs.length} Completed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {tierAchs.map((ach) => {
                  const isUnlocked = !!state.achievements[ach.id];

                  return (
                    <div
                      key={ach.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                        isUnlocked
                          ? `${styling.activeBorder} shadow-sm`
                          : 'bg-slate-950/40 border-slate-800/80 opacity-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-xs text-slate-100">
                            {ach.name}
                          </span>
                          <span className={`text-[10px] font-mono shrink-0 ${isUnlocked ? 'text-emerald-400 font-bold' : 'text-slate-600'}`}>
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
        })}
      </div>
    </div>
  );
};
