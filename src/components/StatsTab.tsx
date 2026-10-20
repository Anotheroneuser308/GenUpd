import React, { useState, useRef } from 'react';
import {
  Save,
  Check,
  Download,
  Upload,
  Copy,
  Clock,
  Trash2,
  Sliders,
  Settings,
  Volume2,
  VolumeX,
  ShieldCheck,
} from 'lucide-react';
import { GameState } from '../types/game';
import { GrowthHistoryChart } from './GrowthHistoryChart';

interface StatsTabProps {
  state: GameState;
  onSetNotation: (notation: 'scientific' | 'engineering' | 'standard' | 'logarithm') => void;
  onToggleSound: () => void;
  onSaveGame: () => void;
  onSetAutoSaveEnabled: (enabled: boolean) => void;
  onSetAutoSaveInterval: (interval: number) => void;
  onExportSave: () => string;
  onImportSave: (saveStr: string) => boolean;
  onExportSaveToFile: () => void;
  onImportSaveFromFile: (file: File) => void;
  onRestoreBackup: () => boolean;
  onHardReset: () => void;
}

function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '—';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

export const StatsTab: React.FC<StatsTabProps> = ({
  state,
  onSetNotation,
  onToggleSound,
  onSaveGame,
  onSetAutoSaveEnabled,
  onSetAutoSaveInterval,
  onExportSave,
  onImportSave,
  onExportSaveToFile,
  onImportSaveFromFile,
  onRestoreBackup,
  onHardReset,
}) => {
  const notation = state.settings.notation;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importInput, setImportInput] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleManualSave = () => {
    onSaveGame();
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  const handleCopy = () => {
    const exported = onExportSave();
    if (exported) {
      navigator.clipboard.writeText(exported);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const handleImportText = () => {
    if (!importInput.trim()) return;
    const ok = onImportSave(importInput.trim());
    if (ok) {
      setImportFeedback('Loaded successfully!');
      setImportInput('');
    } else {
      setImportFeedback('Error: invalid save string');
    }
    setTimeout(() => setImportFeedback(null), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportSaveFromFile(file);
      // Reset input value so same file can be loaded again if desired
      e.target.value = '';
    }
  };

  const autoSaveIntervals = [1, 5, 10, 30, 60];

  return (
    <div className="space-y-6">
      {/* 1. Growth History Chart (recharts) */}
      <GrowthHistoryChart state={state} />

      {/* 2. Save Management & Backup */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Save className="w-4 h-4 text-indigo-400" />
              <span>Save Management & Backup</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Save your progress to local storage, download backups, or import save files anytime.
            </p>
          </div>

          {/* Quick Instant Save Button */}
          <button
            type="button"
            onClick={handleManualSave}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95 self-start sm:self-auto ${
              saveFeedback
                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
            }`}
          >
            {saveFeedback ? (
              <>
                <Check className="w-4 h-4" />
                <span>SAVED!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>SAVE NOW</span>
              </>
            )}
          </button>
        </div>

        {/* Auto-save configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Auto-Save</span>
              </label>
              <button
                type="button"
                onClick={() => onSetAutoSaveEnabled(!state.settings.autoSaveEnabled)}
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  state.settings.autoSaveEnabled
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                {state.settings.autoSaveEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {state.settings.autoSaveEnabled
                ? `Automatically persists state every ${state.settings.autoSaveInterval} seconds.`
                : 'Auto-save is turned off. Use manual Save or export files!'}
            </p>
          </div>

          {/* Auto-save timer interval selector */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Auto-Save Timer Interval
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {autoSaveIntervals.map((interval) => (
                <button
                  key={interval}
                  type="button"
                  disabled={!state.settings.autoSaveEnabled}
                  onClick={() => onSetAutoSaveInterval(interval)}
                  className={`py-1.5 text-xs font-mono rounded border transition-colors cursor-pointer ${
                    !state.settings.autoSaveEnabled
                      ? 'bg-slate-900 text-slate-600 border-slate-800 opacity-50 cursor-not-allowed'
                      : state.settings.autoSaveInterval === interval
                      ? 'bg-indigo-600 text-white font-bold border-indigo-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {interval}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* File and Clipboard Save Transfer Controls */}
        <div className="space-y-3">
          <label className="block text-xs font-medium text-slate-300">
            Save File Transfer & Backup
          </label>
          <div className="flex flex-wrap items-center gap-3">
            {/* Export file */}
            <button
              type="button"
              onClick={onExportSaveToFile}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export Save File</span>
            </button>

            {/* Import file */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".txt,.json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              <span>Import Save File</span>
            </button>

            {/* Restore from Automatic Backup */}
            <button
              type="button"
              onClick={onRestoreBackup}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-200 rounded-lg text-xs font-semibold border border-indigo-500/40 transition-colors cursor-pointer"
              title="Restores progress from automated backup snapshot created before updates"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Restore Backup</span>
            </button>

            {/* Clipboard copy */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>{copyFeedback ? '✓ Copied Text!' : 'Copy Save Code'}</span>
            </button>

            {/* Hard Reset */}
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="flex items-center gap-1 px-3 py-2 bg-slate-900 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 rounded-lg text-xs font-medium border border-slate-800 hover:border-rose-900/60 transition-colors cursor-pointer ml-auto"
              >
                <Trash2 className="w-3 h-3" />
                <span>Hard Reset</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 ml-auto bg-rose-950/40 border border-rose-500/40 px-3 py-1.5 rounded-lg">
                <span className="text-xs text-rose-300 font-medium">Confirm reset?</span>
                <button
                  type="button"
                  onClick={() => {
                    onHardReset();
                    setConfirmReset(false);
                  }}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded cursor-pointer"
                >
                  Wipe All
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs rounded cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Import Code Input String */}
          <div className="pt-2">
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Paste Save String (Manual text import)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste base64 save code here..."
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleImportText}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
              >
                Import
              </button>
            </div>
            {importFeedback && (
              <div className="text-xs font-mono text-indigo-400 mt-2">{importFeedback}</div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Game Settings Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-indigo-400" />
          <span>Game Settings</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Notation Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Number Notation
            </label>
            <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {(['scientific', 'engineering', 'standard', 'logarithm'] as const).map((not) => (
                <button
                  key={not}
                  type="button"
                  onClick={() => onSetNotation(not)}
                  className={`py-1.5 text-[11px] font-mono rounded capitalize transition-colors cursor-pointer ${
                    notation === not
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {not}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Toggle */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Sound Effects
            </label>
            <button
              type="button"
              onClick={onToggleSound}
              className={`w-full py-2.5 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                state.settings.soundEnabled
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-950 text-slate-500 border-slate-800'
              }`}
            >
              {state.settings.soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Audio: ENABLED</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-500" />
                  <span>Audio: MUTED</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Statistics Display */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span>Game Statistics</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 uppercase text-[10px]">Total Playtime</span>
            <div className="text-slate-200 font-semibold text-sm mt-1">
              {formatDuration(state.stats.totalTimePlayed)}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 uppercase text-[10px]">Current Run Time</span>
            <div className="text-slate-200 font-semibold text-sm mt-1">
              {formatDuration(state.stats.timeThisPrestige)}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 uppercase text-[10px]">Total Prestiges</span>
            <div className="text-indigo-400 font-semibold text-sm mt-1">
              {state.stats.totalPrestiges}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 uppercase text-[10px]">Fastest Prestige</span>
            <div className="text-emerald-400 font-semibold text-sm mt-1">
              {formatDuration(state.stats.fastestPrestige)}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 uppercase text-[10px]">Peak Points Rate</span>
            <div className="text-slate-200 font-semibold text-sm mt-1 truncate">
              {state.stats.peakPointsRate.format(notation)}/s
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 uppercase text-[10px]">Highest Points Ever</span>
            <div className="text-slate-200 font-semibold text-sm mt-1 truncate">
              {state.stats.highestPointsEver.format(notation)}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 uppercase text-[10px]">Highest PP Ever</span>
            <div className="text-amber-400 font-semibold text-sm mt-1 truncate">
              {state.stats.highestPPEver.format(notation)} PP
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 uppercase text-[10px]">Manual Purchases</span>
            <div className="text-slate-200 font-semibold text-sm mt-1">
              {state.stats.totalManualClicks}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
