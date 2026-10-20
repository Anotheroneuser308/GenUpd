import React, { useState } from 'react';
import { Save, Check } from 'lucide-react';
import { GameState } from '../types/game';

interface HeaderProps {
  state: GameState;
  activeTab: 'generators' | 'prestige' | 'infinity' | 'automation' | 'achievements' | 'stats';
  onTabChange: (tab: 'generators' | 'prestige' | 'infinity' | 'automation' | 'achievements' | 'stats') => void;
  onBuyMaxAll: () => void;
  onSaveGame: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  state,
  activeTab,
  onTabChange,
  onBuyMaxAll,
  onSaveGame,
}) => {
  const [saveFeedback, setSaveFeedback] = useState(false);

  const handleManualSave = () => {
    onSaveGame();
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 1500);
  };
  const tabs: Array<{
    id: 'generators' | 'prestige' | 'infinity' | 'automation' | 'achievements' | 'stats';
    label: string;
    visible?: boolean;
    badge?: string;
  }> = [
    { id: 'generators', label: 'Generators' },
    { id: 'prestige', label: 'Prestige' },
    {
      id: 'infinity',
      label: 'Infinity',
      visible: state.infinity.unlocked || state.infinity.count > 0 || state.stats.totalInfinities > 0,
      badge: '★',
    },
    {
      id: 'automation',
      label: 'Automation',
      visible: state.infinity.unlocked || state.infinity.count > 0 || state.stats.totalInfinities > 0,
      badge: '⚙',
    },
    { id: 'achievements', label: 'Achievements' },
    { id: 'stats', label: 'Stats & Settings' },
  ];

  const visibleTabs = tabs.filter((t) => t.visible !== false);

  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 bg-slate-950 border-b border-slate-800/80 sticky top-0 z-30">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
        <span className="text-lg font-bold tracking-tight text-white font-mono">
          GENERATORS
        </span>
      </div>

      {/* Zone 2: Single-line nav links */}
      <nav className="flex items-center gap-6 overflow-x-auto py-1 scrollbar-none text-sm font-medium">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isInfinity = tab.id === 'infinity';

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`whitespace-nowrap shrink-0 transition-colors pb-1 border-b-2 font-medium cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? isInfinity
                    ? 'text-amber-300 border-amber-500'
                    : 'text-white border-indigo-500'
                  : isInfinity
                  ? 'text-amber-400/80 hover:text-amber-300 border-transparent'
                  : 'text-slate-400 hover:text-slate-200 border-transparent'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-[10px] text-amber-400">{tab.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={handleManualSave}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700 active:scale-95"
          title="Save instantly without waiting for auto-save"
        >
          {saveFeedback ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5 text-slate-400" />
              <span>Save</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onBuyMaxAll}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm shadow-indigo-500/20 active:scale-95 cursor-pointer"
          title="Hotkey: M"
        >
          Max All [M]
        </button>
      </div>
    </header>
  );
};
