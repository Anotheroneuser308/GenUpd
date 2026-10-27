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
  AlertTriangle,
  X,
} from 'lucide-react';
import { GameState } from '../types/game';
import { Decimal } from '../utils/decimal';
import { createInitialState, serializeState } from '../constants/initialState';
import { GrowthHistoryChart } from './GrowthHistoryChart';


type SaveBankPresetId =
  | 'first-prestige'
  | 'first-prestige-energy'
  | 'first-infinity'
  | 'ten-infinities'
  | 'milestones-unlocked'
  | 'break-infinity'
  | 'stardust-unlocked'
  | 'star-1'
  | 'star-10'
  | 'supernova-ready';

interface SaveBankPresetDefinition {
  id: SaveBankPresetId;
  title: string;
  stage: string;
  description: string;
  icon: string;
  progress: string;
}

const SAVE_BANK_PREVIOUS_STATE_KEY = 'generators_save_bank_previous_v1';

const SAVE_BANK_PRESETS: SaveBankPresetDefinition[] = [
  { id: 'first-prestige', title: 'First Prestige', stage: 'Prestige', description: 'A checkpoint after the first Prestige reset, with 8 Prestige Points (PP) available.', icon: '🏆', progress: '1 Prestige · 8 PP' },
  { id: 'first-prestige-energy', title: 'First Prestige Energy', stage: 'Prestige Energy', description: 'Prestige Energy has been reset once. One PE is available, with a developed run ready to continue.', icon: '⚡', progress: '1 PE reset' },
  { id: 'first-infinity', title: 'First Infinity', stage: 'Infinity', description: 'The first Big Crunch is complete. Infinity Points (IP) and Skill Points (SP) are available.', icon: '♾️', progress: '1 Infinity · 1 IP · 1.00e0 SP' },
  { id: 'ten-infinities', title: '10 Infinities', stage: 'Infinity', description: 'Ten Big Crunches recorded, with IP and SP accumulated for the next stage.', icon: '🔟', progress: '10 Infinities' },
  { id: 'milestones-unlocked', title: 'Infinity Milestones Unlocked', stage: 'Milestones', description: 'The Infinity Tree path to Infinity Milestones is already purchased, so the milestone system is immediately available.', icon: '🌿', progress: '40 Infinities · Milestones unlocked' },
  { id: 'break-infinity', title: 'Break Infinity', stage: 'Post-Infinity', description: 'Points have passed 1e308, and both Break Infinity nodes are unlocked so you can test post-Infinity scaling.', icon: '🌌', progress: '4,000 Infinities · Points above 1e308' },
  { id: 'stardust-unlocked', title: 'Stardust Unlocked', stage: 'Stardust', description: 'Stardust Genesis is unlocked with early Stardust upgrades already purchased.', icon: '✨', progress: 'Stardust unlocked · Early upgrades' },
  { id: 'star-1', title: 'Star 1', stage: 'Stars Realm', description: 'One Star reset completed, with early and mid-tier Stardust upgrades prepared.', icon: '🌟', progress: '1 Star · Upgrades purchased' },
  { id: 'star-10', title: 'Star 10', stage: 'Stars Realm', description: 'Ten Star resets completed, with high-tier Stardust upgrades prepared.', icon: '🌌', progress: '10 Stars · Late upgrades purchased' },
  { id: 'supernova-ready', title: 'Supernova Ready', stage: 'Supernova', description: '100 Stars forged, Star Milestone 100 unlocked, ready to trigger your first Supernova!', icon: '💥', progress: '100 Stars · Supernova Unlocked' },
];

interface SaveBankPresetConfig {
  pointsExponent: number;
  prestigeCount: number;
  prestigePoints: Decimal;
  peResets: number;
  peAmount: Decimal;
  totalPE: Decimal;
  prestigeEnergyLevel: number;
  infinityCount: number;
  infinityPoints: Decimal;
  totalIP: Decimal;
  skillPoints: number;
  tree: Record<string, boolean | number>;
  generatorBuys: number[];
  generatorAmountExponents: Array<number | null>;
  tickspeedBuys: number;
  totalTimePlayed: number;
  stardust?: Partial<NonNullable<GameState['stardust']>>;
}

