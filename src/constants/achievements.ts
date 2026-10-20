import { Achievement } from '../types/game';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_step',
    name: 'First Step',
    desc: 'Buy Generator 1',
    unlocked: false,
  },
  {
    id: 'cascade_begins',
    name: 'Cascade Begins',
    desc: 'Buy Generator 2 (produces Generator 1)',
    unlocked: false,
  },
  {
    id: 'deep_production',
    name: 'Deep Production',
    desc: 'Buy Generator 3 (produces Generator 2)',
    unlocked: false,
  },
  {
    id: 'peak_tier',
    name: 'Apex Tier',
    desc: 'Buy Generator 4 (produces Generator 3)',
    unlocked: false,
  },
  {
    id: 'tick_master',
    name: 'Time Warp',
    desc: 'Buy your first tickspeed upgrade',
    unlocked: false,
  },
  {
    id: 'hundred_points',
    name: 'Century Club',
    desc: 'Reach 100 Points',
    unlocked: false,
  },
  {
    id: 'thousand_points',
    name: 'Kilo Point',
    desc: 'Reach 1,000 Points',
    unlocked: false,
  },
  {
    id: 'million_points',
    name: 'Millionaire',
    desc: 'Reach 1,000,000 Points (1e6)',
    unlocked: false,
  },
  {
    id: 'billion_points',
    name: 'Billionaire',
    desc: 'Reach 1,000,000,000 Points (1e9)',
    unlocked: false,
  },
  {
    id: 'trillion_points',
    name: 'Trillionaire',
    desc: 'Reach 1,000,000,000,000 Points (1e12)',
    unlocked: false,
  },
  {
    id: 'prestige_ready',
    name: 'Prestige Threshold',
    desc: 'Reach 1.00e18 Points (Prestige unlocked!)',
    unlocked: false,
  },
  {
    id: 'first_prestige',
    name: 'A New Beginning',
    desc: 'Perform your first Prestige reset',
    unlocked: false,
  },
  {
    id: 'speed_prestige',
    name: 'Speed Runner',
    desc: 'Perform a Prestige in under 10 minutes',
    unlocked: false,
  },
  {
    id: 'rapid_prestige',
    name: 'Hyperspeed',
    desc: 'Perform a Prestige in under 3 minutes',
    unlocked: false,
  },
  {
    id: 'ten_prestiges',
    name: 'Cycle of Growth',
    desc: 'Perform 10 Prestiges',
    unlocked: false,
  },
  {
    id: 'hundred_prestige_points',
    name: 'Prestige Hoarder',
    desc: 'Amass 100 Prestige Points',
    unlocked: false,
  },
  {
    id: 'all_eight_gens',
    name: 'Octave Unlocked',
    desc: 'Unlock all 8 Generators via Generator Expander',
    unlocked: false,
  },
  {
    id: 'prestige_energy',
    name: 'Energy Channeler',
    desc: 'Perform a Prestige Energy mini-reset (at 1.00e154 Points)',
    unlocked: false,
  },
  {
    id: 'reach_infinity',
    name: 'To Infinity and Beyond',
    desc: 'Reach 1.79e308 Points (Unlock the Infinity Dimension)',
    unlocked: false,
  },
];
