# Implementation Plan: High-Tier Stardust Upgrades Overhaul

Overhaul the three high-tier Stardust upgrades (**Astral PP Infusion**, **Nebular Skill Matrix**, and **Void Energy Siphon**) to provide **dynamic multipliers granting dozens of orders of magnitude**, creating balanced exponential scaling that matches late-game Star forging milestones.

---

## User Preferences & Clarifications
- **Scaling Type**: Dynamic multipliers granting dozens of orders of magnitude.
- **Intensity Level**: Balanced exponential scaling matching Star forging milestones and bridge requirements for high Infinity Tree nodes (`dust_5`, `dust_6`, `dust_7` costing $10^{21} - 10^{24}$ SP).

---

## Implemented Formula Overhauls

### 1. Astral PP Infusion (Cost: $1.00\times 10^{105}$ Stardust)
- **New Formula**: Multiplies Prestige Point (PP) gain dynamically by $10^{\log_{10}(\text{Stardust} + 1) \times 0.25}$ (or $\text{Stardust}^{0.25}$):
  - At $10^{105}$ Stardust: $\times 1.78\times 10^{26}$ PP gain (**+26.25 orders of magnitude**).
  - At $10^{140}$ Stardust: $\times 1.00\times 10^{35}$ PP gain (**+35 orders of magnitude**).
  - At $10^{200}$ Stardust: $\times 1.00\times 10^{50}$ PP gain (**+50 orders of magnitude**).
- **Implementation**:
  - Added `getAstralPPInfusionMultiplier(stardust: Decimal)` in `src/utils/gameCalculations.ts`.
  - Applied in `calculatePrestigePointsGain`.
  - Updated card in `src/components/InfinityTab.tsx` with live dynamic multiplier preview.

### 2. Nebular Skill Matrix (Cost: $1.00\times 10^{115}$ Stardust)
- **New Formula**: Multiplies Skill Point (SP) gain on Infinity dynamically by $10^{\log_{10}(\text{Stardust} + 1) \times 0.15}$ (or $\text{Stardust}^{0.15}$):
  - At $10^{115}$ Stardust: $\times 1.78\times 10^{17}$ SP gain (**+17.25 orders of magnitude**).
  - At $10^{160}$ Stardust: $\times 1.00\times 10^{24}$ SP gain (**+24 orders of magnitude**, enabling purchase of `dust_7` costing $10^{24}$ SP).
  - At $10^{200}$ Stardust: $\times 1.00\times 10^{30}$ SP gain (**+30 orders of magnitude**).
- **Implementation**:
  - Updated `getNebularSkillMatrixMultiplier(stardust: Decimal)` in `src/utils/gameCalculations.ts`.
  - Applied in `calculateSkillPointsGain`.
  - Updated card in `src/components/InfinityTab.tsx` with live dynamic multiplier preview.

### 3. Void Energy Siphon (Cost: $1.00\times 10^{130}$ Stardust)
- **New Formula**: Multiplies Prestige Energy (PE) gain on Energy resets dynamically by $10^{\log_{10}(\text{Stardust} + 1) \times 0.12}$ (or $\text{Stardust}^{0.12}$):
  - At $10^{130}$ Stardust: $\times 3.98\times 10^{15}$ PE gain (**+15.6 orders of magnitude**).
  - At $10^{200}$ Stardust: $\times 1.00\times 10^{24}$ PE gain (**+24 orders of magnitude**).
  - At $10^{300}$ Stardust: $\times 1.00\times 10^{36}$ PE gain (**+36 orders of magnitude**).
- **Implementation**:
  - Updated `getVoidEnergySiphonMultiplier(stardust: Decimal)` in `src/utils/gameCalculations.ts`.
  - Applied in `calculatePrestigeEnergyGain`.
  - Updated card in `src/components/InfinityTab.tsx` with live dynamic multiplier preview.

---

## Verification
- `tsc --noEmit`: 0 errors.
- `vite build`: Succeeded.
