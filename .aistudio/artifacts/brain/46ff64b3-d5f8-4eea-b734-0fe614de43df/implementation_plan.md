# Supernova Mechanics Refinement & Celestial Balance

## User Review & Critical Decisions

> [!IMPORTANT]
> The following design decisions have been aligned based on your feedback:
> - **Reworked Supernova Upgrades 1 & 4**: Upgrade 1 will provide massive synergy between Points and Stardust scaling. Upgrade 4 will provide Bulk Star Forging and 10x Stardust production, replacing the old Points-only multiplier.
> - **Passive Supernova Bonus**: Supernova completions and Starlight balance will passively boost Infinity Points (IP), Prestige Energy (PE), and Stardust production simultaneously using a compound formula.
> - **Currency Renaming**: "Star Power" is renamed to "Starlight" (with `SL` notation) throughout the UI, formulas, tooltips, and stats to eliminate confusion with Skill Points (SP).
> - **Tab Preservation**: All previously unlocked tabs and sub-tabs (Energy, Milestones, Stardust, Stars Realm, Supernova) will permanently remain visible across Supernova resets.
> - **Star Cost Scaling**: Star cost requirement will scale by x1e10 (+10 OoMs) per Star after 30 purchased Stars.
> - **Infinity Tree Adjustment**: The last Stardust node (`dust_8`) is removed from the Infinity Tree; `dust_7` remains the pinnacle of the Stardust branch.
> - **Upgrade Renaming**: "Supernova Catalyst" is renamed to "Stellar Crucible".

---

## 1. Overview & Core Concept

This update refines the Supernova endgame layer to feel rewarding, seamless, and integrated with earlier progression layers. Resetting via Supernova will no longer strip away the interface tabs players worked hard to unlock. Instead, players retain immediate access to Stars and Stardust, carry passive multi-layer benefits (IP, PE, Stardust) powered by both Supernova count and accumulated Starlight, and enjoy focused endgame upgrades that accelerate celestial progression.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SUPERNOVA CELESTIAL LOOP                        │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │   Supernova Reset (100 Stars) ──► Earn Starlight (SL)   │
       └─────────────────────────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│       Passive Celestial Aura         │  │           Starlight Upgrades         │
