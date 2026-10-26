import React, { useState } from 'react';
import { Decimal } from '../utils/decimal';
import { GameState, PrestigeAutobuyerMode, InfinityAutobuyerMode, BreakInfinityUpgradeId } from '../types/game';
import {
  INFINITY_THRESHOLD,
  calculateInfinityPointGain,
  calculateSkillPointsGain,
  formatSkillPoints,
  getInfinityMilestoneExtraSP,
  getTemporalInfinityMultiplier,
  getAchievementMasterCompletions,
  getStardustPerSecond,
  getStardustGeneratorExponent,
  getStardustDoublerCost,
  getStardustBaseCost,
  getSkillAmplificationLevel,
  getSkillAmplificationCost,
  getStarResetCost,
  getStarGeneratorExponent,
  getStarStardustMultiplier,
} from '../utils/gameCalculations';
import { INFINITY_MILESTONES, getInfinityMilestoneRequirementProgress, isInfinityMilestoneUnlocked } from '../utils/infinityMilestones';
import { STAR_MILESTONES, isStarMilestoneUnlocked } from '../constants/starMilestones';
import { InfinityTree } from './InfinityTree';
import { Layers, Atom, Cpu, Sparkles, Star } from 'lucide-react';
import { AutomationTab } from './AutomationTab';


type AdvancedBreakInfinityUpgradeId =
  | 'fractalIgnition'
  | 'singularityOverdrive'
  | 'hyperchargeOverdrive'
  | 'vacuumCascade'
  | 'transcendentCascade'
  | 'absoluteHorizon'
  | 'prestigePreservationUnlock'
  | 'stardustTreeUnlock';

interface AdvancedBreakInfinityUpgradeDefinition {
  id: AdvancedBreakInfinityUpgradeId;
  title: string;
  description: string;
  cost: Decimal;
  requirement?: 'singularityResonance' | 'hypercharge';
}

const ADVANCED_BREAK_INFINITY_UPGRADES: AdvancedBreakInfinityUpgradeDefinition[] = [
  { id: 'fractalIgnition', title: 'Fractal Ignition', description: 'Points generation gains a controlled ×10^(0.01 × OoMs^0.8) multiplier above 1e308 Points.', cost: new Decimal(1, 40) },
  { id: 'singularityOverdrive', title: 'Badass Singularity', description: 'Upgrades Singularity Resonance and Vacuum Momentum to +2% per OoM, then raises both multipliers to ^7.77. Requires Singularity Resonance.', cost: new Decimal(1, 50), requirement: 'singularityResonance' },
  { id: 'hyperchargeOverdrive', title: 'Hypercharge Overdrive', description: 'Adds an extra generator multiplier of ×10^(0.5 × √OoMs above 1e308 Points). Requires Dimension Hypercharge.', cost: new Decimal(1, 60), requirement: 'hypercharge' },
  { id: 'vacuumCascade', title: 'Vacuum Cascade', description: 'Infinity Point gains are multiplied by 10^(0.1 × sqrt(OoMs above 1e308)).', cost: new Decimal(1, 75) },
  { id: 'transcendentCascade', title: 'Transcendent Cascade', description: 'Raises the final multiplier of every Generator to the power of 1.05.', cost: new Decimal(1, 90) },
  { id: 'absoluteHorizon', title: 'Absolute Horizon', description: 'Raises the total Points generation multiplier to the power of 1.05.', cost: new Decimal(1, 110) },
  { id: 'prestigePreservationUnlock', title: 'Eternal Continuity Matrix', description: 'Unlocks Prestige Point Preservation (auto_10, 1.20e4 SP), Stardust Genesis (feat_6), and Infinite Amplification Mastery (pre_6) in the Infinity Tree.', cost: new Decimal(1, 200) },
  { id: 'stardustTreeUnlock', title: 'Stardust Astral Matrix', description: 'Unlocks the Stardust branch (dust_1) in the Infinity Tree, initiating the celestial path.', cost: new Decimal(1, 308) },
];

function getAdvancedBreakInfinityPreview(id: AdvancedBreakInfinityUpgradeId, state: GameState, oomAbove: number): string {
  switch (id) {
    case 'fractalIgnition':
      return 'Points gain ×' + new Decimal(10).pow(0.01 * Math.pow(oomAbove, 0.8)).format(state.settings.notation);
    case 'singularityOverdrive':
      return 'Singularity Resonance becomes ×' + new Decimal(1 + 0.02 * oomAbove).pow(7.77).format(state.settings.notation);
    case 'hyperchargeOverdrive':
      return 'Extra generator multiplier ×' + new Decimal(10).pow(0.5 * Math.sqrt(oomAbove)).format(state.settings.notation);
    case 'vacuumCascade':
      return 'IP gain ×' + new Decimal(10).pow(Math.sqrt(oomAbove) * 0.1).format(state.settings.notation);
    case 'transcendentCascade':
      return 'Generator multiplier exponent ^1.05';
    case 'absoluteHorizon':
      return 'Points generation multiplier exponent ^1.05';
    case 'prestigePreservationUnlock':
      return 'Unlocks "Prestige Point Preservation", "Stardust Genesis", and "Infinite Amplification Mastery" in Infinity Tree';
    case 'stardustTreeUnlock':
      return 'Unlocks Stardust branch (dust_1) in Infinity Tree';
  }
}

interface AdvancedBreakInfinityUpgradeCardProps {
  state: GameState;
  definition: AdvancedBreakInfinityUpgradeDefinition;
  onBuy: (id: BreakInfinityUpgradeId) => void;
}

const AdvancedBreakInfinityUpgradeCard: React.FC<AdvancedBreakInfinityUpgradeCardProps> = ({ state, definition, onBuy }) => {
  const isBought = !!state.infinity.breakInfinityUpgrades?.[definition.id];
  const canAfford = state.infinity.points.gte(definition.cost);
  const oomAbove = state.points.gt(new Decimal(1, 308)) ? Math.max(0, state.points.log10() - 308) : 0;
  const requirementMet = !definition.requirement || !!state.infinity.breakInfinityUpgrades?.[definition.requirement];
  const disabled = !canAfford || !requirementMet;

  return (
    <div className={isBought
      ? 'p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all bg-purple-950/25 border-purple-500/40'
      : 'p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all bg-slate-950/80 border-slate-700'}>
      <div>
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-semibold text-sm text-slate-100">{definition.title}</h4>
          {isBought
            ? <span className="text-[10px] font-mono text-purple-400 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 font-bold">ACTIVE</span>
            : <span className="text-[10px] font-mono text-slate-500">ONE-TIME</span>}
        </div>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">{definition.description}</p>
        <div className="mt-3 text-xs font-mono text-purple-300">
          <span>{isBought ? 'Current effect: ' : 'Potential effect: '}</span>
          <strong>{getAdvancedBreakInfinityPreview(definition.id, state, oomAbove)}</strong>
        </div>
        {definition.requirement && !requirementMet && (
          <p className="mt-2 text-[11px] text-amber-300">
            Requires {definition.requirement === 'hypercharge' ? 'Dimension Hypercharge' : 'Singularity Resonance'} first.
          </p>
        )}
      </div>
      <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
        <span className="text-xs font-mono text-slate-400">
          Cost: <strong className="text-purple-400">{definition.cost.format(state.settings.notation)} IP</strong>
        </span>
        {isBought
          ? <span className="text-xs font-mono text-purple-400 font-semibold">Active</span>
          : (
            <button
              type="button"
              onClick={() => onBuy(definition.id)}
              disabled={disabled}
              className={disabled
                ? 'px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-slate-800 text-slate-600 cursor-not-allowed'
                : 'px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 transition-all cursor-pointer'}
            >
              Buy Upgrade
            </button>
          )}
      </div>
    </div>
  );
};

