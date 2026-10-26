export interface StarMilestoneDef {
  starsRequired: number;
  name: string;
  desc: string;
  icon: string;
}

export const STAR_MILESTONES: StarMilestoneDef[] = [
  {
    starsRequired: 1,
    name: 'Protostellar Genesis',
    desc: 'Start every Star reset with 10 Stardust and +1 base level of Stardust Base.',
    icon: '✨',
  },
  {
    starsRequired: 2,
    name: 'Orbital Equilibrium',
    desc: 'Stellar Radiance (+25% gain per softcap) is permanently preserved across Star resets.',
    icon: '🌟',
  },
  {
    starsRequired: 3,
    name: 'Fusion Core Reaction',
    desc: 'Stars multiply Stardust production by 3× per Star (3^Stars) instead of 2×.',
    icon: '🔥',
  },
  {
    starsRequired: 4,
    name: 'Stellar Harmony',
    desc: 'Astral Focus and Constellation Harmonizer are permanently preserved across Star resets.',
    icon: '🔮',
  },
  {
    starsRequired: 5,
    name: 'Nebular Constellation',
    desc: 'Cosmic Weaver, Supernova Catalyst, and Astral Convergence are permanently preserved across Star resets.',
    icon: '🌌',
  },
  {
    starsRequired: 6,
    name: 'Pulsar Overdrive',
    desc: 'Stars generator exponent bonus increases from +0.001 to +0.0015 per Star.',
    icon: '⚡',
  },
  {
    starsRequired: 8,
    name: 'Hypergiant Condensation',
    desc: 'Stardust Base purchase cost scales by 1.75× per level instead of 2.0×.',
    icon: '🪐',
  },
  {
    starsRequired: 10,
    name: 'Cosmic Supercluster',
    desc: 'Real-time Stardust production is multiplied by an additional 10×.',
    icon: '👑',
  },
];

export function isStarMilestoneUnlocked(currentStars: number, requiredStars: number): boolean {
  return (currentStars || 0) >= requiredStars;
}
