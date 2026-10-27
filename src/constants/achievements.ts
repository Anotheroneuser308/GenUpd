import { Achievement } from '../types/game';

export interface TieredAchievement extends Achievement {
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  tierName: string;
}

export const ACHIEVEMENTS: TieredAchievement[] = [
  // Tier 1: Early Spark
  {
    id: 'gen_1_bought',
    name: 'First Spark',
    desc: 'Purchase your very first Generator 1',
    tier: 1,
    tierName: 'Early Spark',
    unlocked: false,
  },
  {
    id: 'gen_4_bought',
    name: 'Tetra Cascade',
    desc: 'Purchase Generator 4 to complete the initial generator ladder',
    tier: 1,
    tierName: 'Early Spark',
    unlocked: false,
  },
  {
    id: 'points_1e6',
    name: 'Millionaire',
    desc: 'Accumulate 1,000,000 Points (1.00e6)',
    tier: 1,
    tierName: 'Early Spark',
    unlocked: false,
  },
  {
    id: 'points_1e18',
    name: 'Prestige Horizon',
    desc: 'Reach 1.00e18 Points and prepare for the cosmic reset',
    tier: 1,
    tierName: 'Early Spark',
    unlocked: false,
  },

  // Tier 2: Prestige Ascension
  {
    id: 'prestige_1',
    name: 'Cosmic Reset',
    desc: 'Perform your first Prestige reset and unlock PP',
    tier: 2,
    tierName: 'Prestige Ascension',
    unlocked: false,
  },
  {
    id: 'prestige_points_1e6',
    name: 'Power Accumulator',
    desc: 'Amass 1,000,000 Prestige Points (1.00e6)',
    tier: 2,
    tierName: 'Prestige Ascension',
    unlocked: false,
  },
  {
    id: 'all_8_gens',
    name: 'Octal Engine',
    desc: 'Unlock and purchase Generator 8',
    tier: 2,
    tierName: 'Prestige Ascension',
    unlocked: false,
  },
  {
    id: 'prestige_energy_1',
    name: 'Energy Surge',
    desc: 'Unlock and activate Prestige Energy',
    tier: 2,
    tierName: 'Prestige Ascension',
    unlocked: false,
  },

  // Tier 3: The Edge of Infinity
  {
    id: 'infinity_reached',
    name: 'To Infinity...',
    desc: 'Trigger Big Crunch at 1.79e308 Points to enter Infinity',
    tier: 3,
    tierName: 'The Edge of Infinity',
    unlocked: false,
  },
  {
    id: 'infinities_10',
    name: 'Infinite Walker',
    desc: 'Complete 10 Infinity resets',
    tier: 3,
    tierName: 'The Edge of Infinity',
    unlocked: false,
  },
  {
    id: 'break_infinity',
    name: '...And Beyond!',
    desc: 'Break Infinity and transcend 1.79e308 Points',
    tier: 3,
    tierName: 'The Edge of Infinity',
    unlocked: false,
  },
  {
    id: 'points_1e1000',
    name: 'Transcendent Magnitude',
    desc: 'Reach 1.00e1000 Points',
    tier: 3,
    tierName: 'The Edge of Infinity',
    unlocked: false,
  },

  // Tier 4: Stellar Genesis & Stardust
  {
    id: 'tree_mastery',
    name: 'Branching Cosmos',
    desc: 'Unlock the Stardust branch in the Infinity Tree',
    tier: 4,
    tierName: 'Stellar Genesis & Stardust',
    unlocked: false,
  },
  {
    id: 'stardust_genesis',
    name: 'Stardust Weaver',
    desc: 'Generate your very first unit of Stardust',
    tier: 4,
    tierName: 'Stellar Genesis & Stardust',
    unlocked: false,
  },
  {
    id: 'stardust_1e6',
    name: 'Cosmic Powder',
    desc: 'Accumulate 1,000,000 Stardust (1.00e6)',
    tier: 4,
    tierName: 'Stellar Genesis & Stardust',
    unlocked: false,
  },
  {
    id: 'constellation_harmonizer',
    name: 'Celestial Harmony',
    desc: 'Purchase the Constellation Harmonizer upgrade',
    tier: 4,
    tierName: 'Stellar Genesis & Stardust',
    unlocked: false,
  },

  // Tier 5: Stellar Forging & Stars
  {
    id: 'stardust_1e8',
    name: 'Starseed Primed',
    desc: 'Reach 1.00e8 Stardust and prepare for Stellar Genesis',
    tier: 5,
    tierName: 'Stellar Forging & Stars',
    unlocked: false,
  },
  {
    id: 'first_star',
    name: 'Solar Genesis',
    desc: 'Perform your first Star reset and forge a Star',
    tier: 5,
    tierName: 'Stellar Forging & Stars',
    unlocked: false,
  },
  {
    id: 'stars_5',
    name: 'Constellation Core',
    desc: 'Forge 5 Stars',
    tier: 5,
    tierName: 'Stellar Forging & Stars',
    unlocked: false,
  },
  {
    id: 'stars_15',
    name: 'Astral Cluster',
    desc: 'Forge 15 Stars',
    tier: 5,
    tierName: 'Stellar Forging & Stars',
    unlocked: false,
  },
  {
    id: 'stars_30',
    name: 'Milky Way Engine',
    desc: 'Forge 30 Stars',
    tier: 5,
    tierName: 'Stellar Forging & Stars',
    unlocked: false,
  },
  {
    id: 'stars_50',
    name: 'Galactic Core',
    desc: 'Forge 50 Stars',
    tier: 5,
    tierName: 'Stellar Forging & Stars',
    unlocked: false,
  },

  // Tier 6: Supernova & Beyond
  {
    id: 'stars_100',
    name: 'Starfield Apex',
    desc: 'Forge 100 Stars and unlock Supernova',
    tier: 6,
    tierName: 'Supernova & Beyond',
    unlocked: false,
  },
  {
    id: 'supernova_ignition',
    name: 'Cosmic Detonation',
    desc: 'Trigger your first Supernova to earn Star Power',
    tier: 6,
    tierName: 'Supernova & Beyond',
    unlocked: false,
  },
];