interface InfinityTabProps {
  state: GameState;
  onBuyInfinityTreeNode: (nodeId: string) => void;
  onBuyIpDoubler?: () => void;
  onBuyMaxIpDoubler?: () => void;
  onBuyAutomationExpand?: () => void;
  onBuyAchievementMaster?: () => void;
  onBuyIpGeneratorBoost?: () => void;
  onBuyTimeIPBoost?: () => void;
  onBuyEnergySPBoost?: () => void;
  onBuySpDoublerUpgrade?: () => void;
  onBuyMaxSkillAmplification?: () => void;
  onBuyStardustDoubler?: () => void;
  onBuyMaxStardustDoubler?: () => void;
  onBuyStardustBase?: () => void;
  onBuyMaxStardustBase?: () => void;
  onBuyStellarRadiance?: () => void;
  onBuyAstralLens?: () => void;
  onBuyConstellationHarmonizer?: () => void;
  onBuyCosmicWeaver?: () => void;
  onBuySupernovaCatalyst?: () => void;
  onBuyAstralConvergence?: () => void;
  onBuyStarsUnlock?: () => void;
  onPerformStarReset?: () => void;
  onBuyBreakInfinityUpgrade?: (upgradeId: BreakInfinityUpgradeId) => void;
  onInfinityReset?: () => void;
  onToggleAutobuyer: (id: string) => void;
  onSetAutobuyerTarget: (id: string, target: number) => void;
  onSetPrestigeAutobuyerSettings: (settings: Partial<{ target: number; mode: PrestigeAutobuyerMode; timeTarget: number; ratioTarget: number }>) => void;
  onSetAutoPrestigeUpgradesSettings?: (settings: Partial<{ priority: 'cheapest' | 'order'; buyAll: boolean }>) => void;
  onSetAutoPrestigeEnergySettings?: (settings: Partial<{ energyMode: 'time' | 'target' | 'gainMultiplier'; energyTimeTarget: number; energyTarget: number; energyRatioTarget: number }>) => void;
  onSetAutoInfinitySettings?: (settings: Partial<{ infinityMode: InfinityAutobuyerMode; infinityTimeTarget: number; infinityTarget: number; infinityRatioTarget: number }>) => void;
}

