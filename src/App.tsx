/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { useGameLoop } from './hooks/useGameLoop';
import { Header } from './components/Header';
import { PointsDisplay } from './components/PointsDisplay';
import { GeneratorsTab } from './components/GeneratorsTab';
import { PrestigeTab } from './components/PrestigeTab';
import { InfinityTab } from './components/InfinityTab';
import { InfinityOverlay } from './components/InfinityOverlay';
import { AchievementsTab } from './components/AchievementsTab';
import { StatsTab } from './components/StatsTab';
import { ToastContainer } from './components/ToastContainer';
import {
  INFINITY_THRESHOLD,
  calculateInfinityPointGain,
  calculateSkillPointsGain,
} from './utils/gameCalculations';

export default function App() {
  const {
    gameState,
    offlineMessage,
    showInfinityOverlay,
    proceedInfinity,
    clearOfflineMessage,
    toasts,
    dismissToast,
    buyGenerator,
    buyMaxGenerator,
    buyTickspeed,
    buyMaxTickspeed,
    buyMaxAll,
    performPrestige,
    performPrestigeEnergy,
    buyPrestigeEnergyUpgrade,
    buyMaxPrestigeEnergyUpgrade,
    buyPrestigeUpgrade,
    buyMaxPrestigeUpgrade,
    buyMaxPrestigeUpgrades,
    buyInfinityTreeNode,
    buyIpDoubler,
    buyMaxIpDoubler,
    buyAutomationExpand,
    buyAchievementMaster,
    buyIpGeneratorBoost,
    buyTimeIPBoost,
    buyEnergySPBoost,
    setAutobuyerTarget,
    setPrestigeAutobuyerSettings,
    setAutoPrestigeUpgradesSettings,
    setAutoPrestigeEnergySettings,
    setAutoInfinitySettings,
    restoreBackup,
    toggleAutobuyer,
    toggleSound,
    setNotation,
    saveGame,
    setAutoSaveEnabled,
    setAutoSaveInterval,
    exportSave,
    importSave,
    exportSaveToFile,
    importSaveFromFile,
    hardReset,
  } = useGameLoop();

  const [activeTab, setActiveTab] = useState<
    'generators' | 'prestige' | 'infinity' | 'achievements' | 'stats'
  >('generators');

  const notation = gameState.settings.notation;
  const canCrunch = gameState.points.gte(INFINITY_THRESHOLD);
  const crunchIPGain = calculateInfinityPointGain(
    gameState.points,
    gameState,
    gameState.infinity.count + 1
  );
  const crunchSPGain = calculateSkillPointsGain(
    gameState,
    gameState.infinity.count + 1
  );

  const handleProceedInfinity = useCallback(() => {
    proceedInfinity();
  }, [proceedInfinity]);

  // Keyboard Shortcuts (supporting both Latin and Cyrillic keyboard layouts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when focused in text input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      if (key === 'm' || key === 'ь') {
        e.preventDefault();
        buyMaxAll();
      } else if (key === 'p' || key === 'з') {
        e.preventDefault();
        performPrestige();
      } else if (key === 't' || key === 'е') {
        e.preventDefault();
        buyTickspeed();
      } else if (key >= '1' && key <= '8') {
        const num = parseInt(key, 10);
        buyGenerator(num);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    buyMaxAll,
    performPrestige,
    buyTickspeed,
    buyGenerator,
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white relative">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Dramatic Orange Fullscreen Infinity Overlay */}
      {showInfinityOverlay && (
        <InfinityOverlay onProceed={handleProceedInfinity} />
      )}

      {/* Top Bar Contract Header */}
      <Header
        state={gameState}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBuyMaxAll={buyMaxAll}
        onSaveGame={saveGame}
      />

      {/* Hero Points & Status Bar */}
      <PointsDisplay state={gameState} activeTab={activeTab} />

      {/* Global Big Crunch Banner (shown when >= 1.79e308 and >= 10 Infinities or crunch unlocked) */}
      {canCrunch && (gameState.infinity.count >= 10 || !!gameState.infinityTree?.feat_4) && (
        <div className="bg-gradient-to-r from-amber-950 via-orange-950 to-amber-950 border-b-2 border-amber-500/80 px-6 py-3.5 shadow-xl shadow-orange-950/40 animate-pulse">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌌</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-amber-200 text-sm tracking-wide uppercase">
                    Big Crunch Available
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Limit Reached
                  </span>
                </div>
                <div className="text-xs text-amber-300/90 font-mono mt-0.5 flex items-center gap-2.5">
                  <span>
                    Gain: <strong className="text-amber-400 font-bold">+{crunchIPGain.format(notation)} IP</strong>
                  </span>
                  <span>·</span>
                  <span>
                    SP: <strong className="text-orange-300 font-bold">+{crunchSPGain} SP</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {activeTab !== 'infinity' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('infinity')}
                  className="px-3.5 py-2 text-xs font-semibold text-amber-200 hover:text-white bg-amber-900/40 hover:bg-amber-800/60 rounded-xl border border-amber-500/30 transition-all cursor-pointer"
                >
                  Infinity Tab
                </button>
              )}
              <button
                type="button"
                onClick={handleProceedInfinity}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/30 transition-all transform hover:scale-105 active:scale-95 cursor-pointer uppercase tracking-wider"
              >
                Big Crunch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Catch-up Notification Banner */}
      {offlineMessage && (
        <div className="bg-indigo-950/80 border-b border-indigo-500/30 px-6 py-3 flex items-center justify-between text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">⚡</span>
            <span>{offlineMessage}</span>
          </div>
          <button
            type="button"
            onClick={clearOfflineMessage}
            className="px-2 py-1 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-100 rounded text-[11px] font-medium transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        {activeTab === 'generators' && (
          <GeneratorsTab
            state={gameState}
            onBuyGenerator={buyGenerator}
            onBuyMaxGenerator={buyMaxGenerator}
            onBuyTickspeed={buyTickspeed}
            onBuyMaxTickspeed={buyMaxTickspeed}
          />
        )}

        {activeTab === 'prestige' && (
          <PrestigeTab
            state={gameState}
            onPrestige={performPrestige}
            onPrestigeEnergy={performPrestigeEnergy}
            onBuyPrestigeEnergyUpgrade={buyPrestigeEnergyUpgrade}
            onBuyMaxPrestigeEnergyUpgrade={buyMaxPrestigeEnergyUpgrade}
            onBuyUpgrade={buyPrestigeUpgrade}
            onBuyMaxUpgrade={buyMaxPrestigeUpgrade}
            onBuyMaxUpgrades={buyMaxPrestigeUpgrades}
          />
        )}

        {activeTab === 'infinity' && (gameState.infinity.unlocked || gameState.infinity.count > 0 || gameState.stats.totalInfinities > 0) && (
          <InfinityTab
            state={gameState}
            onBuyInfinityTreeNode={buyInfinityTreeNode}
            onBuyIpDoubler={buyIpDoubler}
            onBuyMaxIpDoubler={buyMaxIpDoubler}
            onBuyAutomationExpand={buyAutomationExpand}
            onBuyAchievementMaster={buyAchievementMaster}
            onBuyIpGeneratorBoost={buyIpGeneratorBoost}
            onBuyTimeIPBoost={buyTimeIPBoost}
            onBuyEnergySPBoost={buyEnergySPBoost}
            onInfinityReset={proceedInfinity}
            onToggleAutobuyer={toggleAutobuyer}
            onSetAutobuyerTarget={setAutobuyerTarget}
            onSetPrestigeAutobuyerSettings={setPrestigeAutobuyerSettings}
            onSetAutoPrestigeUpgradesSettings={setAutoPrestigeUpgradesSettings}
            onSetAutoPrestigeEnergySettings={setAutoPrestigeEnergySettings}
            onSetAutoInfinitySettings={setAutoInfinitySettings}
          />
        )}

        {activeTab === 'achievements' && (
          <AchievementsTab state={gameState} />
        )}

        {activeTab === 'stats' && (
          <StatsTab
            state={gameState}
            onSetNotation={setNotation}
            onToggleSound={toggleSound}
            onSaveGame={saveGame}
            onSetAutoSaveEnabled={setAutoSaveEnabled}
            onSetAutoSaveInterval={setAutoSaveInterval}
            onExportSave={exportSave}
            onImportSave={importSave}
            onExportSaveToFile={exportSaveToFile}
            onImportSaveFromFile={importSaveFromFile}
            onRestoreBackup={restoreBackup}
            onHardReset={hardReset}
          />
        )}
      </main>

      {/* Clean Quiet Footer */}
      <footer className="border-t border-slate-900 px-6 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-2 text-[11px]">
            <span>Hotkeys:</span>
            <span className="text-slate-400">1-8 (Gens)</span>
            <span>·</span>
            <span className="text-slate-400">M (Max All)</span>
            <span>·</span>
            <span className="text-slate-400">T (Tickspeed)</span>
            <span>·</span>
            <span className="text-slate-400">P (Prestige)</span>
          </div>

          <div className="text-[11px] text-slate-600">
            {gameState.settings.autoSaveEnabled
              ? `Auto-saves locally every ${gameState.settings.autoSaveInterval}s`
              : 'Auto-save disabled'}
          </div>
        </div>
      </footer>
    </div>
  );
}
