import React, { useState } from 'react';
import { GameState, PrestigeAutobuyerMode, InfinityAutobuyerMode } from '../types/game';
import { Decimal } from '../utils/decimal';
import { Cpu, Lock } from 'lucide-react';

interface AutomationTabProps {
  state: GameState;
  onToggleAutobuyer: (id: string) => void;
  onSetAutobuyerTarget: (id: string, target: number) => void;
  onSetPrestigeAutobuyerSettings: (settings: Partial<{ target: number; mode: PrestigeAutobuyerMode; timeTarget: number; ratioTarget: number }>) => void;
  onSetAutoPrestigeUpgradesSettings?: (settings: Partial<{ priority: 'cheapest' | 'order'; buyAll: boolean }>) => void;
  onSetAutoPrestigeEnergySettings?: (settings: Partial<{ energyMode: 'time' | 'target' | 'gainMultiplier'; energyTimeTarget: number; energyTarget: number; energyRatioTarget: number }>) => void;
  onSetAutoInfinitySettings?: (settings: Partial<{ infinityMode: InfinityAutobuyerMode; infinityTimeTarget: number; infinityTarget: number; infinityRatioTarget: number }>) => void;
}

export const AutomationTab: React.FC<AutomationTabProps> = ({
  state,
  onToggleAutobuyer,
  onSetAutobuyerTarget,
  onSetPrestigeAutobuyerSettings,
  onSetAutoPrestigeUpgradesSettings,
  onSetAutoPrestigeEnergySettings,
  onSetAutoInfinitySettings,
}) => {

  const tree = state.infinityTree || {};
  const isHyperSpeed = !!tree['auto_4'];

  const prestigeBuyer = state.autobuyers?.prestige;
  const prestigeMode: PrestigeAutobuyerMode = prestigeBuyer?.mode || 'targetPP';
  const [prestigeInput, setPrestigeInput] = useState(() => String(prestigeBuyer?.target ?? 1));
  const [timeInput, setTimeInput] = useState(() => String(prestigeBuyer?.timeTarget ?? 60));
  const [ratioInput, setRatioInput] = useState(() => String(prestigeBuyer?.ratioTarget ?? 2));

  React.useEffect(() => {
    if (prestigeBuyer?.target !== undefined) {
      setPrestigeInput(String(prestigeBuyer.target));
    }
  }, [prestigeBuyer?.target]);

  React.useEffect(() => {
    if (prestigeBuyer?.timeTarget !== undefined) {
      setTimeInput(String(prestigeBuyer.timeTarget));
    }
  }, [prestigeBuyer?.timeTarget]);

  React.useEffect(() => {
    if (prestigeBuyer?.ratioTarget !== undefined) {
      setRatioInput(String(prestigeBuyer.ratioTarget));
    }
  }, [prestigeBuyer?.ratioTarget]);

  // Energy Autobuyer states
  const energyBuyer = state.autobuyers?.autoPrestigeEnergy;
  const [energyTimeInput, setEnergyTimeInput] = useState(() => String(energyBuyer?.energyTimeTarget ?? 60));
  const [energyTargetInput, setEnergyTargetInput] = useState(() => String(energyBuyer?.energyTarget ?? 2));
  const [energyRatioInput, setEnergyRatioInput] = useState(() => String(energyBuyer?.energyRatioTarget ?? 2));

  // Infinity Autobuyer states
  const infinityBuyer = state.autobuyers?.autoInfinity;
  const [infTimeInput, setInfTimeInput] = useState(() => String(infinityBuyer?.infinityTimeTarget ?? 60));
  const [infTargetInput, setInfTargetInput] = useState(() => String(infinityBuyer?.infinityTarget ?? 1));
  const [infRatioInput, setInfRatioInput] = useState(() => String(infinityBuyer?.infinityRatioTarget ?? 2));

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
    { key: 'autoPrestigeUpgrades', name: 'Auto: Prestige Upgrades', desc: 'Automatically purchases Prestige upgrades, Prestige Skill Synergy, and Prestige Energy upgrades', reqNode: 'Auto: Prestige Upgrades (auto_5)' },
    { key: 'autoPrestigeEnergy', name: 'Prestige Energy Autobuyer', desc: 'Automatically resets Prestige Energy with configurable timer, target gain, or gain multiplier', reqNode: 'Prestige Energy Autobuyer (auto_6)' },
    { key: 'autoInfinity', name: 'Infinity Autobuyer', desc: 'Automatically triggers Big Crunch using the configured time, IP gain, or gain multiplier conditions', reqNode: 'Infinity Autobuyer (auto_7, Milestone 150)' },
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
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Automation Protocols
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Configure automated operations for all unlocked generators, tickspeed, and reset layers.
            {isHyperSpeed ? ' Hyper-Speed is active: autobuyers run every 0.05 seconds!' : ' Autobuyers run continuously every 0.25 seconds.'}
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleToggleAll(true)}
            className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-500/30 transition-colors cursor-pointer"
          >
            Enable All
          </button>
          <button
            type="button"
            onClick={() => handleToggleAll(false)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            Disable All
          </button>
        </div>
      </div>

      {/* Grid of Autobuyers */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {autobuyersList.map((item) => {
          const ab = state.autobuyers[item.key];
          const isUnlocked = !!ab?.unlocked;
          const isEnabled = isUnlocked && !!ab?.enabled;

          return (
            <div
              key={item.key}
              className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                !isUnlocked
                  ? 'bg-slate-950/40 border-slate-800/80 opacity-60'
                  : isEnabled
                  ? 'bg-slate-900 border-emerald-500/40 shadow-sm shadow-emerald-950/40'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Cpu className={`w-4 h-4 ${isEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <h3 className="text-sm font-bold text-slate-100">{item.name}</h3>
                  </div>

                  {isUnlocked ? (
                    <button
                      type="button"
                      onClick={() => onToggleAutobuyer(item.key)}
                      className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded cursor-pointer transition-colors ${
                        isEnabled
                          ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isEnabled ? 'ON' : 'OFF'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                      <Lock className="w-3 h-3" />
                      <span>LOCKED</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{item.desc}</p>
                {!isUnlocked && (
                  <p className="text-[10px] text-amber-400/80 font-mono mt-2">
                    Unlocked via: {item.reqNode}
                  </p>
                )}
              </div>

              {/* Prestige Autobuyer Settings */}
              {item.key === 'prestige' && isUnlocked && (
                <div className="pt-3 border-t border-slate-800 space-y-3 text-xs font-mono">
                  <label className="block text-slate-400 text-[11px]">
                    Reset Condition
                    <select
                      value={prestigeMode}
                      onChange={(e) => onSetPrestigeAutobuyerSettings({ mode: e.target.value as PrestigeAutobuyerMode })}
                      className="mt-1 w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-amber-500 focus:outline-none"
                    >
                      <option value="time">Timer (after set seconds)</option>
                      <option value="targetPP">Target PP Gain</option>
                      <option value="ppMultiplier">Multiplier vs Previous Reset</option>
                    </select>
                  </label>

                  {prestigeMode === 'time' && (
                    <label className="block text-slate-400 text-[11px]">
                      Reset after
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={timeInput}
                          onChange={(e) => setTimeInput(e.target.value)}
                          onBlur={() => {
                            const val = Math.max(1, Number(timeInput) || 60);
                            onSetPrestigeAutobuyerSettings({ timeTarget: val });
                            setTimeInput(String(val));
                          }}
                          className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-right text-amber-300 focus:border-amber-500 focus:outline-none"
                        />
                        <span className="text-slate-400">seconds</span>
                      </div>
                    </label>
                  )}

                  {(prestigeMode === 'targetPP' || prestigeMode === 'ppMultiplier') && (
                    <label className="block text-slate-400 text-[11px]">
                      {prestigeMode === 'targetPP'
                        ? 'Reset when PP gain reaches at least'
                        : 'First reset / minimum when PP gain reaches this amount (or higher)'}
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={prestigeInput}
                          onChange={(e) => {
                            setPrestigeInput(e.target.value);
                            const val = Number(e.target.value);
                            if (!isNaN(val) && val >= 1) {
                              onSetAutobuyerTarget('prestige', val);
                              onSetPrestigeAutobuyerSettings({ target: val });
                            }
                          }}
                          onBlur={() => {
                            const val = Math.max(1, Number(prestigeInput) || 1);
                            onSetAutobuyerTarget('prestige', val);
                            onSetPrestigeAutobuyerSettings({ target: val });
                            setPrestigeInput(String(val));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-right text-amber-300 focus:border-amber-500 focus:outline-none"
                        />
                        <span className="text-slate-400">PP</span>
                      </div>
                    </label>
                  )}

                  {prestigeMode === 'ppMultiplier' && (() => {
                    const prevGain = state.autobuyers.prestige?.previousPPGain instanceof Decimal
                      ? state.autobuyers.prestige.previousPPGain
                      : (typeof state.autobuyers.prestige?.previousPPGain === 'number' ? new Decimal(state.autobuyers.prestige.previousPPGain) : Decimal.zero());
                    const currentRatio = Math.max(1.01, Number(ratioInput) || 2);
                    const nextTarget = prevGain.gt(0)
                      ? prevGain.mul(currentRatio)
                      : new Decimal(Math.max(1, Number(prestigeInput) || 1));

                    return (
                      <label className="block text-slate-400 text-[11px]">
                        After the first reset, require this multiple of previous PP gain
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="number"
                            min="1.01"
                            step="0.1"
                            value={ratioInput}
                            onChange={(e) => {
                              setRatioInput(e.target.value);
                              const val = Number(e.target.value);
                              if (!isNaN(val) && val >= 1.01) {
                                onSetPrestigeAutobuyerSettings({ ratioTarget: val });
                              }
                            }}
                            onBlur={() => {
                              const val = Math.max(1.01, Number(ratioInput) || 2);
                              onSetPrestigeAutobuyerSettings({ ratioTarget: val });
                              setRatioInput(String(val));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-right text-amber-300 focus:border-amber-500 focus:outline-none"
                          />
                          <span className="text-slate-400">× previous</span>
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1.5 text-[11px] text-slate-400">
                          <span>
                            Previous gain: <strong className="text-amber-300 font-mono">{prevGain.gt(0) ? prevGain.format(state.settings.notation) : '0'} PP</strong>
                          </span>
                          <span>
                            Next reset threshold: <strong className="text-emerald-400 font-mono">{nextTarget.format(state.settings.notation)} PP</strong>
                          </span>
                        </div>
                      </label>
                    );
                  })()}
                </div>
              )}

              {/* Auto: Prestige Upgrades Settings */}
              {item.key === 'autoPrestigeUpgrades' && isUnlocked && (
                <div className="pt-3 border-t border-slate-800 space-y-3 text-xs font-mono">
                  <label className="block text-slate-400 text-[11px]">
                    Purchase Priority
                    <select
                      value={state.autobuyers?.autoPrestigeUpgrades?.priority || 'cheapest'}
                      onChange={(e) => onSetAutoPrestigeUpgradesSettings?.({ priority: e.target.value as 'cheapest' | 'order' })}
                      className="mt-1 w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-amber-500 focus:outline-none"
                    >
                      <option value="cheapest">Cheapest Available First</option>
                      <option value="order">Prestige Tier Order</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-[11px]">
                    <input
                      type="checkbox"
                      checked={state.autobuyers?.autoPrestigeUpgrades?.buyAll !== false}
                      onChange={(e) => onSetAutoPrestigeUpgradesSettings?.({ buyAll: e.target.checked })}
                      className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0"
                    />
                    <span>Buy all affordable upgrades</span>
                  </label>
                </div>
              )}

              {/* Prestige Energy Autobuyer Settings */}
              {item.key === 'autoPrestigeEnergy' && isUnlocked && (
                <div className="pt-3 border-t border-slate-800 space-y-3 text-xs font-mono">
                  <label className="block text-slate-400 text-[11px]">
                    Reset Condition
                    <select
                      value={state.autobuyers?.autoPrestigeEnergy?.energyMode || 'target'}
                      onChange={(e) => onSetAutoPrestigeEnergySettings?.({ energyMode: e.target.value as 'time' | 'target' | 'gainMultiplier' })}
                      className="mt-1 w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-amber-500 focus:outline-none"
                    >
                      <option value="time">Timer (after set seconds)</option>
                      <option value="target">Target Multiplier Gain</option>
                      <option value="gainMultiplier">Multiplier vs Previous Reset</option>
                    </select>
                  </label>

                  {(state.autobuyers?.autoPrestigeEnergy?.energyMode === 'time') && (
                    <label className="block text-slate-400 text-[11px]">
                      Reset after
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={energyTimeInput}
                          onChange={(e) => setEnergyTimeInput(e.target.value)}
                          onBlur={() => {
                            const val = Math.max(1, Number(energyTimeInput) || 60);
                            onSetAutoPrestigeEnergySettings?.({ energyTimeTarget: val });
                            setEnergyTimeInput(String(val));
                          }}
                          className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-right text-purple-300 focus:border-purple-500 focus:outline-none"
                        />
                        <span className="text-slate-400">seconds</span>
                      </div>
                    </label>
                  )}

                  {((!state.autobuyers?.autoPrestigeEnergy?.energyMode || state.autobuyers?.autoPrestigeEnergy?.energyMode === 'target' || state.autobuyers?.autoPrestigeEnergy?.energyMode === 'gainMultiplier')) && (
                    <label className="block text-slate-400 text-[11px]">
                      First reset when PE reward reaches this amount
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="number"
                          min="2"
                          step="1"
                          value={energyTargetInput}
                          onChange={(e) => setEnergyTargetInput(e.target.value)}
                          onBlur={() => {
                            const val = Math.max(2, Number(energyTargetInput) || 2);
                            onSetAutoPrestigeEnergySettings?.({ energyTarget: val });
                            setEnergyTargetInput(String(val));
                          }}
                          className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-right text-purple-300 focus:border-purple-500 focus:outline-none"
                        />
                        <span className="text-slate-400">x Multiplier</span>
                      </div>
                    </label>
                  )}

                  {(state.autobuyers?.autoPrestigeEnergy?.energyMode === 'gainMultiplier') && (
                    <label className="block text-slate-400 text-[11px]">
                      Reset when reward is at least this many times previous
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="number"
                          min="1.01"
                          step="0.1"
                          value={energyRatioInput}
                          onChange={(e) => setEnergyRatioInput(e.target.value)}
                          onBlur={() => {
                            const val = Math.max(1.01, Number(energyRatioInput) || 2);
                            onSetAutoPrestigeEnergySettings?.({ energyRatioTarget: val });
                            setEnergyRatioInput(String(val));
                          }}
                          className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-right text-purple-300 focus:border-purple-500 focus:outline-none"
                        />
                        <span className="text-slate-400">× previous</span>
                      </div>
                      <span className="block mt-1 text-slate-500">
                        Previous reward: x{state.autobuyers?.autoPrestigeEnergy?.previousEnergyGain?.format(state.settings.notation) ?? '1'}
                      </span>
                    </label>
                  )}
                </div>
              )}

              {/* Infinity Autobuyer Settings (Milestone 1500) */}
              {item.key === 'autoInfinity' && isUnlocked && (
                <div className="pt-3 border-t border-slate-800 space-y-3 text-xs font-mono">
                  <label className="block text-slate-400 text-[11px]">
                    Reset Condition
                    <select
                      value={state.autobuyers?.autoInfinity?.infinityMode || 'targetIP'}
                      onChange={(e) => onSetAutoInfinitySettings?.({ infinityMode: e.target.value as InfinityAutobuyerMode })}
                      className="mt-1 w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-amber-500 focus:outline-none"
                    >
                      <option value="time">Timer (after set seconds)</option>
                      <option value="targetIP">Target IP Gain</option>
                      <option value="ipMultiplier">Multiplier vs Previous Crunch</option>
                    </select>
                  </label>

                  {(state.autobuyers?.autoInfinity?.infinityMode === 'time') && (
                    <label className="block text-slate-400 text-[11px]">
                      Crunch after
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={infTimeInput}
                          onChange={(e) => setInfTimeInput(e.target.value)}
                          onBlur={() => {
                            const val = Math.max(1, Number(infTimeInput) || 60);
                            onSetAutoInfinitySettings?.({ infinityTimeTarget: val });
                            setInfTimeInput(String(val));
                          }}
                          className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-right text-amber-300 focus:border-amber-500 focus:outline-none"
                        />
                        <span className="text-slate-400">seconds</span>
                      </div>
                    </label>
                  )}

                  {((!state.autobuyers?.autoInfinity?.infinityMode || state.autobuyers?.autoInfinity?.infinityMode === 'targetIP' || state.autobuyers?.autoInfinity?.infinityMode === 'ipMultiplier')) && (
                    <label className="block text-slate-400 text-[11px]">
                      First crunch when IP gain reaches this amount
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={infTargetInput}
                          onChange={(e) => setInfTargetInput(e.target.value)}
                          onBlur={() => {
                            const val = Math.max(1, Number(infTargetInput) || 1);
                            onSetAutoInfinitySettings?.({ infinityTarget: val });
                            setInfTargetInput(String(val));
                          }}
                          className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-right text-amber-300 focus:border-amber-500 focus:outline-none"
                        />
                        <span className="text-slate-400">IP</span>
                      </div>
                    </label>
                  )}

                  {(state.autobuyers?.autoInfinity?.infinityMode === 'ipMultiplier') && (
                    <label className="block text-slate-400 text-[11px]">
                      Crunch when reward is at least this many times previous
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="number"
                          min="1.01"
                          step="0.1"
                          value={infRatioInput}
                          onChange={(e) => setInfRatioInput(e.target.value)}
                          onBlur={() => {
                            const val = Math.max(1.01, Number(infRatioInput) || 2);
                            onSetAutoInfinitySettings?.({ infinityRatioTarget: val });
                            setInfRatioInput(String(val));
                          }}
                          className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-right text-amber-300 focus:border-amber-500 focus:outline-none"
                        />
                        <span className="text-slate-400">× previous</span>
                      </div>
                      <span className="block mt-1 text-slate-500">
                        Previous gain: {state.autobuyers?.autoInfinity?.previousIPGain?.format(state.settings.notation) ?? '1'} IP
                      </span>
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
