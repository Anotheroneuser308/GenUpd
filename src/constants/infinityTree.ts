export interface InfinityTreeNodeDef {
  id: string;
  branch: 'root' | 'pre' | 'auto' | 'feat';
  title: string;
  desc: string;
  cost: number; // IP
  req: string; // parent node id ('none' for root)
  icon?: string;
}

export const INFINITY_TREE_NODES: Record<string, InfinityTreeNodeDef> = {
  root: {
    id: 'root',
    branch: 'root',
    title: 'Infinity Nexus',
    desc: 'All generators produce 4^Infinities more. Unlocks all 3 branches.',
    cost: 0, // Unlocked automatically when 1st Infinity is reached
    req: 'none',
    icon: '⚡',
  },

  // Branch 1: Pre-Infinity
  pre_1: {
    id: 'pre_1',
    branch: 'pre',
    title: 'Temporal Surge',
    desc: 'All generators start with a x1.00 bonus and gain +0.01x every second spent in the current Infinity.',
    cost: 1,
    req: 'root',
    icon: '⏳',
  },
  pre_2: {
    id: 'pre_2',
    branch: 'pre',
    title: 'Cosmic Retention',
    desc: 'Start every Prestige and Infinity with 1,000,000 Points and 1 of each unlocked Generator.',
    cost: 1,
    req: 'pre_1',
    icon: '🛡️',
  },
  pre_3: {
    id: 'pre_3',
    branch: 'pre',
    title: 'Prestige Amplification',
    desc: 'Prestige Points gained on Prestige reset are multiplied by 3x.',
    cost: 4,
    req: 'pre_2',
    icon: '💎',
  },
  pre_4: {
    id: 'pre_4',
    branch: 'pre',
    title: 'Tickspeed Induction',
    desc: 'Tickspeed multiplier also boosts all generators at a reduced power (tickspeed^0.5).',
    cost: 8,
    req: 'pre_3',
    icon: '⚡',
  },

  // Branch 2: Automation
  auto_1: {
    id: 'auto_1',
    branch: 'auto',
    title: 'Core Generator Autobuyers',
    desc: 'Unlocks autobuyers for Generators 1 through 4.',
    cost: 1,
    req: 'root',
    icon: '🤖',
  },
  auto_2: {
    id: 'auto_2',
    branch: 'auto',
    title: 'Apex & Tickspeed Autobuyers',
    desc: 'Unlocks autobuyers for Tickspeed and Generators 5 through 8.',
    cost: 2,
    req: 'auto_1',
    icon: '⚙️',
  },
  auto_3: {
    id: 'auto_3',
    branch: 'auto',
    title: 'Prestige Autobuyer',
    desc: 'Unlocks the Prestige Autobuyer with configurable time, PP-gain, or gain-multiplier conditions.',
    cost: 5,
    req: 'auto_2',
    icon: '🔄',
  },
  auto_4: {
    id: 'auto_4',
    branch: 'auto',
    title: 'Hyper-Speed Automation',
    desc: 'Autobuyers run 5x faster (every 0.05s) and purchase maximum available generators simultaneously.',
    cost: 12,
    req: 'auto_3',
    icon: '🚀',
  },

  // Branch 3: New Features
  feat_1: {
    id: 'feat_1',
    branch: 'feat',
    title: 'Infinity Upgrades Matrix',
    desc: 'Unlocks the Infinity Upgrades section in the Infinity tab.',
    cost: 1,
    req: 'root',
    icon: '⭐',
  },
  feat_2: {
    id: 'feat_2',
    branch: 'feat',
    title: 'Prestige Transcendence',
    desc: 'Unlocks a new upgrade tier in the Prestige tab.',
    cost: 10,
    req: 'feat_1',
    icon: '🔮',
  },
  feat_3: {
    id: 'feat_3',
    branch: 'feat',
    title: 'Infinity Milestones',
    desc: 'Unlocks Milestone progression rewards in the Infinity tab.',
    cost: 50,
    req: 'feat_2',
    icon: '🏆',
  },
  feat_4: {
    id: 'feat_4',
    branch: 'feat',
    title: 'Break Infinity',
    desc: 'Shatters the 1.79e308 boundary, allowing points and production to scale endlessly.',
    cost: 10000,
    req: 'feat_3',
    icon: '🌌',
  },
};

export const BRANCH_CONFIG = {
  pre: {
    name: 'Pre-Infinity',
    color: 'cyan',
    badge: 'border-cyan-500/40 text-cyan-300 bg-cyan-950/40',
    accent: 'from-cyan-500/20 to-blue-500/20',
  },
  auto: {
    name: 'Automation',
    color: 'emerald',
    badge: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/40',
    accent: 'from-emerald-500/20 to-teal-500/20',
  },
  feat: {
    name: 'New Features',
    color: 'purple',
    badge: 'border-purple-500/40 text-purple-300 bg-purple-950/40',
    accent: 'from-purple-500/20 to-indigo-500/20',
  },
};