export const InfinityTab: React.FC<InfinityTabProps> = ({
  state,
  onBuyInfinityTreeNode,
  onBuyIpDoubler,
  onBuyMaxIpDoubler,
  onBuyAutomationExpand,
  onBuyAchievementMaster,
  onBuyIpGeneratorBoost,
  onBuyTimeIPBoost,
  onBuyEnergySPBoost,
  onBuySpDoublerUpgrade,
  onBuyMaxSkillAmplification,
  onBuyStardustDoubler,
  onBuyMaxStardustDoubler,
  onBuyStardustBase,
  onBuyMaxStardustBase,
  onBuyStellarRadiance,
  onBuyAstralLens,
  onBuyConstellationHarmonizer,
  onBuyCosmicWeaver,
  onBuySupernovaCatalyst,
  onBuyAstralConvergence,
  onBuyStarsUnlock,
  onPerformStarReset,
  onBuyBreakInfinityUpgrade,
  onInfinityReset,
  onToggleAutobuyer,
  onSetAutobuyerTarget,
  onSetPrestigeAutobuyerSettings,
  onSetAutoPrestigeUpgradesSettings,
  onSetAutoPrestigeEnergySettings,
  onSetAutoInfinitySettings,
}) => {
  const [subTab, setSubTab] = useState<'tree' | 'chamber' | 'automation' | 'milestones' | 'stardust'>('tree');
  const [stardustView, setStardustView] = useState<'upgrades' | 'stars'>('upgrades');
  const notation = state.settings.notation;
  const canCrunch = state.points.gte(INFINITY_THRESHOLD);
  const crunchIPGain = calculateInfinityPointGain(state.points, state, state.infinity.count + 1);
  const crunchSPGain = calculateSkillPointsGain(state, state.infinity.count + 1);
  const totalInfinities = Math.max(state.infinity.count || 0, state.stats.totalInfinities || 0);

  return (
    <div className="space-y-6">
      {/* Infinity Banner */}
      <div className="bg-gradient-to-b from-amber-950/40 via-orange-950/20 to-slate-900 border border-amber-500/30 rounded-2xl p-6 md:p-8 flex flex-col items-center text-center gap-6 shadow-xl">
        <div className="max-w-xl">
          <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold font-mono">
            Singularity Tier
          </span>
          <h2 className="text-3xl font-bold text-white mt-1 tracking-tight">
            The Infinity Dimension
          </h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            You have transcended beyond 1.79e308 Points. At this layer, the universe undergoes complete collapse,
            yielding powerful Skill Points (SP) and Infinity Points (IP) to reconstruct cosmic reality.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-mono">
          <div className="bg-slate-950/70 border border-amber-500/40 p-4 rounded-xl min-w-[160px]">
            <span className="text-slate-500 uppercase text-[10px] block">Skill Points (SP)</span>
            <span className="text-xl font-bold text-amber-300 mt-1 block">
              {formatSkillPoints(state.infinity.skillPoints ?? 0)} SP
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl min-w-[160px]">
            <span className="text-slate-500 uppercase text-[10px] block">Infinity Points (IP)</span>
            <span className="text-xl font-bold text-amber-400 mt-1 block">
              {state.infinity.points.format(notation)} IP
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl min-w-[160px]">
            <span className="text-slate-500 uppercase text-[10px] block">Total Infinities</span>
            <span className="text-xl font-bold text-orange-400 mt-1 block">
              {state.infinity.count}
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl min-w-[160px]">
            <span className="text-slate-500 uppercase text-[10px] block">Threshold</span>
            <span className="text-xl font-bold text-slate-200 mt-1 block">
              {INFINITY_THRESHOLD.format(notation)}
            </span>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-2 border-t border-slate-800/80 pt-4">
          <button
            type="button"
            onClick={() => setSubTab('tree')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'tree'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Infinity Skill Tree</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('automation')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'automation'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Automation</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('chamber')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              subTab === 'chamber'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Atom className="w-3.5 h-3.5" />
            <span>Infinity Upgrades</span>
          </button>
          {state.infinityTree?.feat_3 && (
            <button
              type="button"
              onClick={() => setSubTab('milestones')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                subTab === 'milestones'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
              }`}
            >
              <span>🏆</span>
              <span>Milestones</span>
            </button>
          )}

          {(state.infinityTree?.feat_6 || state.stardust?.unlocked) && (
            <button
              type="button"
              onClick={() => setSubTab('stardust')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                subTab === 'stardust'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Stardust</span>
            </button>
          )}
        </div>
        {(state.infinityTree?.feat_4 || totalInfinities >= 10 || state.points.gte(INFINITY_THRESHOLD)) && (() => {
          const isCrunchCooldown = (state.stats?.timeThisInfinity || 0) < 0.1;
          const crunchDisabled = !canCrunch || isCrunchCooldown;
          return (
            <div className="flex flex-col items-center gap-2 border-t border-slate-800/80 pt-4 w-full">
              <button
                type="button"
                onClick={onInfinityReset}
                disabled={crunchDisabled}
                className={`px-8 py-3 rounded-xl text-sm font-bold font-mono transition-all ${
                  !crunchDisabled
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30 active:scale-95 cursor-pointer animate-pulse'
                    : isCrunchCooldown && canCrunch
                    ? 'bg-amber-950/60 text-amber-400/80 border border-amber-600/40 cursor-wait'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                {isCrunchCooldown && canCrunch
                  ? 'Crunch Cooldown (0.1s)...'
                  : `Big Crunch — +${crunchIPGain.format(notation)} IP · +${formatSkillPoints(crunchSPGain)} SP`}
              </button>
              <p className="text-[11px] text-slate-500 font-mono">
                {isCrunchCooldown && canCrunch
                  ? 'Fast Infinity rate limited to once per 0.1s.'
                  : canCrunch
                  ? 'Reset your current run to gain IP and Skill Points.'
                  : `Reach ${INFINITY_THRESHOLD.format(notation)} Points to Crunch.`}
              </p>
            </div>
          );
        })()}
      </div>

      {subTab === 'tree' ? (
        <InfinityTree
          state={state}
          onBuyInfinityTreeNode={onBuyInfinityTreeNode}
        />
      ) : subTab === 'automation' ? (
        <AutomationTab
          state={state}
          onToggleAutobuyer={onToggleAutobuyer}
          onSetAutobuyerTarget={onSetAutobuyerTarget}
          onSetPrestigeAutobuyerSettings={onSetPrestigeAutobuyerSettings}
          onSetAutoPrestigeUpgradesSettings={onSetAutoPrestigeUpgradesSettings}
          onSetAutoPrestigeEnergySettings={onSetAutoPrestigeEnergySettings}
          onSetAutoInfinitySettings={onSetAutoInfinitySettings}
        />
      ) : subTab === 'milestones' ? (
        <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-semibold text-base text-slate-100 flex items-center gap-2"><span>🏆</span> Infinity Milestones</h3>
              <p className="text-xs text-slate-400 mt-1">Rewards unlock after meeting a combination of Infinity count and run-history requirements.</p>
            </div>
            <div className="text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-amber-300">{totalInfinities} Infinities</div>
          </div>
          <div className="space-y-3">
            <p className="text-xs text-slate-400">Milestones unlock when their listed requirements are met. Lifetime IP and playtime requirements are cumulative, so spending IP does not undo progress.</p>
            {INFINITY_MILESTONES.map((milestone) => {
              const unlocked = isInfinityMilestoneUnlocked(state, milestone.id);
              const requirementProgress = getInfinityMilestoneRequirementProgress(state, milestone.id);
              return (
                <div key={milestone.id} className={`flex gap-4 p-4 rounded-xl border ${unlocked ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-slate-950/50 border-slate-800'}`}>
                  <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center text-2xl ${unlocked ? 'bg-emerald-900/40' : 'bg-slate-900 grayscale opacity-70'}`}>{milestone.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-100">{milestone.title}</h4><span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${unlocked ? 'text-emerald-300 border-emerald-500/30 bg-emerald-950/30' : 'text-slate-500 border-slate-700 bg-slate-900'}`}>{unlocked ? 'UNLOCKED' : 'LOCKED'}</span></div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{milestone.reward}</p>
                    <p className="text-[11px] text-slate-500 mt-2">Requirements: {milestone.requirement}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                      {requirementProgress.map((progress, index) => <span key={`${milestone.id}-${index}`} className={`text-[10px] font-mono ${unlocked ? 'text-emerald-400/80' : 'text-slate-500'}`}>{progress}</span>)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500">Additional Skill Points from unlocked Skill Point milestones are included in the Big Crunch reward preview.</p>
        </div>
      ) : subTab === 'stardust' ? (
        <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 space-y-6">
          {/* Header & Sub-navigation */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                <h3 className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-300 to-amber-300 font-mono">
                  {stardustView === 'stars' ? 'Stars Realm' : 'Stardust Nexus'}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/60 text-amber-400 border border-amber-500/30">
                  ONLINE ONLY
                </span>
                {(state.stardust?.stars || 0) > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    ★ {state.stardust?.stars} STARS
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {stardustView === 'stars'
                  ? 'Stars are condensed celestial singularities. Forming a Star resets current Stardust, lifetime Stardust, buyables, and unpreserved upgrades in exchange for a permanent Star that grants linear generator exponent power, exponential Stardust multipliers, and unique milestones.'
                  : "Stardust is a subtle celestial element forged in real-time. It cannot be accumulated while offline. Stardust raises every generator multiplier by an exponent starting at ^1.001. The first eight softcap tiers scale normally; from 1e9 Stardust onward, each additional magnitude is softcapped 2x more strongly."}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">Current Stardust</span>
              <span className="text-2xl font-bold font-mono text-purple-300">
                {(state.stardust?.amount || Decimal.zero()).format(notation)}
              </span>
            </div>
          </div>

          {/* Sub-tab view toggle if Stars are unlocked */}
          {(state.stardust?.starsUnlocked || (state.stardust?.stars || 0) > 0) && (
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setStardustView('upgrades')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  stardustView === 'upgrades'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Upgrades & Buyables</span>
              </button>
              <button
                type="button"
                onClick={() => setStardustView('stars')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  stardustView === 'stars'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                    : 'text-amber-300 hover:text-white bg-slate-950 border border-amber-500/30'
                }`}
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>Stars Reset Layer</span>
                <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40">
                  ★ {state.stardust?.stars || 0}
                </span>
              </button>
            </div>
          )}

          {stardustView === 'stars' ? (
            /* STARS REALM RESET LAYER VIEW */
            <div className="space-y-6">
              {/* Stars Overview Gauges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                <div className="bg-slate-950/70 border border-amber-500/30 p-4 rounded-xl">
                  <span className="text-slate-500 text-[10px] uppercase block">Total Stars</span>
                  <span className="text-xl font-bold text-amber-400 mt-1 block">
                    ★ {state.stardust?.stars || 0}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Lifetime forged: ★ {state.stardust?.totalStars || state.stardust?.stars || 0}
                  </span>
                </div>

                <div className="bg-slate-950/70 border border-purple-500/30 p-4 rounded-xl">
                  <span className="text-slate-500 text-[10px] uppercase block">Generator Power Exponent</span>
                  <span className="text-xl font-bold text-purple-300 mt-1 block">
                    ^{ (1 + getStarGeneratorExponent(state.stardust?.stars || 0)).toFixed(4) }
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Linear: +{isStarMilestoneUnlocked(state.stardust?.stars || 0, 6) ? '0.0015' : '0.0010'} per Star
                  </span>
                </div>

                <div className="bg-slate-950/70 border border-emerald-500/30 p-4 rounded-xl">
                  <span className="text-slate-500 text-[10px] uppercase block">Stardust Production Multiplier</span>
                  <span className="text-xl font-bold text-emerald-300 mt-1 block">
                    ×{(() => {
                      const multiplier = getStarStardustMultiplier(state.stardust?.stars || 0);
                      return multiplier.gte(new Decimal(1, 5))
                        ? `${multiplier.mantissa.toFixed(2)}e${multiplier.exponent}`
                        : multiplier.format(notation);
                    })()}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {isStarMilestoneUnlocked(state.stardust?.stars || 0, 3) ? '2.5× per Star' : '2× per Star'}
                  </span>
                </div>
              </div>

              {/* Star Reset Action Card */}
              {(() => {
                const currentStars = state.stardust?.stars || 0;
                const starCost = getStarResetCost(currentStars);
                const currentStardust = state.stardust?.amount || Decimal.zero();
                const canReset = currentStardust.gte(starCost);

                return (
                  <div className="p-6 rounded-2xl border bg-gradient-to-br from-amber-950/20 via-slate-950/90 to-purple-950/20 border-amber-500/40 space-y-4 shadow-xl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Star className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
                          <h4 className="text-base font-bold text-white tracking-wide">
                            Form Star #{currentStars + 1}
                          </h4>
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-950 border border-amber-500/40 text-amber-300">
                            +1 STAR
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                          Condenses your stellar matter into an immortal cosmic core. Grants a permanent linear exponent boost to all generators and exponential multiplier to future Stardust synthesis.
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] uppercase font-mono text-slate-400 block">Required Stardust</span>
                        <span className="text-xl font-bold font-mono text-amber-400">
                          {starCost.format(notation)} Stardust
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Cost scales by 100× per Star
                        </span>
                      </div>
                    </div>

                    {/* Warning and Preservation Info */}
                    <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200/90 space-y-1">
                      <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                        <span>⚠️</span>
                        <span>Star Reset Rules:</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Resets Stardust amount, lifetime Stardust, buyables (Doubler & Base), and unpreserved celestial upgrades in exchange for +1 Star.
                        {isStarMilestoneUnlocked(currentStars + 1, 2) && ' (Stellar Radiance preserved ✓)'}
                        {isStarMilestoneUnlocked(currentStars + 1, 4) && ' (Astral Focus & Harmonizer preserved ✓)'}
                        {isStarMilestoneUnlocked(currentStars + 1, 5) && ' (Cosmic Weaver, Catalyst & Convergence preserved ✓)'}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">
                        Current: <strong className="text-purple-300">{currentStardust.format(notation)}</strong> / {starCost.format(notation)}
                      </span>
                      <button
                        type="button"
                        onClick={onPerformStarReset}
                        disabled={!canReset}
                        className={`px-6 py-2.5 rounded-xl font-bold font-mono text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                          canReset
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95'
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        <Star className="w-4 h-4 fill-current" />
                        <span>Ignite Star (+1 Star)</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Star Milestones Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>Star Milestones</span>
                  </h4>
                  <span className="text-xs font-mono text-slate-400">
                    {STAR_MILESTONES.filter((m) => isStarMilestoneUnlocked(state.stardust?.stars || 0, m.starsRequired)).length} / {STAR_MILESTONES.length} Unlocked
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
                  {STAR_MILESTONES.map((m) => {
                    const isUnlocked = isStarMilestoneUnlocked(state.stardust?.stars || 0, m.starsRequired);
                    return (
                      <div
                        key={`star-ms-${m.starsRequired}`}
                        className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                          isUnlocked
                            ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                            : 'bg-slate-950/60 border-slate-800 text-slate-500'
                        }`}
                      >
                        <div className="text-2xl shrink-0 mt-0.5">{m.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h5 className={`font-bold text-xs ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                              {m.name}
                            </h5>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                                isUnlocked
                                  ? 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                                  : 'bg-slate-900 border-slate-700 text-slate-500'
                              }`}
                            >
                              ★ {m.starsRequired} {m.starsRequired === 1 ? 'STAR' : 'STARS'}
                            </span>
                          </div>
                          <p className={`text-[11px] mt-1 leading-relaxed ${isUnlocked ? 'text-amber-100/80' : 'text-slate-500'}`}>
                            {m.desc}
                          </p>
                          <div className="mt-2 text-[10px] font-semibold">
                            {isUnlocked ? (
                              <span className="text-emerald-400">ACTIVE ✓</span>
                            ) : (
                              <span className="text-slate-500">
                                Requires {m.starsRequired} Stars (currently {state.stardust?.stars || 0})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* STARDUST UPGRADES & BUYABLES VIEW */
            <>
              {/* Stardust Stat Gauges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                <div className="bg-slate-950/70 border border-purple-500/20 p-4 rounded-xl">
                  <span className="text-slate-500 text-[10px] uppercase block">Production Rate</span>
                  <span className="text-lg font-bold text-purple-300 mt-1 block">
                    +{getStardustPerSecond(state).format(notation)} / sec
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Active real-time tick</span>
                </div>

                <div className="bg-slate-950/70 border border-amber-500/20 p-4 rounded-xl">
                  <span className="text-slate-500 text-[10px] uppercase block">Generator Power Exponent</span>
                  <span className="text-lg font-bold text-amber-300 mt-1 block">
                    ^{getStardustGeneratorExponent(state.stardust?.amount || Decimal.zero(), state).toFixed(5)}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {(() => {
                      const amount = state.stardust?.amount || Decimal.zero();
                      const magnitude = amount.gt(0) ? Math.floor(amount.log10()) : 0;
                      const hasDust4 = !!state.infinityTree?.dust_4;
                      const hasAstralFocus = !!state.stardust?.astralLens;
                      const factor = (hasDust4 ? 9 : 10) - (hasAstralFocus ? 0.5 : 0);
                      if (magnitude >= 9) {
                        return `Enhanced softcap active: 2x stronger after 8 tiers (base divisor ${factor.toFixed(1)}x)`;
                      }
                      if (magnitude >= 1) {
                        return `Magnitude ${magnitude} softcap active (${factor.toFixed(1)}x base divisor); stronger tier starts at 1e9 Stardust`;
                      }
                      return 'Full unsoftcapped growth (up to 10 Stardust)';
                    })()}
                  </span>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
                  <span className="text-slate-500 text-[10px] uppercase block">Lifetime Stardust</span>
                  <span className="text-lg font-bold text-slate-200 mt-1 block">
                    {(state.stardust?.totalEarned || Decimal.zero()).format(notation)}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Total forged this Star run</span>
                </div>
              </div>

              {/* Celestial Buyables & Upgrades Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <span>Celestial Upgrades & Buyables</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Buyable 1: Stardust Doubler */}
                  {(() => {
                    const doublerLevel = state.stardust?.doublerLevel || 0;
                    const cost = getStardustDoublerCost(doublerLevel, state);
                    const canAfford = (state.stardust?.amount || Decimal.zero()).gte(cost);
                    const currentGainMult = Math.pow(2, doublerLevel);
                    const nextGainMult = Math.pow(2, doublerLevel + 1);
                    const scaleFactor = state.stardust?.astralConvergence ? 3.75 : 4;

                    return (
                      <div className="p-5 rounded-xl border bg-slate-950/80 border-purple-500/30 flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-semibold text-sm text-slate-100">Stardust Doubler</h4>
                            <span className="text-[10px] font-mono text-purple-400 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 font-bold">
                              LEVEL {doublerLevel}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            Doubles total Stardust generated per second. Cost scales by {scaleFactor}x per level{state.stardust?.astralConvergence ? ' (reduced by Astral Convergence)' : ''}.
                          </p>
                          <div className="mt-3 text-xs font-mono text-purple-300">
                            Current multiplier: <strong>×{currentGainMult}</strong>
                            <span className="text-slate-500 ml-2">→ Next: <strong className="text-purple-200">×{nextGainMult}</strong></span>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-400">
                            Cost: <strong className="text-purple-400">{cost.format(notation)} Stardust</strong>
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={onBuyStardustDoubler}
                              disabled={!canAfford}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                                canAfford
                                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                              }`}
                            >
                              Buy Doubler
                            </button>
                            <button
                              type="button"
                              onClick={onBuyMaxStardustDoubler}
                              disabled={!canAfford}
                              title="Buy as many Stardust Doubler levels as possible"
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border border-purple-500/40 ${
                                canAfford
                                  ? 'bg-purple-800/80 hover:bg-purple-700 text-white'
                                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                              }`}
                            >
                              MAX
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Buyable 2: Stardust Base */}
                  {(() => {
                    const baseLvl = state.stardust?.baseUpgradeLevel || 0;
                    const cost = getStardustBaseCost(baseLvl, state);
                    const canAfford = (state.stardust?.amount || Decimal.zero()).gte(cost);
                    const basePerLvl = (state.infinityTree?.dust_2 ? 0.010 : 0.005) * (state.stardust?.supernovaCatalyst ? 3 : 1);
                    const currentBase = 0.01 + basePerLvl * baseLvl;
                    const nextBase = 0.01 + basePerLvl * (baseLvl + 1);

                    return (
                      <div className="p-5 rounded-xl border bg-slate-950/80 border-purple-500/30 flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-semibold text-sm text-slate-100">Stardust Base Generator</h4>
                            <span className="text-[10px] font-mono text-purple-400 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 font-bold">
                              LEVEL {baseLvl}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            Increases base Stardust generation by +{basePerLvl.toFixed(3)}/s each level{state.stardust?.supernovaCatalyst ? ' (tripled by Supernova Catalyst)' : ''}. Cost scales by {isStarMilestoneUnlocked(state.stardust?.stars || 0, 8) ? '1.75x' : '2.0x'}.
                          </p>
                          <div className="mt-3 text-xs font-mono text-purple-300">
                            Base rate: <strong>+{currentBase.toFixed(4)}/s</strong>
                            <span className="text-slate-500 ml-2">→ Next: <strong className="text-purple-200">+{nextBase.toFixed(4)}/s</strong></span>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-400">
                            Cost: <strong className="text-purple-400">{cost.format(notation)} Stardust</strong>
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={onBuyStardustBase}
                              disabled={!canAfford}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                                canAfford
                                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                              }`}
                            >
                              Buy Base (+{basePerLvl.toFixed(3)})
                            </button>
                            <button
                              type="button"
                              onClick={onBuyMaxStardustBase}
                              disabled={!canAfford}
                              title="Buy as many Stardust Base levels as possible"
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border border-purple-500/40 ${
                                canAfford
                                  ? 'bg-purple-800/80 hover:bg-purple-700 text-white'
                                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                              }`}
                            >
                              MAX
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Upgrade 1: Stellar Radiance (2,500) */}
                  {(() => {
                    const isBought = !!state.stardust?.stellarRadiance;
                    const cost = new Decimal(2500);
                    const canAfford = (state.stardust?.amount || Decimal.zero()).gte(cost);

                    return (
                      <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                        isBought ? 'bg-purple-950/25 border-purple-500/40' : 'bg-slate-950/80 border-slate-700'
                      }`}>
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-semibold text-sm text-slate-100">Stellar Radiance</h4>
                            {isBought ? (
                              <span className="text-[10px] font-mono text-purple-400 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 font-bold">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-slate-500">ONE-TIME</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            Increases real-time Stardust production by +25% per active Stardust softcap tier (each order of magnitude above 10).
                          </p>
                          <div className="mt-3 text-xs font-mono text-purple-300">
                            {(() => {
                              const activeSoftcaps = (state.stardust?.amount && state.stardust.amount.gt(10))
                                ? Math.floor(state.stardust.amount.log10())
                                : 0;
                              const currentMult = 1 + 0.25 * activeSoftcaps;
                              return (
                                <span>
                                  Status: <strong>{isBought
                                    ? `Active (+${activeSoftcaps * 25}% / ×${currentMult.toFixed(2)} from ${activeSoftcaps} softcaps)`
                                    : `Available (+${activeSoftcaps * 25}% / ×${currentMult.toFixed(2)} at current ${activeSoftcaps} softcaps)`}
                                  </strong>
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-400">
                            Cost: <strong className="text-purple-400">{cost.format(notation)} Stardust</strong>
                          </span>
                          {isBought ? (
                            <span className="text-xs font-mono text-purple-400 font-semibold">Purchased</span>
                          ) : (
                            <button
                              type="button"
                              onClick={onBuyStellarRadiance}
                              disabled={!canAfford}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                                canAfford
                                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                              }`}
                            >
                              Buy Upgrade
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Upgrade 2: Astral Focus (10,000) */}
                  {(() => {
                    const isBought = !!state.stardust?.astralLens;
                    const cost = new Decimal(10000);
                    const canAfford = (state.stardust?.amount || Decimal.zero()).gte(cost);
                    const hasDust4 = !!state.infinityTree?.dust_4;
                    const currentDivisor = (hasDust4 ? 9 : 10) - (isBought ? 0.5 : 0);
                    const potentialDivisor = (hasDust4 ? 9 : 10) - 0.5;

                    return (
                      <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                        isBought ? 'bg-purple-950/25 border-purple-500/40' : 'bg-slate-950/80 border-slate-700'
                      }`}>
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-semibold text-sm text-slate-100">Astral Focus</h4>
                            {isBought ? (
                              <span className="text-[10px] font-mono text-purple-400 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 font-bold">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-slate-500">ONE-TIME</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            Weakens the Stardust generator softcap: reduces the per-magnitude growth divisor by 0.5× (from 10× to 9.5×, or from 9× to 8.5× with Softcap Transmutation).
                          </p>
                          <div className="mt-3 text-xs font-mono text-purple-300">
                            Status: <strong>{isBought
                              ? `Active (Divisor reduced to ${currentDivisor.toFixed(1)}×)`
                              : `Available (Will reduce divisor to ${potentialDivisor.toFixed(1)}×)`}
                            </strong>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-400">
                            Cost: <strong className="text-purple-400">{cost.format(notation)} Stardust</strong>
                          </span>
                          {isBought ? (
                            <span className="text-xs font-mono text-purple-400 font-semibold">Purchased</span>
                          ) : (
                            <button
                              type="button"
                              onClick={onBuyAstralLens}
                              disabled={!canAfford}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                                canAfford
                                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                              }`}
                            >
                              Buy Upgrade
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Upgrade 3: Constellation Harmonizer (50,000) */}
                  {(() => {
                    const isBought = !!state.stardust?.constellationHarmonizer;
                    const cost = new Decimal(50000);
                    const canAfford = (state.stardust?.amount || Decimal.zero()).gte(cost);
                    const stardustAmount = state.stardust?.amount || Decimal.zero();
                    const curMult = Decimal.one().add(stardustAmount.pow(5));

                    return (
                      <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                        isBought ? 'bg-purple-950/25 border-purple-500/40' : 'bg-slate-950/80 border-slate-700'
                      }`}>
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-semibold text-sm text-slate-100">Constellation Harmonizer</h4>
                            {isBought ? (
                              <span className="text-[10px] font-mono text-purple-400 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 font-bold">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-slate-500">ONE-TIME</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            Aligns generator output with stellar configurations: all generators gain a multiplier of ×(1 + Stardust⁵).
                          </p>
                          <div className="mt-3 text-xs font-mono text-purple-300">
                            {isBought ? (
                              <span>Current bonus: <strong>×{curMult.format(notation)}</strong> to all generators</span>
                            ) : (
                              <span>Potential bonus: <strong>×{curMult.format(notation)}</strong> to all generators</span>
                            )}
                          </div>
                        </div>
                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-400">
                            Cost: <strong className="text-purple-400">{cost.format(notation)} Stardust</strong>
                          </span>
                          {isBought ? (
                            <span className="text-xs font-mono text-purple-400 font-semibold">Purchased</span>
                          ) : (
                            <button
                              type="button"
                              onClick={onBuyConstellationHarmonizer}
                              disabled={!canAfford}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                                canAfford
                                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                              }`}
                            >
                              Buy Upgrade
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Upgrade 4: Cosmic Weaver (750,000) */}
                  {(() => {
                    const isBought = !!state.stardust?.cosmicWeaver;
                    const cost = new Decimal(750000);
                    const canAfford = (state.stardust?.amount || Decimal.zero()).gte(cost);
                    const infCount = state.infinity?.count || state.stats?.totalInfinities || 0;
                    const infLog = Math.log10(Math.max(1, infCount + 1));
                    const currentMult = 1 + infLog * 0.25;

                    return (
                      <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                        isBought ? 'bg-purple-950/25 border-purple-500/40' : 'bg-slate-950/80 border-slate-700'
                      }`}>
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-semibold text-sm text-slate-100">Cosmic Weaver</h4>
                            {isBought ? (
                              <span className="text-[10px] font-mono text-purple-400 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 font-bold">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-slate-500">ONE-TIME</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            Weaves the fabric of Infinities into Stardust: multiplies Stardust production by ×(1 + log10(Infinities + 1) × 0.25).
                          </p>
                          <div className="mt-3 text-xs font-mono text-purple-300">
                            Status: <strong>{isBought
                              ? `Active (×${currentMult.toFixed(2)} from ${infCount} Infinities)`
                              : `Available (Will grant ×${currentMult.toFixed(2)} at ${infCount} Infinities)`}
                            </strong>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-400">
                            Cost: <strong className="text-purple-400">{cost.format(notation)} Stardust</strong>
                          </span>
                          {isBought ? (
                            <span className="text-xs font-mono text-purple-400 font-semibold">Purchased</span>
                          ) : (
                            <button
                              type="button"
                              onClick={onBuyCosmicWeaver}
                              disabled={!canAfford}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                                canAfford
                                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                              }`}
                            >
                              Buy Upgrade
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Upgrade 5: Supernova Catalyst (2,500,000) */}
                  {(() => {
                    const isBought = !!state.stardust?.supernovaCatalyst;
                    const cost = new Decimal(2500000);
                    const canAfford = (state.stardust?.amount || Decimal.zero()).gte(cost);

                    return (
                      <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                        isBought ? 'bg-purple-950/25 border-purple-500/40' : 'bg-slate-950/80 border-slate-700'
                      }`}>
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-semibold text-sm text-slate-100">Supernova Catalyst</h4>
                            {isBought ? (
                              <span className="text-[10px] font-mono text-purple-400 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 font-bold">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-slate-500">ONE-TIME</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            Ignites the core of Stardust Base Generators: triples (3×) the base Stardust rate gained from every purchased Stardust Base level.
                          </p>
                          <div className="mt-3 text-xs font-mono text-purple-300">
                            Status: <strong>{isBought ? 'Active (Base Generator power is 3×)' : 'Available (Triples Base Generator rate)'}</strong>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-400">
                            Cost: <strong className="text-purple-400">{cost.format(notation)} Stardust</strong>
                          </span>
                          {isBought ? (
                            <span className="text-xs font-mono text-purple-400 font-semibold">Purchased</span>
                          ) : (
                            <button
                              type="button"
                              onClick={onBuySupernovaCatalyst}
                              disabled={!canAfford}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                                canAfford
                                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                              }`}
                            >
                              Buy Upgrade
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Upgrade 6: Astral Convergence (10,000,000) */}
                  {(() => {
                    const isBought = !!state.stardust?.astralConvergence;
                    const cost = new Decimal(10000000);
                    const canAfford = (state.stardust?.amount || Decimal.zero()).gte(cost);

                    return (
                      <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                        isBought ? 'bg-purple-950/25 border-purple-500/40' : 'bg-slate-950/80 border-slate-700'
                      }`}>
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-semibold text-sm text-slate-100">Astral Convergence</h4>
                            {isBought ? (
                              <span className="text-[10px] font-mono text-purple-400 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 font-bold">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-slate-500">ONE-TIME</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            Harmonizes celestial currents: reduces Stardust Doubler cost scaling from 4× to 3.75× per level, and doubles (2×) current Stardust production rate.
                          </p>
                          <div className="mt-3 text-xs font-mono text-purple-300">
                            Status: <strong>{isBought ? 'Active (Doubler scale 3.75×, 2× generation)' : 'Available (3.75× Doubler scale + 2× rate)'}</strong>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-400">
                            Cost: <strong className="text-purple-400">{cost.format(notation)} Stardust</strong>
                          </span>
                          {isBought ? (
                            <span className="text-xs font-mono text-purple-400 font-semibold">Purchased</span>
                          ) : (
                            <button
                              type="button"
                              onClick={onBuyAstralConvergence}
                              disabled={!canAfford}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                                canAfford
                                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                              }`}
                            >
                              Buy Upgrade
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Upgrade 7: Stars Awakening (100,000,000 / 1e8) */}
                  {(() => {
                    const isBought = !!state.stardust?.starsUnlocked;
                    const cost = new Decimal(1e8);
                    const canAfford = (state.stardust?.amount || Decimal.zero()).gte(cost);

                    return (
                      <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all md:col-span-2 ${
                        isBought
                          ? 'bg-amber-950/30 border-amber-500/50 shadow-lg shadow-amber-950/40'
                          : 'bg-slate-950/80 border-slate-700'
                      }`}>
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
                              <h4 className="font-bold text-sm text-white">Stars Awakening (Пробуждение звёзд)</h4>
                            </div>
                            {isBought ? (
                              <span className="text-[10px] font-mono text-amber-300 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 font-bold">
                                UNLOCKED
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-amber-400">GATEWAY</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                            Unlocks the <strong>Stars Realm</strong> reset layer inside Stardust! Condenses all accumulated Stardust into permanent Stars, granting linear generator exponent growth, exponential Stardust generation multipliers, and unique Star Milestones.
                          </p>
                          <div className="mt-3 text-xs font-mono text-amber-300">
                            {isBought ? (
                              <div className="flex items-center gap-3">
                                <span>Stars Realm is fully unlocked!</span>
                                <button
                                  type="button"
                                  onClick={() => setStardustView('stars')}
                                  className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-colors cursor-pointer"
                                >
                                  Open Stars Realm →
                                </button>
                              </div>
                            ) : (
                              <span>Requires 1.00e8 Stardust to ignite the first Star layer.</span>
                            )}
                          </div>
                        </div>
                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-400">
                            Cost: <strong className="text-amber-400">{cost.format(notation)} Stardust</strong>
                          </span>
                          {isBought ? (
                            <span className="text-xs font-mono text-amber-300 font-semibold">Stars Layer Active</span>
                          ) : (
                            <button
                              type="button"
                              onClick={onBuyStarsUnlock}
                              disabled={!canAfford}
                              className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                                canAfford
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md shadow-amber-500/30'
                                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                              }`}
                            >
                              Unlock Stars Layer
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>
            </>
          )}
        </div>
      ) : (
        /* Infinity Chamber Protocols */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-semibold text-base text-slate-100 flex items-center gap-2">
                <Atom className="w-5 h-5 text-amber-400" />
                <span>Infinity Upgrades Matrix</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Permanent upgrades powered by Infinity Points (IP). Unlocked via the Infinity Upgrades Matrix node in the Infinity Tree.
              </p>
            </div>
            <div className="font-mono text-xs text-amber-400 shrink-0 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              Current Balance: {state.infinity.points.format(notation)} IP
            </div>
          </div>

          {!state.infinityTree?.feat_1 ? (
            <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center space-y-3">
              <span className="text-3xl">🔒</span>
              <h4 className="font-bold text-sm text-slate-300">Infinity Upgrades Matrix Locked</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Purchase the <strong className="text-purple-400">Infinity Upgrades Matrix (feat_1)</strong> node in the New Features branch of the Infinity Tree to activate this terminal.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Infinity Upgrades Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Upgrade 1: IP Doubler (Repeatable) */}
                {(() => {
                  const level = state.infinity.ipDoublerLevel || 0;
                  const cost = new Decimal(10).mul(new Decimal(10).pow(level));
                  const canAfford = state.infinity.points.gte(cost);
                  const currentBonus = new Decimal(2).pow(level);

                  return (
                    <div className="p-5 rounded-xl border border-amber-500/40 bg-slate-950/80 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-sm text-slate-100">
                            Double IP Gain
                          </h4>
                          <span className="text-[10px] font-mono text-amber-400 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 font-bold">
                            LVL {level}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                          Doubles the amount of IP gained on each subsequent Infinity. Each purchase increases cost by 10x. Can be purchased infinitely many times!
                        </p>
                        <div className="mt-3 text-xs font-mono text-amber-300">
                          Multiplier: <span className="font-bold">x{currentBonus.exponent >= 3 ? `${currentBonus.mantissa.toFixed(2)}e${currentBonus.exponent}` : currentBonus.toNumber().toLocaleString('en-US')} IP</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                        <span className="text-xs font-mono text-slate-400">
                          Cost: <strong className="text-amber-400">{cost.format(notation)} IP</strong>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={onBuyIpDoubler}
                            disabled={!canAfford}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                              canAfford
                                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30'
                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            }`}
                          >
                            Buy Upgrade
                          </button>
                          <button
                            type="button"
                            onClick={onBuyMaxIpDoubler}
                            disabled={!canAfford}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                              canAfford
                                ? 'bg-amber-800/80 hover:bg-amber-700 text-white border border-amber-500/40'
                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            }`}
                            title="Buy as many IP Doubler levels as possible"
                          >
                            MAX
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Upgrade 2: Automation Expand */}
                {(() => {
                  const isBought = !!state.infinity.automationExpand;
                  const canAfford = state.infinity.points.gte(20);

                  return (
                    <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                      isBought
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : 'bg-slate-950/80 border-slate-700'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-sm text-slate-100">
                            Automation Expand
                          </h4>
                          {isBought ? (
                            <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 font-bold">
                              UNLOCKED
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-500">
                              ONE-TIME
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                          Unlocks 2 new advanced automation nodes in the Infinity Tree: <strong>Auto: Prestige Upgrades (1.50e1 SP)</strong> and <strong>Prestige Energy Autobuyer (3.00e1 SP)</strong>.
                        </p>
                        <div className="mt-3 text-xs font-mono text-emerald-300">
                          Status: {isBought ? 'Branch Expanded' : 'Available'}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-400">
                          Cost: <strong className={isBought ? 'text-emerald-400' : 'text-amber-400'}>20 IP</strong>
                        </span>
                        {isBought ? (
                          <span className="text-xs font-mono text-emerald-400 font-semibold">Active</span>
                        ) : (
                          <button
                            type="button"
                            onClick={onBuyAutomationExpand}
                            disabled={!canAfford}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                              canAfford
                                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30'
                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            }`}
                          >
                            Unlock
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Upgrade 3: Achievement Master */}
                {(() => {
                  const isBought = !!state.infinity.achievementMaster;
                  const canAfford = state.infinity.points.gte(15);
                  const extraCompletions = getAchievementMasterCompletions(state);

                  return (
                    <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                      isBought
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : 'bg-slate-950/80 border-slate-700'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-sm text-slate-100">
                            Achievement Master
                          </h4>
                          {isBought ? (
                            <span className="text-[10px] font-mono text-amber-400 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 font-bold">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-500">
                              ONE-TIME
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                          For every 3 Orders of Magnitude (OoMs) of Points achieved, grants +1 completed achievement. Infinite scalability without notification spam. Directly multiplies Achievement Resonance!
                        </p>
                        {isBought && (
                          <div className="mt-3 text-xs font-mono text-amber-300">
                            Current Bonus: <span className="font-bold">+{extraCompletions} achievements</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-400">
                          Cost: <strong className={isBought ? 'text-amber-400' : 'text-amber-400'}>15 IP</strong>
                        </span>
                        {isBought ? (
                          <span className="text-xs font-mono text-amber-400 font-semibold">Active</span>
                        ) : (
                          <button
                            type="button"
                            onClick={onBuyAchievementMaster}
                            disabled={!canAfford}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                              canAfford
                                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30'
                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            }`}
                          >
                            Unlock
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Upgrade 4: IP-scaled Generator Boost */}
                {(() => {
                  const isBought = !!state.infinity.ipGeneratorBoost;
                  const lifetimeIP = state.infinity.totalEarnedIP || state.infinity.points;
                  const currentMult = lifetimeIP.gt(0) ? new Decimal(3).pow(Math.max(0, lifetimeIP.log10())) : Decimal.one();
                  const canAfford = state.infinity.points.gte(1);
                  return (
                    <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 ${isBought ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-slate-950/80 border-slate-700'}`}>
                      <div>
                        <div className="flex items-center justify-between gap-2"><h4 className="font-semibold text-sm text-slate-100">IP Resonance</h4><span className="text-[10px] font-mono text-amber-400">ONE-TIME</span></div>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">All generators are boosted by 3^log10(total IP ever earned). Spent IP still counts toward this effect.</p>
                        <div className="mt-3 text-xs font-mono text-amber-300">Current generator bonus: <strong>x{currentMult.format(notation)}</strong></div>
                      </div>
                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between"><span className="text-xs font-mono text-slate-400">Cost: <strong className="text-amber-400">1 IP</strong></span>{isBought ? <span className="text-xs text-emerald-400 font-semibold">Active</span> : <button type="button" onClick={onBuyIpGeneratorBoost} disabled={!canAfford} className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold ${canAfford ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>Buy Upgrade</button>}</div>
                    </div>
                  );
                })()}

                {/* Upgrade 5: Time-based IP gain */}
                {(() => {
                  const isBought = !!state.infinity.timeIPBoost;
                  const currentMult = getTemporalInfinityMultiplier(state);
                  const has400 = isInfinityMilestoneUnlocked(state, 'milestone_400_temporal_boost');
                  const canAfford = state.infinity.points.gte(5);
                  return (
                    <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 ${isBought ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-slate-950/80 border-slate-700'}`}>
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-sm text-slate-100">Temporal Infinity</h4>
                          <span className="text-[10px] font-mono text-amber-400">ONE-TIME</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                          Infinity Point gain is multiplied by 1 + 0.002 × seconds spent in the current Infinity
                          {has400 ? ' (strengthened by 5x from Milestone 400!)' : '.'}
                        </p>
                        <div className="mt-3 text-xs font-mono text-amber-300">
                          Current time bonus: <strong>x{currentMult.toFixed(2)}</strong>
                          {has400 && <span className="ml-2 text-emerald-400 font-bold">(5x Boosted)</span>}
                        </div>
                      </div>
                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between"><span className="text-xs font-mono text-slate-400">Cost: <strong className="text-amber-400">5 IP</strong></span>{isBought ? <span className="text-xs text-emerald-400 font-semibold">Active</span> : <button type="button" onClick={onBuyTimeIPBoost} disabled={!canAfford} className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold ${canAfford ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>Buy Upgrade</button>}</div>
                    </div>
                  );
                })()}

                {/* Upgrade 6: SP-based Prestige Energy gain */}
                {(() => {
                  const isBought = !!state.infinity.energySPBoost;
                  const currentMult = Math.max(1, (state.infinity.skillPoints || 0) + 1);
                  const canAfford = state.infinity.points.gte(8);
                  return (
                    <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 ${isBought ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-slate-950/80 border-slate-700'}`}>
                      <div>
                        <div className="flex items-center justify-between gap-2"><h4 className="font-semibold text-sm text-slate-100">Skill-Powered Energy</h4><span className="text-[10px] font-mono text-amber-400">ONE-TIME</span></div>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">Prestige Energy gain is multiplied by (unspent SP + 1). Spending SP on the tree lowers this bonus.</p>
                        <div className="mt-3 text-xs font-mono text-amber-300">Current PE bonus: <strong>x{currentMult}</strong></div>
                      </div>
                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between"><span className="text-xs font-mono text-slate-400">Cost: <strong className="text-amber-400">8 IP</strong></span>{isBought ? <span className="text-xs text-emerald-400 font-semibold">Active</span> : <button type="button" onClick={onBuyEnergySPBoost} disabled={!canAfford} className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold ${canAfford ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>Buy Upgrade</button>}</div>
                    </div>
                  );
                })()}

                {/* Upgrade 7: Skill Amplification (Repeatable with pre_6) */}
                {(() => {
                  const hasPre6 = !!state.infinityTree?.pre_6;
                  const currentLevel = getSkillAmplificationLevel(state);
                  const isBought = currentLevel > 0;
                  const cost = getSkillAmplificationCost(currentLevel);
                  const canAfford = state.infinity.points.gte(cost);
                  const totalBonus = Math.pow(2, currentLevel);
                  const nextBonus = Math.pow(2, currentLevel + 1);

                  return (
                    <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                      isBought
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : 'bg-slate-950/80 border-slate-700'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-sm text-slate-100">
                            Skill Amplification {hasPre6 && currentLevel > 0 ? `(Level ${currentLevel})` : ''}
                          </h4>
                          {hasPre6 ? (
                            <span className="text-[10px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 font-bold">
                              REPEATABLE (pre_6)
                            </span>
                          ) : isBought ? (
                            <span className="text-[10px] font-mono text-amber-400 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 font-bold">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-500">
                              ONE-TIME
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                          {hasPre6
                            ? 'Doubles all Skill Points (SP) gained from each Infinity reset per level (2^level). Unlocked to scale infinitely by Infinite Amplification Mastery.'
                            : 'Doubles all Skill Points (SP) gained from each Infinity reset (×2 SP gain).'}
                        </p>
                        <div className="mt-3 text-xs font-mono text-amber-300">
                          {isBought ? (
                            <span>
                              Current SP multiplier: <strong>×{formatSkillPoints(totalBonus)} SP</strong>
                              {hasPre6 && (
                                <span className="text-slate-400 ml-2">
                                  → Next: <strong className="text-amber-200">×{formatSkillPoints(nextBonus)} SP</strong>
                                </span>
                              )}
                            </span>
                          ) : (
                            <span>Status: <strong>Available (×2 SP gain)</strong></span>
                          )}
                        </div>
                        {!hasPre6 && isBought && (
                          <div className="text-[11px] font-mono text-slate-500 mt-1">
                            Unlock "Infinite Amplification Mastery" in the Pre-Infinity Tree to purchase infinitely!
                          </div>
                        )}
                      </div>
                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-slate-400">
                          {(!hasPre6 && isBought) ? (
                            <span className="text-amber-400 font-semibold">Active</span>
                          ) : (
                            <>Cost: <strong className="text-amber-400">{cost.format(notation)} IP</strong></>
                          )}
                        </span>
                        {(!hasPre6 && isBought) ? (
                          <span className="text-xs font-mono text-amber-400 font-semibold">Maxed (1/1)</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            {hasPre6 && onBuyMaxSkillAmplification && (
                              <button
                                type="button"
                                onClick={onBuyMaxSkillAmplification}
                                disabled={!canAfford}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                                  canAfford
                                    ? 'bg-amber-700/70 hover:bg-amber-600 text-white'
                                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                }`}
                              >
                                MAX
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={onBuySpDoublerUpgrade}
                              disabled={!canAfford}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                                canAfford
                                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30'
                                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                              }`}
                            >
                              {hasPre6 && isBought ? 'Upgrade' : 'Buy Upgrade'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Break Infinity Upgrades Section (Unlocked via node feat_5) */}
              {state.infinityTree?.feat_5 && (
                <div className="mt-8 pt-8 border-t border-purple-500/30 space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950/70 text-purple-300 border border-purple-500/40">
                        BREAK INFINITY
                      </span>
                      <h3 className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 font-mono">
                        Break Infinity Upgrades
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Powerful upgrades unlocked by the Break Infinity Matrix in the Infinity Tree.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* BI Upgrade 1: Limitless Expansion */}
                    {(() => {
                      const isBought = !!state.infinity.breakInfinityUpgrades?.limitless;
                      const cost = new Decimal(1e16);
                      const canAfford = state.infinity.points.gte(cost);
                      const oomAbove = state.points.gt(new Decimal(1, 308)) ? Math.max(0, state.points.log10() - 308) : 0;
                      const currentMult = isBought && oomAbove > 0 ? new Decimal(10).pow(oomAbove * 0.03) : Decimal.one();

                      return (
                        <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                          isBought
                            ? 'bg-purple-950/25 border-purple-500/40'
                            : 'bg-slate-950/80 border-slate-700'
                        }`}>
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-semibold text-sm text-slate-100">
                                Limitless Expansion
                              </h4>
                              {isBought ? (
                                <span className="text-[10px] font-mono text-purple-400 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 font-bold">
                                  ACTIVE
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono text-slate-500">
                                  ONE-TIME
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                              Multiplies Points gained by (Points / 1e308)^0.03 when Points exceed 1e308.
                            </p>
                            <div className="mt-3 text-xs font-mono text-purple-300">
                              Current boost: <strong>×{currentMult.format(notation)}</strong>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                            <span className="text-xs font-mono text-slate-400">
                              Cost: <strong className="text-purple-400">1.00e16 IP</strong>
                            </span>
                            {isBought ? (
                              <span className="text-xs font-mono text-purple-400 font-semibold">Active</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onBuyBreakInfinityUpgrade?.('limitless')}
                                disabled={!canAfford}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                                  canAfford
                                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                }`}
                              >
                                Buy Upgrade
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* BI Upgrade 2: Singularity Resonance */}
                    {(() => {
                      const isBought = !!state.infinity.breakInfinityUpgrades?.singularityResonance;
                      const cost = new Decimal(1e18);
                      const canAfford = state.infinity.points.gte(cost);
                      const oomAbove = state.points.gt(new Decimal(1, 308)) ? Math.max(0, state.points.log10() - 308) : 0;
                      const hasBadassSingularity = !!state.infinity.breakInfinityUpgrades?.singularityOverdrive;
                      const currentMult = isBought && oomAbove > 0
                        ? new Decimal(1 + (hasBadassSingularity ? 0.02 : 0.01) * oomAbove).pow(hasBadassSingularity ? 7.77 : 1)
                        : Decimal.one();

                      return (
                        <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                          isBought
                            ? 'bg-purple-950/25 border-purple-500/40'
                            : 'bg-slate-950/80 border-slate-700'
                        }`}>
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-semibold text-sm text-slate-100">
                                Singularity Resonance
                              </h4>
                              {isBought ? (
                                <span className="text-[10px] font-mono text-purple-400 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 font-bold">
                                  ACTIVE
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono text-slate-500">
                                  ONE-TIME
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                              Increases all generator power by +1% per OoM above 1.79e308 Points. Badass Singularity upgrades this to +2% per OoM and raises the multiplier to ^7.77.
                            </p>
                            <div className="mt-3 text-xs font-mono text-purple-300">
                              Current boost: <strong>×{currentMult.format(state.settings.notation)}</strong> {oomAbove > 0 && <span className="text-slate-400 font-mono">({Math.floor(oomAbove)} OoMs above 1e308)</span>}
                            </div>
                          </div>
                          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                            <span className="text-xs font-mono text-slate-400">
                              Cost: <strong className="text-purple-400">1.00e18 IP</strong>
                            </span>
                            {isBought ? (
                              <span className="text-xs font-mono text-purple-400 font-semibold">Active</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onBuyBreakInfinityUpgrade?.('singularityResonance')}
                                disabled={!canAfford}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                                  canAfford
                                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                }`}
                              >
                                Buy Upgrade
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* BI Upgrade 3: Dimension Hypercharge */}
                    {(() => {
                      const isBought = !!state.infinity.breakInfinityUpgrades?.hypercharge;
                      const cost = new Decimal(1e20);
                      const canAfford = state.infinity.points.gte(cost);
                      const oomAbove = state.points.gt(new Decimal(1, 308)) ? Math.max(0, state.points.log10() - 308) : 0;
                      const hyperchargeInterval = 50;
                      const hyperchargeGroups = Math.floor(oomAbove / hyperchargeInterval);
                      const currentMult = isBought && hyperchargeGroups > 0 ? new Decimal(2).pow(hyperchargeGroups) : Decimal.one();

                      return (
                        <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                          isBought
                            ? 'bg-purple-950/25 border-purple-500/40'
                            : 'bg-slate-950/80 border-slate-700'
                        }`}>
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-semibold text-sm text-slate-100">
                                Dimension Hypercharge
                              </h4>
                              {isBought ? (
                                <span className="text-[10px] font-mono text-purple-400 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 font-bold">
                                  ACTIVE
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono text-slate-500">
                                  ONE-TIME
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                              Multiplies all generator power by ×2 for every {hyperchargeInterval} orders of magnitude (OoM) of Points above 1.79e308.
                            </p>
                            <div className="mt-3 text-xs font-mono text-purple-300">
                              Current boost: <strong>×{currentMult.format(notation)}</strong> {hyperchargeGroups > 0 && <span className="text-slate-400">({hyperchargeGroups} × {hyperchargeInterval} OoMs)</span>}
                            </div>
                          </div>
                          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                            <span className="text-xs font-mono text-slate-400">
                              Cost: <strong className="text-purple-400">1.00e20 IP</strong>
                            </span>
                            {isBought ? (
                              <span className="text-xs font-mono text-purple-400 font-semibold">Active</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onBuyBreakInfinityUpgrade?.('hypercharge')}
                                disabled={!canAfford}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                                  canAfford
                                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                }`}
                              >
                                Buy Upgrade
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* BI Upgrade 4: Vacuum Momentum */}
                    {(() => {
                      const isBought = !!state.infinity.breakInfinityUpgrades?.vacuumMomentum;
                      const cost = new Decimal(1e22);
                      const canAfford = state.infinity.points.gte(cost);
                      const oomAbove = state.points.gt(new Decimal(1, 308)) ? Math.max(0, state.points.log10() - 308) : 0;
                      const hasBadassSingularity = !!state.infinity.breakInfinityUpgrades?.singularityOverdrive;
                      const currentMult = isBought && oomAbove > 0
                        ? new Decimal(1 + (hasBadassSingularity ? 0.02 : 0.01) * oomAbove).pow(hasBadassSingularity ? 7.77 : 1)
                        : Decimal.one();

                      return (
                        <div className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                          isBought
                            ? 'bg-purple-950/25 border-purple-500/40'
                            : 'bg-slate-950/80 border-slate-700'
                        }`}>
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-semibold text-sm text-slate-100">
                                Vacuum Momentum
                              </h4>
                              {isBought ? (
                                <span className="text-[10px] font-mono text-purple-400 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 font-bold">
                                  ACTIVE
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono text-slate-500">
                                  ONE-TIME
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                              Increases Infinity Point (IP) gains from Big Crunch by +1% per order of magnitude (OoM) of Points above 1.79e308 (+1% per OoM).
                            </p>
                            <div className="mt-3 text-xs font-mono text-purple-300">
                              Current IP boost: <strong>×{currentMult.format(notation)}</strong> {oomAbove > 0 && <span className="text-slate-400 font-mono">({Math.floor(oomAbove)} OoMs above 1e308)</span>}
                            </div>
                          </div>
                          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                            <span className="text-xs font-mono text-slate-400">
                              Cost: <strong className="text-purple-400">1.00e22 IP</strong>
                            </span>
                            {isBought ? (
                              <span className="text-xs font-mono text-purple-400 font-semibold">Active</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onBuyBreakInfinityUpgrade?.('vacuumMomentum')}
                                disabled={!canAfford}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                                  canAfford
                                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                }`}
                              >
                                Buy Upgrade
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    {ADVANCED_BREAK_INFINITY_UPGRADES.map((upgrade) => (
                      <AdvancedBreakInfinityUpgradeCard
                        key={upgrade.id}
                        state={state}
                        definition={upgrade}
                        onBuy={(upgradeId) => onBuyBreakInfinityUpgrade?.(upgradeId)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