function createSaveBankPresetState(presetId: SaveBankPresetId): GameState {
  const state = createInitialState();
  const configs: Record<SaveBankPresetId, SaveBankPresetConfig> = {
    'first-prestige': {
      pointsExponent: 10, prestigeCount: 1, prestigePoints: new Decimal(8),
      peResets: 0, peAmount: Decimal.zero(), totalPE: Decimal.zero(), prestigeEnergyLevel: 0,
      infinityCount: 0, infinityPoints: Decimal.zero(), totalIP: Decimal.zero(), skillPoints: 0,
      tree: {}, generatorBuys: [10, 3, 0, 0, 0, 0, 0, 0],
      generatorAmountExponents: [12, 5, null, null, null, null, null, null], tickspeedBuys: 4, totalTimePlayed: 900,
    },
    'first-prestige-energy': {
      pointsExponent: 153, prestigeCount: 12, prestigePoints: new Decimal(1, 50),
      peResets: 1, peAmount: new Decimal(1), totalPE: new Decimal(1), prestigeEnergyLevel: 1,
      infinityCount: 0, infinityPoints: Decimal.zero(), totalIP: Decimal.zero(), skillPoints: 0,
      tree: {}, generatorBuys: [100, 70, 40, 20, 10, 5, 2, 0],
      generatorAmountExponents: [123, 75, 50, 25, 10, 3, 0, null], tickspeedBuys: 35, totalTimePlayed: 7200,
    },
    'first-infinity': {
      pointsExponent: 300, prestigeCount: 40, prestigePoints: new Decimal(1, 100),
      peResets: 12, peAmount: new Decimal(20), totalPE: new Decimal(20), prestigeEnergyLevel: 8,
      infinityCount: 1, infinityPoints: new Decimal(1), totalIP: new Decimal(1), skillPoints: 1,
      tree: {}, generatorBuys: [150, 120, 90, 60, 30, 10, 2, 0],
      generatorAmountExponents: [255, 80, 60, 40, 20, 5, 1, null], tickspeedBuys: 60, totalTimePlayed: 21600,
    },
    'ten-infinities': {
      pointsExponent: 300, prestigeCount: 150, prestigePoints: new Decimal(1, 120),
      peResets: 40, peAmount: new Decimal(100), totalPE: new Decimal(100), prestigeEnergyLevel: 15,
      infinityCount: 10, infinityPoints: new Decimal(10), totalIP: new Decimal(10), skillPoints: 10,
      tree: {}, generatorBuys: [200, 160, 120, 80, 40, 20, 10, 3],
      generatorAmountExponents: [238, 110, 80, 50, 30, 10, 3, 0], tickspeedBuys: 80, totalTimePlayed: 86400,
    },
    'milestones-unlocked': {
      pointsExponent: 306, prestigeCount: 500, prestigePoints: new Decimal(1, 150),
      peResets: 100, peAmount: new Decimal(1000), totalPE: new Decimal(1000), prestigeEnergyLevel: 20,
      infinityCount: 40, infinityPoints: new Decimal(1, 5), totalIP: new Decimal(1, 5), skillPoints: 10,
      tree: { root: true, feat_1: true, feat_2: true, feat_3: true },
      generatorBuys: [250, 200, 150, 100, 50, 25, 10, 3],
      generatorAmountExponents: [221, 150, 120, 90, 50, 25, 5, 0], tickspeedBuys: 100, totalTimePlayed: 172800,
    },
    'break-infinity': {
      pointsExponent: 320, prestigeCount: 4000, prestigePoints: new Decimal(1, 250),
      peResets: 1000, peAmount: new Decimal(1, 6), totalPE: new Decimal(1, 6), prestigeEnergyLevel: 30,
      infinityCount: 4000, infinityPoints: new Decimal(1, 16), totalIP: new Decimal(1, 25), skillPoints: 470,
      tree: { root: true, feat_1: true, feat_2: true, feat_3: true, feat_4: true, feat_5: true },
      generatorBuys: [300, 250, 200, 150, 100, 50, 20, 5],
      generatorAmountExponents: [195, 175, 150, 125, 90, 40, 20, 5], tickspeedBuys: 150, totalTimePlayed: 604800,
    },
    'stardust-unlocked': {
      pointsExponent: 320, prestigeCount: 4000, prestigePoints: new Decimal(1, 250),
      peResets: 1000, peAmount: new Decimal(1, 6), totalPE: new Decimal(1, 6), prestigeEnergyLevel: 30,
      infinityCount: 4000, infinityPoints: new Decimal(1, 16), totalIP: new Decimal(1, 25), skillPoints: 470,
      tree: { root: true, feat_1: true, feat_2: true, feat_3: true, feat_4: true, feat_5: true, feat_6: true, dust_1: true, dust_2: true },
      generatorBuys: [300, 250, 200, 150, 100, 50, 20, 5],
      generatorAmountExponents: [195, 175, 150, 125, 90, 40, 20, 5], tickspeedBuys: 150, totalTimePlayed: 604800,
      stardust: {
        unlocked: true, amount: new Decimal(1, 7), totalEarned: new Decimal(1, 9),
        doublerLevel: 12, baseUpgradeLevel: 16, stellarRadiance: true, astralLens: true,
        constellationHarmonizer: true, cosmicWeaver: false, supernovaCatalyst: false,
        astralConvergence: false, starsUnlocked: false, radiantMultiplicity: false,
        singularityRefraction: false, stardustAutoBuyerEnabled: false, stars: 0, totalStars: 0,
      },
    },
    'star-1': {
      pointsExponent: 320, prestigeCount: 4000, prestigePoints: new Decimal(1, 250),
      peResets: 1000, peAmount: new Decimal(1, 6), totalPE: new Decimal(1, 6), prestigeEnergyLevel: 30,
      infinityCount: 4000, infinityPoints: new Decimal(1, 16), totalIP: new Decimal(1, 25), skillPoints: 470,
      tree: { root: true, feat_1: true, feat_2: true, feat_3: true, feat_4: true, feat_5: true, feat_6: true, dust_1: true, dust_2: true, dust_3: true },
      generatorBuys: [300, 250, 200, 150, 100, 50, 20, 5],
      generatorAmountExponents: [195, 175, 150, 125, 90, 40, 20, 5], tickspeedBuys: 150, totalTimePlayed: 604800,
      stardust: {
        unlocked: true, amount: new Decimal(1, 11), totalEarned: new Decimal(1, 13),
        doublerLevel: 18, baseUpgradeLevel: 30, stellarRadiance: true, astralLens: true,
        constellationHarmonizer: true, cosmicWeaver: true, supernovaCatalyst: true,
        astralConvergence: true, starsUnlocked: true, radiantMultiplicity: false,
        singularityRefraction: false, stardustAutoBuyerEnabled: false, stars: 1, totalStars: 1,
      },
    },
    'star-10': {
      pointsExponent: 320, prestigeCount: 4000, prestigePoints: new Decimal(1, 250),
      peResets: 1000, peAmount: new Decimal(1, 6), totalPE: new Decimal(1, 6), prestigeEnergyLevel: 30,
      infinityCount: 4000, infinityPoints: new Decimal(1, 16), totalIP: new Decimal(1, 25), skillPoints: 470,
      tree: { root: true, feat_1: true, feat_2: true, feat_3: true, feat_4: true, feat_5: true, feat_6: true, dust_1: true, dust_2: true, dust_3: true, dust_4: true },
      generatorBuys: [300, 250, 200, 150, 100, 50, 20, 5],
      generatorAmountExponents: [195, 175, 150, 125, 90, 40, 20, 5], tickspeedBuys: 150, totalTimePlayed: 604800,
      stardust: {
        unlocked: true, amount: new Decimal(1, 30), totalEarned: new Decimal(1, 31),
        doublerLevel: 40, baseUpgradeLevel: 60, stellarRadiance: true, astralLens: true,
        constellationHarmonizer: true, cosmicWeaver: true, supernovaCatalyst: true,
        astralConvergence: true, starsUnlocked: true, radiantMultiplicity: true,
        singularityRefraction: true, stardustAutoBuyerEnabled: false, stars: 10, totalStars: 10,
      },
    },
    'supernova-ready': {
      pointsExponent: 450, prestigeCount: 10000, prestigePoints: new Decimal(1, 400),
      peResets: 5000, peAmount: new Decimal(1, 12), totalPE: new Decimal(1, 12), prestigeEnergyLevel: 45,
      infinityCount: 100000, infinityPoints: new Decimal(1, 30), totalIP: new Decimal(1, 40), skillPoints: 1e11,
      tree: { root: true, feat_1: true, feat_2: true, feat_3: true, feat_4: true, feat_5: true, feat_6: true, dust_1: true, dust_2: true, dust_3: true, dust_4: true, dust_5: true, dust_6: true, dust_7: true },
      generatorBuys: [500, 450, 400, 350, 300, 250, 200, 150],
      generatorAmountExponents: [350, 320, 290, 260, 230, 200, 170, 140], tickspeedBuys: 25000, totalTimePlayed: 1209600,
      stardust: {
        unlocked: true, amount: new Decimal(1, 50), totalEarned: new Decimal(1, 52),
        doublerLevel: 80, baseUpgradeLevel: 120, stellarRadiance: true, astralLens: true,
        constellationHarmonizer: true, cosmicWeaver: true, supernovaCatalyst: true,
        astralConvergence: true, starsUnlocked: true, radiantMultiplicity: true,
        singularityRefraction: true, stardustAutoBuyerEnabled: true, stars: 100, totalStars: 100,
        supernova: {
          unlocked: true,
          count: 0,
          starPower: Decimal.zero(),
          totalStarPower: Decimal.zero(),
          upgrades: {},
        },
      },
    },
  };

  const config = configs[presetId];
  const points = new Decimal(1, config.pointsExponent);
  state.points = points;
  state.pointsPerSecond = Decimal.zero();
  state.lastUpdate = Date.now();
  state.generatorCostSoftcapBought = null;
  state.generators = state.generators.map((generator, index) => {
    const bought = config.generatorBuys[index] ?? 0;
    const amountExponent = config.generatorAmountExponents[index];
    return {
      ...generator,
      bought,
      amount: amountExponent === null ? Decimal.zero() : new Decimal(1, amountExponent),
      multiplier: new Decimal(2).pow(bought),
    };
  });
  state.tickspeed.bought = config.tickspeedBuys;
  state.tickspeed.cost = new Decimal(1e3).mul(new Decimal(15).pow(config.tickspeedBuys));
  state.prestige.count = config.prestigeCount;
  state.prestige.points = config.prestigePoints;
  state.prestige.unlockedGenerators = 4;
  state.prestigeEnergy.unlocked = config.peResets > 0;
  state.prestigeEnergy.resets = config.peResets;
  state.prestigeEnergy.amount = config.peAmount;
  state.prestigeEnergy.totalEarned = config.totalPE;
  state.prestigeEnergy.generatorUpgradeLevel = config.prestigeEnergyLevel;
  state.infinity.count = config.infinityCount;
  state.infinity.unlocked = config.infinityCount > 0;
  state.infinity.points = config.infinityPoints;
  state.infinity.totalEarnedIP = config.totalIP;
  state.infinity.skillPoints = config.skillPoints;
  state.infinityTree = { ...config.tree };
  if (config.stardust) {
    state.stardust = { ...state.stardust!, ...config.stardust };
    state.infinity.breakInfinityUpgrades = {
      ...state.infinity.breakInfinityUpgrades,
      stardustTreeUnlock: true,
    };
    state.infinityTree = { ...state.infinityTree, feat_6: true };
  }
  state.stats.totalPrestiges = config.prestigeCount;
  state.stats.totalInfinities = config.infinityCount;
  state.stats.totalTimePlayed = config.totalTimePlayed;
  state.stats.onlineTimePlayed = config.totalTimePlayed;
  state.stats.timeThisPrestige = 0;
  state.stats.timeThisInfinity = 0;
  state.stats.highestPointsEver = points;
  state.stats.highestPPEver = config.prestigePoints;
  state.stats.highestIPEver = config.infinityPoints;
  return state;
}