│  • IP Gain Boost (Supernovas + SL)   │  │  1. Cosmic Luminescence (Pts+Dust)  │
│  • PE Gain Boost (Supernovas + SL)   │  │  2. Stardust Rebirth (5x + 25%/SN)   │
│  • Stardust Boost (Supernovas + SL)  │  │  3. Star Forging Mastery (+exp, dust)│
│  • Tabs permanently preserved        │  │  4. Bulk Star Forging (+10x dust)    │
│                                      │  │  5. Celestial Singularity (scaling)  │
└──────────────────────────────────────┘  └──────────────────────────────────────┘
```

---

## 2. User Experience & Visual Design

### Tab Preservation & Accessibility
- **Permanent Visibility**: Triggering a Supernova reset preserves the unlocked state of all tabs:
  - Header: Prestige, Infinity, Stats, Achievements remain accessible.
  - Prestige Tab: Prestige Energy sub-tab remains visible.
  - Infinity Tab: Infinity Skill Tree, Automation, Infinity Upgrades, Milestones, and Stardust remain visible.
  - Stardust Nexus: Upgrades & Buyables, Stars Realm, and Supernova sub-tabs all remain unlocked and directly switchable.
- **Clean Navigation**: Navigation tabs follow the Zero-Pill discipline and single-line layout contract with no visual clutter or broken state indicators.

### Visual Identity & Theme
- **Starlight (SL) Theme**: Golden-rose celestial theme (`from-rose-500 via-amber-400 to-yellow-300`).
- **Gauges**: In the Supernova view, display the three active passive multipliers:
  - **IP Celestial Multiplier**: `×{ipMult.format(notation)}`
  - **PE Celestial Multiplier**: `×{peMult.format(notation)}`
  - **Stardust Celestial Multiplier**: `×{stardustMult.format(notation)}`
- **Bulk Star Forging Affordance**: When Upgrade 4 is active, the Stars Realm displays a "Forge Max Stars" bulk button alongside the single Forge button, showing total affordable Stars without losing unspent Stardust.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Supernova Passive Scaling Formula
- **Chosen Approach**:
  - $\text{IP Mult} = (1 + 2 \times \text{SN}) \times (1 + \log_{10}(\text{SL} + 1) \times 0.75)$
  - $\text{PE Mult} = (1 + 4 \times \text{SN}) \times (1 + \log_{10}(\text{SL} + 1) \times 1.25)$
  - $\text{Stardust Mult} = (1 + 1.5 \times \text{SN}) \times (1 + \log_{10}(\text{SL} + 1) \times 0.5)$
- **Why**: Ensures that both completing additional Supernovas and banking unspent Starlight continuously boost core production across all prior layers without sudden runaway infinities.

### Decision 2: Star Cost Rework Beyond 30 Stars
- **Chosen Approach**:
  - Stars 0 to 14: base cost scales at $+2$ OoMs (x100) per Star.
  - Stars 15 to 30: scales at $+5.0$ OoMs (or softened by Milestone 30 and Celestial Singularity) per Star.
  - Stars 31+: each additional Star increases the requirement by $+10$ OoMs ($10^{10}$) per Star.
- **Why**: Creates a balanced curve that allows reaching 100 Stars in a manageable, rewarding cadence while maintaining late-tier achievement prestige.

### Decision 3: Supernova Upgrades 1 & 4 Rework
- **Upgrade 1 — Cosmic Luminescence** (Cost: 3 SL):
  - Increases Points production by $10^{6}$ and multiplies Stardust production rate by $\times 3$.
- **Upgrade 4 — Bulk Star Condensation** (Cost: 81 SL):
  - Multiplies Stardust production by $\times 10$ and unlocks Bulk Star Forging (allows forging all affordable Stars at once while keeping excess Stardust).

### Decision 4: Infinity Tree Cleanup
- **Remove `dust_8`**: Node `dust_8` is cleanly deleted from `InfinityTree.tsx`, `useGameLoop.ts`, and `gameCalculations.ts`. `dust_7` becomes the terminal node of the Stardust branch.

---

## 4. Technical Architecture & Component Mapping

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SYSTEM COMPONENT MAPPING                        │
└────────────────────────────────────────────────────────────────────────┘
                                    │
 ┌──────────────────────────────────┼──────────────────────────────────┐
 │                                  │                                  │
 ▼                                  ▼                                  ▼
src/utils/gameCalculations.ts     src/types/game.ts           src/hooks/useGameLoop.ts
 • getSupernovaIPMult()            • StardustState.supernova   • performSupernovaReset()
 • getSupernovaPEMult()            • SupernovaUpgradeId          - preserves unlocked tabs
 • getSupernovaStardustMult()      • InfinityTreeState           - calculates SL
 • getStarResetCost() (30+ OoM)      (removed dust_8)          • performStarReset()
 • SUPERNOVA_UPGRADES (revised)                                  (supports bulk forging)
                                                               • buySupernovaUpgrade()
                                    │
                                    ▼
                          src/components/InfinityTab.tsx
                           • Starlight UI labels & badges
                           • Passive bonus display meters
                           • "Stellar Crucible" name update
                           • Revamped upgrade cards 1 & 4
                           • Supernova & Star tabs stay unlocked
```

### Verification & Testing Plan
- `tsc --noEmit` validation via `lint_applet` to ensure 0 type or structural errors.
- `npm run build` validation via `compile_applet`.
- Verify Star cost progression at 0, 14, 30, and 31+ Stars.
- Verify Supernova reset preserves all tab navigation without re-locking.
