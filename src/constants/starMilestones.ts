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
    desc: 'Stars multiply Stardust production by 2.5× per Star (2.5^Stars) instead of 2×.',
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
  {
    starsRequired: 13,
    name: 'Cool QoL',
    desc: 'Prestige generates 1% of its current PP reward per second while Prestige is available. Prestige Energy claims preserve Points, Generators, Tickspeed, PP, Prestige Upgrades and grant only additional PE since the previous claim.',
    icon: '🛠️',
  },
  {
    starsRequired: 15,
    name: 'Stardust Autopilot',
    desc: 'Unlocks automatic purchases of Stardust upgrades and buyables. Toggle automatic purchases ON/OFF in the Stars tab.',
    icon: '⚙️',
  },
  {
    starsRequired: 20,
    name: 'Cosmic Pulsar',
    desc: 'Doubles passive Stardust production and raises the Stardust generator power exponent by an additional +0.025 flat.',
    icon: '💫',
  },
  {
    starsRequired: 25,
    name: 'Singularity Magnetism',
    desc: 'Stardust production is multiplied by 1.25× for every active Stardust softcap.',
    icon: '🧲',
  },
  {
    starsRequired: 30,
    name: 'Astral Compression',
    desc: 'Compresses Star reset costs: base scaling reduced by 15%, significantly lowering costs for higher Stars.',
    icon: '🌀',
  },
  {
    starsRequired: 40,
    name: 'Solar Dynamo',
    desc: 'Multiplies all generator production by 10^(0.02 × Stars^1.08).',
    icon: '☀️',
  },
  {
    starsRequired: 50,
    name: 'Supergiant Fusion',
    desc: 'Star production multiplier increases from 2.5× to 3.0× per Star.',
    icon: '🔥',
  },
  {
    starsRequired: 60,
    name: 'Gravitational Lens',
    desc: 'Weakens all active Stardust softcap divisors by 1.0 (minimum divisor 3.0).',
    icon: '🔭',
  },
  {
    starsRequired: 70,
    name: 'Quantum Flare',
    desc: 'Prestige Energy accelerates Stardust generation: multiplies Stardust by (1 + log10(PE + 1))^1.5.',
    icon: '💥',
  },
  {
    starsRequired: 80,
    name: 'Tachyon Conduction',
    desc: 'Increases Tickspeed multiplier effectiveness by 20% multiplicatively.',
    icon: '⏱️',
  },
  {
    starsRequired: 90,
    name: 'Quasar Core',
    desc: 'Current Points power Stardust production: multiplies Stardust by 1 + (log10(Points + 1)/1000)^2.',
    icon: '🌌',
  },
  {
    starsRequired: 100,
    name: 'Supernova Catalyst Prime',
    desc: 'Unlocks the Supernova reset layer! Detonate all Stars and Stardust to trigger a Supernova and harness eternal Star Power.',
    icon: '💥',
  },
];

export function isStarMilestoneUnlocked(currentStars: number, requiredStars: number): boolean {
  return (currentStars || 0) >= requiredStars;
}
