# P2.1 DefiCard validation

Run by sub-agent **B4** (read-only validator) on 2026-05-07.

- **Component**: PASS — `components/teen/defi-card.tsx` (468 lines) ships
  `DefiCardProps` interface with all 6 contracted fields (`type`, `title`,
  `xpReward`, `coinReward`, `status`, `progress`, `iconName`, `href`,
  `imageUrl`, `ctaLabel`, `ctaHref`, `daysLeft`, `className`). All 6 variants
  (`daily` cyan, `weekly` indigo, `monthly` purple, `seasonal` amber,
  `physical` emerald, `friend` pink) carry distinct `VARIANT_TOKENS` with
  literal Tailwind classes (JIT-safe). Empty-safe defaults verified: `safeXp =
  Math.max(0, xpReward || 0)`, `safeCoins` likewise; `pct()` clamps 0–100 and
  short-circuits on `target <= 0`; `showProgress` gated on numeric typeof
  checks; missing `iconName` falls back through per-variant `defaultIcon` →
  `Target`. Server-component compatible — no `'use client'` directive (header
  comment confirms intentional). Lucide icons resolved dynamically via
  `LucideIcons[name]` lookup with double fallback.
- **/teen/quests integration**: PASS — `app/teen/quests/quests-hub-client.tsx`
  swaps `QuestCard` for `DefiCard`, with `mapQuestStatus()` and
  `pickDefiType()` helpers handling the impedance mismatch (UnifiedQuest has
  no `expired`/`locked` terminal states, no cadence field). Passes
  `imageUrl={quest.image_url}` (field exists on `UnifiedQuest`). Caveat: an
  `import` statement (Link) sits BELOW the helper functions B2 added — legal
  but stylistically off; tsc accepts it.
- **/teen/defis-physiques integration**: FAIL — `git diff HEAD --
  app/teen/defis-physiques/` is empty. `defis-physiques-client.tsx` still
  inline-renders three bespoke tile blocks (lines 196, 255, plus the stat
  card at 155) using `rounded-3xl border` raw markup. B3 did not deliver
  within the 12-min poll window.
- **Orphan tile renders detected**:
  - `app/teen/defis-physiques/defis-physiques-client.tsx:196` —
    `filteredChallenges.map(...)` daily-challenge tile (should be
    `<DefiCard type="physical" ... />`).
  - `app/teen/defis-physiques/defis-physiques-client.tsx:255` —
    `programs.map(...)` program tile (should be physical variant with
    `progress` prop).
  - No orphan `QuestCard` imports remain in `app/**` (only
    `components/teen/dashboard/quest-card.tsx` and
    `components/teen/dashboard/unified-quest-feed.tsx` self-reference; not
    rendered by either modified hub).
- **Playwright spec**: `tests/e2e/defi-card.spec.ts` — two scenarios
  (`/teen/quests`, `/teen/defis-physiques`) using the existing
  `signInAs("teen")` fixture. Locator strategy: `data-testid="defi-card"`
  first (future-proof), then exact text match on the variant label
  (`"Daily" | "Weekly" | … | "Physique"`) emitted by `VARIANT_TOKENS`. Skips
  with hint when no defis seeded (or when B3 hasn't shipped) — does not fail
  loud.
- **TS errors**: 0 — `npx tsc --noEmit` exits clean.
- **Recommended fixes for orchestrator before commit**:
  1. **BLOCKER**: B3's defis-physiques integration is missing. Either
     re-dispatch B3 or have orchestrator do the swap (3 inline tile blocks).
  2. Add `data-testid="defi-card"` to the root `<Link>`/`<div>` in
     `components/teen/defi-card.tsx` so the smoke test (and future a11y
     work) can target it without label-text coupling.
  3. Move B2's `import Link from "next/link"` line above the helper
     functions in `quests-hub-client.tsx` to keep imports grouped at the top
     (cosmetic; tsc passes).
  4. B2 sets `ctaLabel` for every quest card but the new B1 component now
     also auto-renders status badges; verify visually that "DONE / CONTINUE
     / START" CTAs aren't redundant with the new "Terminé / Actif" status
     chip.
  5. Consider seeding at least one daily quest in the canonical test fixture
     (`teen.amine@teenclub.ma`) so the smoke spec exercises the happy path
     instead of skipping in CI.
