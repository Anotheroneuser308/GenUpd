/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
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
    buyMaxAll,
    performPrestige,
    performPrestigeEnergy,
    buyPrestigeUpgrade,
    buyInfinityTreeNode,
    setAutobuyerTarget,
    setPrestigeAutobuyerSettings,
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

  const handleProceedInfinity = () => {
    proceedInfinity();
  };

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
      <PointsDisplay state={gameState} />

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
          />
        )}

        {activeTab === 'prestige' && (
          <PrestigeTab
            state={gameState}
            onPrestige={performPrestige}
            onPrestigeEnergy={performPrestigeEnergy}
            onBuyUpgrade={buyPrestigeUpgrade}
          />
        )}

        {activeTab === 'infinity' && (gameState.infinity.unlocked || gameState.infinity.count > 0 || gameState.stats.totalInfinities > 0) && (
          <InfinityTab
            state={gameState}
            onBuyInfinityTreeNode={buyInfinityTreeNode}
            onToggleAutobuyer={toggleAutobuyer}
            onSetAutobuyerTarget={setAutobuyerTarget}
            onSetPrestigeAutobuyerSettings={setPrestigeAutobuyerSettings}
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
