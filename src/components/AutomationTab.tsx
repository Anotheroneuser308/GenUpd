import React, { useState } from 'react';
import { GameState, PrestigeAutobuyerMode } from '../types/game';
import { Cpu, Lock } from 'lucide-react';

interface AutomationTabProps {
  state: GameState;
  onToggleAutobuyer: (id: string) => void;
  onSetAutobuyerTarget: (id: string, target: number) => void;
  onSetPrestigeAutobuyerSettings: (settings: Partial<{ target: number; mode: PrestigeAutobuyerMode; timeTarget: number; ratioTarget: number }>) => void;
}

export const AutomationTab: React.FC<AutomationTabProps> = ({
  state,
  onToggleAutobuyer,
  onSetAutobuyerTarget,
  onSetPrestigeAutobuyerSettings,
}) => {

  const tree = state.infinityTree || {};
  const isHyperSpeed = !!tree['auto_4'];

  const prestigeBuyer = state.autobuyers?.prestige;
  const prestigeMode: PrestigeAutobuyerMode = prestigeBuyer?.mode || 'targetPP';
  const [prestigeInput, setPrestigeInput] = useState(() => String(prestigeBuyer?.target ?? 1));
  const [timeInput, setTimeInput] = useState(() => String(prestigeBuyer?.timeTarget ?? 60));
  const [ratioInput, setRatioInput] = useState(() => String(prestigeBuyer?.ratioTarget ?? 2));
  const commitNumber = (field: 'target' | 'timeTarget' | 'ratioTarget') => {
    const raw = field === 'target' ? prestigeInput : field === 'timeTarget' ? timeInput : ratioInput;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      if (field === 'target') setPrestigeInput(String(prestigeBuyer?.target ?? 1));
      else if (field === 'timeTarget') setTimeInput(String(prestigeBuyer?.timeTarget ?? 60));
      else setRatioInput(String(prestigeBuyer?.ratioTarget ?? 2));
      return;
    }
    if (field === 'target') {
      const next = Math.max(1, value);
      onSetAutobuyerTarget('prestige', next);
      setPrestigeInput(String(next));
    } else if (field === 'timeTarget') {
      const next = Math.max(1, value);
      onSetPrestigeAutobuyerSettings({ timeTarget: next });
      setTimeInput(String(next));
    } else {
      const next = Math.max(1.01, value);
      onSetPrestigeAutobuyerSettings({ ratioTarget: next });
      setRatioInput(String(next));
    }
  };

  const handleToggleAll = (enable: boolean) => {
    Object.keys(state.autobuyers).forEach((key) => {
      const ab = state.autobuyers[key];
      if (ab?.unlocked && ab.enabled !== enable) {
        onToggleAutobuyer(key);
      }
    });
  };

  const autobuyersList = [
    { key: 'tickspeed', name: 'Tickspeed Autobuyer', desc: 'Automatically purchases tickspeed upgrades when affordable', reqNode: 'Apex Autobuyers (auto_2)' },
    { key: 'gen1', name: 'Auto: Generator 1', desc: 'Automatically purchases Generator 1', reqNode: 'Core Autobuyers (auto_1)' },
    { key: 'gen2', name: 'Auto: Generator 2', desc: 'Automatically purchases Generator 2', reqNode: 'Core Autobuyers (auto_1)' },
    { key: 'gen3', name: 'Auto: Generator 3', desc: 'Automatically purchases Generator 3', reqNode: 'Core Autobuyers (auto_1)' },
    { key: 'gen4', name: 'Auto: Generator 4', desc: 'Automatically purchases Generator 4', reqNode: 'Core Autobuyers (auto_1)' },
    { key: 'gen5', name: 'Auto: Generator 5', desc: 'Automatically purchases Generator 5 (when unlocked)', reqNode: 'Apex Autobuyers (auto_2)' },
    { key: 'gen6', name: 'Auto: Generator 6', desc: 'Automatically purchases Generator 6 (when unlocked)', reqNode: 'Apex Autobuyers (auto_2)' },
    { key: 'gen7', name: 'Auto: Generator 7', desc: 'Automatically purchases Generator 7 (when unlocked)', reqNode: 'Apex Autobuyers (auto_2)' },
    { key: 'gen8', name: 'Auto: Generator 8', desc: 'Automatically purchases Generator 8 (when unlocked)', reqNode: 'Apex Autobuyers (auto_2)' },
    { key: 'prestige', name: 'Prestige Autobuyer', desc: 'Automatically triggers Prestige using the selected reset condition', reqNode: 'Prestige Autobuyer (auto_3)' },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Automation Command Center
            </span>
            {isHyperSpeed && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                ⚡ Hyper-Speed 20 Ticks/sec Active
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-emerald-400" />
            <span>Autobuyers Command</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Configure automated purchasing routines. Autobuyers are permanently unlocked on the <strong className="text-amber-400">Infinity Tree</strong> (located in the Infinity tab under Branch 2: Automation).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleToggleAll(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold hover:bg-emerald-900/60 transition-colors cursor-pointer"
          >
            All ON
          </button>
          <button
            type="button"
            onClick={() => handleToggleAll(false)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
          >
            All OFF
          </button>
        </div>
      </div>

      {/* Autobuyers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {autobuyersList.map((item) => {
          const ab = state.autobuyers[item.key];
          const isUnlocked = !!ab?.unlocked;
          const isEnabled = !!ab?.enabled;

          return (
            <div
              key={item.key}
              className={`p-4 rounded-xl border flex flex-col justify-between gap-3.5 transition-all ${
                isUnlocked
                  ? isEnabled
                    ? 'bg-slate-900/90 border-emerald-500/30'
                    : 'bg-slate-900 border-slate-800'
                  : 'bg-slate-950/40 border-slate-800/60 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
                    {isUnlocked ? (
                      <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
                    ) : (
                      <Lock className="w-3 h-3 text-slate-500" />
                    )}
                    <span>{item.name}</span>
                  </span>

                  {isUnlocked ? (
                    <button
                      type="button"
                      onClick={() => onToggleAutobuyer(item.key)}
                      className={`px-3 py-1 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                        isEnabled
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isEnabled ? 'ON' : 'OFF'}
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-500">
                      LOCKED
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-1">
                  {item.desc}
                </p>

                {!isUnlocked && (
                  <p className="text-[10px] font-mono text-amber-400/80 mt-1.5">
                    Unlock in Infinity Tree: {item.reqNode}
                  </p>
                )}
              </div>

              {/* Prestige Autobuyer conditions */}
              {item.key === 'prestige' && isUnlocked && (
                <div className="pt-3 border-t border-slate-800 space-y-3 text-xs font-mono">
                  <label className="block text-slate-400 text-[11px]">
                    Reset condition
                    <select
                      value={prestigeMode}
                      onChange={(e) => onSetPrestigeAutobuyerSettings({ mode: e.target.value as PrestigeAutobuyerMode })}
                      className="mt-1 w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-amber-500 focus:outline-none"
                    >
                      <option value="time">After a set time</option>
                      <option value="targetPP">When PP gain reaches a value</option>
                      <option value="ppMultiplier">When PP gain exceeds previous gain by a multiplier</option>
                    </select>
                  </label>

                  {prestigeMode === 'time' && (
                    <label className="block text-slate-400 text-[11px]">
                      Reset after
                      <div className="mt-1 flex items-center gap-2">
                        <input type="number" min="1" step="1" value={timeInput}
                          onChange={(e) => setTimeInput(e.target.value)} onBlur={() => commitNumber('timeTarget')}
                          className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-right text-amber-300 focus:border-amber-500 focus:outline-none" />
                        <span className="text-slate-400">seconds</span>
                      </div>
                    </label>
                  )}

                  {prestigeMode === 'targetPP' && (
                    <label className="block text-slate-400 text-[11px]">
                      Reset when PP gained is at least
                      <div className="mt-1 flex items-center gap-2">
                        <input type="number" min="1" step="1" value={prestigeInput}
                          onChange={(e) => setPrestigeInput(e.target.value)} onBlur={() => commitNumber('target')}
                          className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-right text-amber-300 focus:border-amber-500 focus:outline-none" />
                        <span className="text-slate-400">PP</span>
                      </div>
                    </label>
                  )}

                  {prestigeMode === 'ppMultiplier' && (
                    <label className="block text-slate-400 text-[11px]">
                      Reset when PP gain is at least this many times the previous reset
                      <div className="mt-1 flex items-center gap-2">
                        <input type="number" min="1.01" step="0.1" value={ratioInput}
                          onChange={(e) => setRatioInput(e.target.value)} onBlur={() => commitNumber('ratioTarget')}
                          className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-right text-amber-300 focus:border-amber-500 focus:outline-none" />
                        <span className="text-slate-400">× previous PP</span>
                      </div>
                      <span className="block mt-1 text-slate-500">Previous reset gain: {prestigeBuyer?.previousPPGain?.format(state.settings.notation) ?? '0'} PP</span>
                    </label>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