function createSaveBankPresetSaveCode(presetId: SaveBankPresetId): string {
  return btoa(unescape(encodeURIComponent(serializeState(createSaveBankPresetState(presetId)))));
}

interface SaveBankPanelProps {
  onExportSave: () => string;
  onImportSave: (saveStr: string) => boolean;
}

type PendingSaveBankAction =
  | { type: 'preset'; presetId: SaveBankPresetId }
  | { type: 'restore' };

const SaveBankPanel: React.FC<SaveBankPanelProps> = ({ onExportSave, onImportSave }) => {
  const [pendingAction, setPendingAction] = useState<PendingSaveBankAction | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hasPreviousSave, setHasPreviousSave] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return Boolean(window.localStorage.getItem(SAVE_BANK_PREVIOUS_STATE_KEY));
    } catch {
      return false;
    }
  });

  const handleConfirmAction = () => {
    if (!pendingAction) return;
    try {
      const currentSave = onExportSave();
      if (!currentSave) {
        setFeedback('Could not back up the current save. No checkpoint was loaded.');
        setPendingAction(null);
        return;
      }
      if (pendingAction.type === 'preset') {
        window.localStorage.setItem(SAVE_BANK_PREVIOUS_STATE_KEY, currentSave);
        const preset = SAVE_BANK_PRESETS.find((item) => item.id === pendingAction.presetId);
        const loaded = onImportSave(createSaveBankPresetSaveCode(pendingAction.presetId));
        setFeedback(loaded
          ? (preset?.title ?? 'Checkpoint') + ' loaded. Your previous progress was backed up.'
          : 'The checkpoint could not be loaded. Your previous save backup is preserved.');
        if (loaded) setHasPreviousSave(true);
      } else {
        const previousSave = window.localStorage.getItem(SAVE_BANK_PREVIOUS_STATE_KEY);
        if (!previousSave) {
          setFeedback('No previous save backup is available yet.');
        } else {
          window.localStorage.setItem(SAVE_BANK_PREVIOUS_STATE_KEY, currentSave);
          const restored = onImportSave(previousSave);
          if (restored) {
            setHasPreviousSave(true);
            setFeedback('Previous save restored. Your former run is now stored in the backup slot.');
          } else {
            window.localStorage.setItem(SAVE_BANK_PREVIOUS_STATE_KEY, previousSave);
            setFeedback('The previous save backup could not be loaded.');
          }
        }
      }
    } catch {
      setFeedback('Save Bank could not access local storage. No checkpoint was loaded.');
    }
    setPendingAction(null);
  };

  const pendingPreset = pendingAction?.type === 'preset'
    ? SAVE_BANK_PRESETS.find((preset) => preset.id === pendingAction.presetId)
    : null;

  return (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-950/70 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
            <Save className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">Save Bank</h2>
            <p className="text-xs text-slate-400 mt-1">Load a prepared checkpoint to jump straight to a specific stage of Generators.</p>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-950/20 p-3 text-xs text-amber-100/90">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-300" />
          <p>Loading a checkpoint replaces your current run. A separate previous-save backup is created automatically and can be restored here later.</p>
        </div>
      </div>

      {hasPreviousSave && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-300 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-emerald-200">Previous Save Backup Available</div>
              <p className="text-xs text-slate-400 mt-0.5">Restore the run that was active before the last Save Bank load.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPendingAction({ type: 'restore' })}
            className="rounded-lg border border-emerald-500/30 bg-emerald-900/40 px-4 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-800/60 transition-colors"
          >
            Restore Previous Save
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {SAVE_BANK_PRESETS.map((preset, index) => (
          <div key={preset.id} className="flex flex-col rounded-xl border border-slate-800 bg-slate-900 p-5 gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-950/40 w-11 h-11 text-xl shrink-0">
                {preset.icon}
              </div>
              <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[10px] font-mono text-slate-400">
                CHECKPOINT {index + 1}
              </span>
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <h3 className="text-sm font-bold text-slate-100">{preset.title}</h3>
                <p className="mt-1 text-[10px] uppercase tracking-wider font-semibold text-indigo-300">{preset.stage}</p>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">{preset.description}</p>
              <div className="inline-flex rounded-md border border-slate-700/80 bg-slate-950 px-2.5 py-1.5 text-[10px] font-mono text-slate-300">
                {preset.progress}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                setPendingAction({ type: 'preset', presetId: preset.id });
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-600/90 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Load Checkpoint
            </button>
          </div>
        ))}
      </div>

      {feedback && (
        <div className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-xs text-slate-200">
          {feedback}
        </div>
      )}

      {pendingAction && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPendingAction(null)}
        >
          <div
            className="w-full max-w-md space-y-5 rounded-2xl border-2 border-amber-500/40 bg-slate-900 p-6 shadow-2xl shadow-black/50"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-amber-300" />
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">
                  {pendingAction.type === 'restore' ? 'Restore Previous Save?' : 'Load ' + (pendingPreset?.title ?? 'Checkpoint') + '?'}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  {pendingAction.type === 'restore'
                    ? 'Your current run will be stored in the backup slot, and the previous run will replace it.'
                    : 'Your current run will be backed up, then replaced with this prepared checkpoint.'}
                </p>
              </div>
              <button type="button" onClick={() => setPendingAction(null)} className="rounded-lg p-1 text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
              >
                {pendingAction.type === 'restore' ? 'Restore Previous Save' : 'Load Checkpoint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'overview' | 'saveBank'>('overview');

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
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-1.5">
        <button
          type="button"
          onClick={() => setActiveSettingsTab('overview')}
          className={activeSettingsTab === 'overview' ? 'rounded-lg px-4 py-2.5 text-xs font-bold transition-colors bg-indigo-600 text-white' : 'rounded-lg px-4 py-2.5 text-xs font-bold transition-colors text-slate-400 hover:bg-slate-800 hover:text-white'}
        >
          Stats & Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveSettingsTab('saveBank')}
          className={activeSettingsTab === 'saveBank' ? 'rounded-lg px-4 py-2.5 text-xs font-bold transition-colors bg-indigo-600 text-white' : 'rounded-lg px-4 py-2.5 text-xs font-bold transition-colors text-slate-400 hover:bg-slate-800 hover:text-white'}
        >
          Save Bank
        </button>
      </div>

      {activeSettingsTab === 'saveBank' ? (
        <SaveBankPanel onExportSave={onExportSave} onImportSave={onImportSave} />
      ) : (
        <>
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

            {/* Wipe Save Button */}
            <button
              type="button"
              onClick={() => setShowWipeModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 rounded-lg text-xs font-medium border border-slate-800 hover:border-rose-900/60 transition-colors cursor-pointer ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Wipe Save</span>
            </button>
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

          {/* Danger Zone: Wipe Button */}
          <div className="md:col-span-2 pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span>Danger Zone</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Permanently wipes all game progress and backup saves.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowWipeModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg text-xs font-bold border border-rose-500/40 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span>Wipe Save</span>
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
            <span className="text-slate-500 uppercase text-[10px]">Online Playtime</span>
            <div className="text-emerald-300 font-semibold text-sm mt-1">
              {formatDuration(state.stats.onlineTimePlayed || 0)}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 uppercase text-[10px]">Offline Playtime</span>
            <div className="text-sky-300 font-semibold text-sm mt-1">
              {formatDuration(state.stats.offlineTimePlayed || 0)}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 uppercase text-[10px]">Playtime This Session</span>
            <div className="text-amber-300 font-semibold text-sm mt-1">
              {formatDuration(state.stats.sessionTimePlayed || 0)}
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

      {/* Wipe Confirmation Modal Window */}
      {showWipeModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowWipeModal(false)}
        >
          <div
            className="bg-slate-900 border-2 border-rose-600/70 rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-rose-950/60 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-950/80 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white flex items-center justify-between">
                  <span>Wipe Save?</span>
                  <button
                    type="button"
                    onClick={() => setShowWipeModal(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </h3>
                <p className="text-xs text-rose-300 font-medium mt-1">
                  Warning: This action is irreversible!
                </p>
              </div>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 space-y-2.5 leading-relaxed">
              <p className="font-semibold text-rose-200">
                Are you sure you want to permanently erase all game progress?
              </p>
              <ul className="list-disc list-inside text-slate-400 text-[11px] space-y-1">
                <li>All Points, Generators, and Boosters will be deleted.</li>
                <li>Prestige Points (PP) and Energy levels will be reset.</li>
                <li>Infinity Points (IP), milestones, and branches will be deleted.</li>
                <li>All backup saves will be cleared.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowWipeModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  window.localStorage.removeItem(SAVE_BANK_PREVIOUS_STATE_KEY);
                  onHardReset();
                  setShowWipeModal(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Wipe</span>
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
