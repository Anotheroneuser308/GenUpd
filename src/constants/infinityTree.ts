export interface InfinityTreeNodeDef {
  id: string;
  branch: 'root' | 'pre' | 'auto' | 'feat' | 'post';
  title: string;
  desc: string;
  cost: number; // Skill Points (SP)
  req: string; // parent node id ('none' for root)
  reqUpgrade?: string; // requires an Infinity Upgrade to be unlocked, e.g. 'automationExpand'
  reqMilestone?: string; // requires a milestone to be unlocked
  icon?: string;
}

export const INFINITY_TREE_NODES: Record<string, InfinityTreeNodeDef> = {
  root: {
    id: 'root',
    branch: 'root',
    title: 'Infinity Nexus',
    desc: 'All generators gain a 2^Infinities multiplier up to 100 Infinities. Beyond that, the full 2^100 bonus is retained and each extra Infinity adds a strongly softcapped x1.05 multiplier. Unlocks all branches.',
    cost: 1, // Purchasable for 1 SP
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
    cost: 2,
    req: 'pre_2',
    icon: '💎',
  },
  pre_4: {
    id: 'pre_4',
    branch: 'pre',
    title: 'Tickspeed Induction',
    desc: 'Tickspeed multiplier also boosts all generators at a reduced power (tickspeed^0.5).',
    cost: 3,
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
    cost: 3,
    req: 'auto_2',
    icon: '🔄',
  },
  auto_4: {
    id: 'auto_4',
    branch: 'auto',
    title: 'Hyper-Speed Automation',
    desc: 'Autobuyers run 5x faster (every 0.05s) and purchase maximum available generators simultaneously.',
    cost: 5,
    req: 'auto_3',
    icon: '🚀',
  },
  auto_5: {
    id: 'auto_5',
    branch: 'auto',
    title: 'Auto: Prestige Upgrades',
    desc: 'Automatically purchases available unbought Prestige upgrades when there is enough PP in background loop. Configurable on/off, buy all, and priority.',
    cost: 15,
    req: 'auto_4',
    reqUpgrade: 'automationExpand',
    icon: '✨',
  },
  auto_6: {
    id: 'auto_6',
    branch: 'auto',
    title: 'Prestige Energy Autobuyer',
    desc: 'Automates Prestige Energy reset with Timer, Target gain, or Gain multiplier modes, tracking previous reset gain.',
    cost: 30,
    req: 'auto_5',
    reqUpgrade: 'automationExpand',
    icon: '⚡',
  },
  auto_8: {
    id: 'auto_8',
    branch: 'auto',
    title: 'Auto: PE Upgrades',
    desc: 'Automatically purchases available Prestige Energy (PE) amplifier upgrades when affordable, without resetting progress.',
    cost: 50,
    req: 'auto_6',
    reqMilestone: 'milestone_100_infinities_auto_pe',
    icon: '⚡',
  },
  auto_9: {
    id: 'auto_9',
    branch: 'auto',
    title: 'Free Automation Matrix',
    desc: 'When anything is bought automatically by autobuyers (generators, tickspeed, prestige upgrades, PE upgrades), it consumes 0 currency!',
    cost: 70,
    req: 'auto_8',
    icon: '💎',
  },
  auto_7: {
    id: 'auto_7',
    branch: 'auto',
    title: 'Infinity Autobuyer',
    desc: 'Unlocks the Infinity Autobuyer with configurable Time, Target IP, or Gain multiplier modes (like Prestige Autobuyer).',
    cost: 1200,
    req: 'auto_6',
    reqMilestone: 'milestone_1500_auto_infinity',
    icon: '♾️',
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
    desc: 'Unlocks Prestige Skill Synergy in the Prestige tab.',
    cost: 3,
    req: 'feat_1',
    icon: '🔮',
  },
  feat_3: {
    id: 'feat_3',
    branch: 'feat',
    title: 'Infinity Milestones',
    desc: 'Unlocks Infinity Milestones and their listed rewards. Most milestones require a specific number of Infinities; some also require lifetime IP or total playtime.',
    cost: 25,
    req: 'feat_2',
    icon: '🏆',
  },
  feat_4: {
    id: 'feat_4',
    branch: 'feat',
    title: 'Break Infinity',
    desc: 'Shatters the 1.79e308 boundary, allowing points and production to scale endlessly. Base Infinity Point gain is 10^(log10(Points) / 308).',
    cost: 1000,
    req: 'feat_3',
    icon: '🌌',
  },

  // Branch 4: Post-Infinity
  post_1: {
    id: 'post_1',
    branch: 'post',
    title: 'Cosmic SP Conduit',
    desc: 'Умножает получаемые SP от пойнтов по формуле: log10(Пойнты) / 500.',
    cost: 2500,
    req: 'feat_4',
    reqMilestone: 'milestone_2250_post_infinity',
    icon: '✨',
  },
  post_2: {
    id: 'post_2',
    branch: 'post',
    title: 'Infinity Flux',
    desc: 'Умножает получаемые бесконечности от пойнтов по формуле: log10(Пойнты) / 60.',
    cost: 3340,
    req: 'post_1',
    icon: '⌛',
  },
  post_3: {
    id: 'post_3',
    branch: 'post',
    title: 'Dimensional IP Surge',
    desc: 'Умножает все генераторы в зависимости от IP по формуле: (IP + 1)^1.3.',
    cost: 4500,
    req: 'post_2',
    icon: '💎',
  },
  post_4: {
    id: 'post_4',
    branch: 'post',
    title: 'Power Transcendence',
    desc: 'Возводит множители всех генераторов в степень ^1.02.',
    cost: 6000,
    req: 'post_3',
    icon: '🌟',
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
  post: {
    name: 'Post-Infinity',
    color: 'rose',
    badge: 'border-rose-500/40 text-rose-300 bg-rose-950/40',
    accent: 'from-rose-500/20 to-pink-500/20',
  },
};
