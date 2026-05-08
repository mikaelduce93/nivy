# V5 — Design System Reconciliation Audit (TICKET-048)

**Wave**: 4 — Validators
**Sub-agent**: V5
**Mode**: READ-ONLY
**Date**: 2026-05-08
**Ticket**: TICKET-048 [ui-completion] Design-system color reconciliation
**Acceptance**: one canonical palette; `gen-z-*` either renamed or removed; visual diff captured.

---

## 0. Executive Summary

NIVY currently runs **two parallel color systems** that have grown side-by-side without reconciliation:

1. **The OKLCH "Gen-Z Muted Neon" system** — defined in `app/globals.css` and mirrored in `lib/design-system/colors.ts`. Ten decorative tokens (`--gen-z-{lavender, lime, coral, peach, mint, grape, sky, rose, yellow, teal}`) plus semantic tokens (`--primary`, `--accent`, `--success`...). Built on perceptually uniform OKLCH, theme-aware (light/dark), brand-coherent.
2. **Tailwind-native palette** — `cyan-*`, `emerald-*`, `teal-*`, `purple-*`, `slate-*`, `zinc-*`, `gray-*`. Used in newer surfaces (V1.1/V1.2: AvatarCoach uses `emerald-400`, TwinCurrencyGauge uses `cyan-400/teal-500`, FriendDefis, internships, mentor-sessions, parent-defi). Not theme-aware (same value in both modes), not brand-tuned.

**Total surface penetration of Tailwind-native cyan-/emerald-** : `cyan-{300-700}` shows up in **~250 files (1183 occurrences)** and `emerald-{300-700}` in **~182 files (716 occurrences)**. Total `gen-z-*` usage: **762 occurrences across 78 files**.

This is **not** a "gen-z is dying" story — it is a "**two systems with no contract**" story. Gen-z dominates legacy/V1.0 teen surfaces (quiz, profile, social, dashboard, gamification widgets); cyan/emerald dominates V1.1+ shipped features. The ticket asks for "one canonical palette" — but a brute-force migration would touch ~330 files and break Wave-2/Wave-3 visual identity.

**Recommended path**: **MIGRATE + PROMOTE** (hybrid). Promote the four most-used decorative `gen-z-*` tokens to **semantic-named aliases** on top of OKLCH, deprecate seldom-used ones (`gen-z-teal`, `gen-z-yellow`, `gen-z-rose`, `gen-z-peach`), and **wrap Tailwind-native cyan/emerald usages** behind the OKLCH `--info` and `--success` semantic tokens that already exist. End state: **one canonical OKLCH palette with semantic + decorative roles, zero Tailwind-native color classes in production code**.

**Effort**: **L (3–5 days)** for V1.3 — one structured pass per surface family, codemod-friendly because the substitution table is small (~20 unique class patterns). Risk is **medium** because visual drift on heavy users (quiz, profile) requires per-screen QA.

---

## 1. Token Inventory

### 1.1 `gen-z-*` token definitions

Source: `app/globals.css` (lines 215–224 light, 327–336 dark) and `lib/design-system/colors.ts` (palette object).

| Token | OKLCH (light) | OKLCH (dark) | Hue family | Usage count | Files |
|---|---|---|---|---|---|
| `--gen-z-lavender` | `0.75 0.12 290` | `0.78 0.14 290` | violet | **331** | 72 |
| `--gen-z-coral` | `0.72 0.14 25` | `0.75 0.16 25` | red-orange | **172** | 55 |
| `--gen-z-mint` | `0.80 0.12 165` | `0.82 0.14 165` | green-cyan | **111** | 40 |
| `--gen-z-sky` | `0.78 0.12 230` | `0.80 0.14 230` | blue | **70** | 26 |
| `--gen-z-lime` | `0.82 0.18 130` | `0.85 0.20 130` | yellow-green | 61 | 22 |
| `--gen-z-yellow` | `0.88 0.16 95` | `0.90 0.18 95` | yellow | 30 | 14 |
| `--gen-z-peach` | `0.85 0.10 55` | `0.82 0.12 55` | orange | 31 | 18 |
| `--gen-z-grape` | `0.55 0.20 300` | `0.65 0.22 300` | violet (deeper) | 16 | 7 |
| `--gen-z-teal` | `0.72 0.14 180` | `0.75 0.16 180` | cyan | 5 | 2 |
| `--gen-z-rose` | `0.75 0.14 350` | `0.78 0.16 350` | red-pink | 27 | 9 |

> Numbers exclude `app/globals.css` self-references and `docs/` mentions.

**Concentration**: lavender + coral + mint + sky = 684 of 854 gen-z occurrences = **80% of decorative usage in 4 of 10 tokens**. Three tokens (`teal`, `yellow`, `rose`) contribute < 8% combined and are removable with low blast-radius.

### 1.2 Tailwind-native colors used in production (the "shadow palette")

| Family | Files | Approx. occurrences | Notes |
|---|---|---|---|
| `cyan-{300..700}` | 250 | 1183 | TwinCurrencyGauge, dashboards, gamification system, parent flows |
| `emerald-{300..700}` | 182 | 716 | AvatarCoach, subscription, parent overview, success states |
| `purple-{300..900}` | ~150 (est.) | ~600 (est.) | Used inside gradients alongside `gen-z-lavender` |
| `slate-/zinc-/gray-` | many | many | Surfaces, borders — many flagged as anti-patterns in COLOR_TOKENS.md |

These are **theme-invariant** (same hex in light & dark) and **outside the OKLCH brand model**. They produce subtle palette discord — e.g. `cyan-400` (`oklch ~0.78 0.13 220`) sits one hue-step off `gen-z-sky` (`oklch 0.78 0.12 230`) and competes visually instead of harmonizing.

### 1.3 Semantic + neon tokens already in place

`globals.css` already exposes:
- Semantic theme-aware: `--primary`, `--secondary`, `--accent`, `--muted`, `--success`, `--warning`, `--info`, `--destructive`, `--card`, `--border`, `--ring`, `--popover`, `--sidebar`.
- Neon pillars (gamification): `--neon-party` (300), `--neon-vitality` (130), `--neon-intellect` (230), `--neon-creativity` (30), `--neon-prestige` (75).
- Theme-invariant: `--color-on-bright` for text on luminous backgrounds.

`docs/design/COLOR_TOKENS.md` already documents the "three violets" (primary / lavender / neon-party) and the `text-on-bright` decision matrix. The discipline exists on paper — the codebase has drifted because **new features don't import it**.

---

## 2. Per-color recommendation

### 2.1 The four target tokens (TICKET-048 explicit scope)

#### `gen-z-lavender` — **KEEP, RENAME**
- 331 uses across teen dashboard, quiz, profile, social, gamification.
- Same hue (290) as `--primary` but lower chroma (0.12 vs 0.18) → it's the soft cousin of brand purple.
- **Recommendation**: rename to `--accent-soft-lavender` or simply `--brand-soft`. Keep value. It is **the** decorative companion to `--primary` and removing it would force everyone back to `--primary` (which is too saturated for chips/icons).
- Migration: `bg-gen-z-lavender` → `bg-brand-soft` (codemod, ~330 replacements).

#### `gen-z-coral` — **KEEP, RENAME**
- 172 uses, identical hue (25) to `--accent`. Lower chroma (0.14 vs 0.18).
- **Recommendation**: rename to `--accent-soft-coral` or `--accent-soft`. It is the soft companion of `--accent` (sunset coral). Already serving as warmth/energy decorative token.
- Migration: 1:1 rename.

#### `gen-z-mint` — **KEEP, RENAME**
- 111 uses, used heavily for "success" UI in gen-z dialect (✓ icons, % score positive, level stat).
- Hue 165 sits between `--success` (145, lime) and Tailwind `emerald-400` (~155). Acts as visual bridge.
- **Recommendation**: rename to `--success-soft` (semantic) — it's already functioning as the "soft positive" color across quiz, profile, dashboard. This rename **also unlocks emerald-* migration** (see § 3).

#### `gen-z-sky` — **KEEP, RENAME**
- 70 uses, hue 230, perfectly aligned with `--info` (oklch 0.62 0.16 240, hue diff 10°).
- **Recommendation**: rename to `--info-soft`. Bridges existing `--info` semantic and decorative usage. Lets the cyan-* migration land naturally (see § 3).

### 2.2 Other gen-z tokens

| Token | Count | Recommendation |
|---|---|---|
| `gen-z-lime` (61) | low-mid | **MERGE into `--success-soft` or keep as `--success-bright`**. Hue 130 vs mint 165 — different enough to keep as a "vitality bright" if the gamification pillar `--neon-vitality` (130, brighter) needs a softer companion. Otherwise drop. |
| `gen-z-grape` (16) | low | **REPLACE** with `--neon-party` (hue 300, same family) for glow effects, or `--primary` for fills. **Drop the token.** |
| `gen-z-peach` (31) | low | **REPLACE** with a soft variant of `--accent-soft-coral` (peach is just lighter coral, hue 55 is on-brand). **Drop.** |
| `gen-z-yellow` (30) | low | **REPLACE** with `--warning` (hue 75, exists). **Drop the token.** Migration: `bg-gen-z-yellow` → `bg-warning`. |
| `gen-z-rose` (27) | low | **REPLACE** with `--accent-soft-coral` (close hue, same role). **Drop.** |
| `gen-z-teal` (5) | trivial | **DROP.** Two files. Replace with `--info-soft`. |

### 2.3 Tailwind-native cyan/emerald usage (the elephant in the room)

The TICKET-048 scope literally says "components mentioning `gen-z-{lavender, mint, coral, sky}`" — but **the real fragmentation comes from Tailwind-native classes**. Resolving gen-z renaming without addressing cyan/emerald just papers over half the problem.

#### `cyan-*` family (1183 occurrences)
- **Wrap behind `--info-soft` / `--info`**. Replace `text-cyan-400` → `text-info`, `bg-cyan-500/10` → `bg-info/10`. Hue 220 (cyan) vs 240 (info) is close enough that this is a 1-stop semantic move; if the offset matters, define `--info-soft` at hue 230 (= sky).
- **Edge case**: TwinCurrencyGauge uses `cyan-300/400/500` as **the brand color for the "twin currency"** (XP+coins). This is product-meaning, not just decoration. **Recommendation**: introduce a dedicated `--currency-twin` semantic token (oklch 0.75 0.15 220) and migrate TwinCurrencyGauge to it. ~10 lines, single component.

#### `emerald-*` family (716 occurrences)
- **Wrap behind `--success-soft` / `--success`**. AvatarCoach's "leveling up" emerald → `--success` (hue 145) reads identically to Tailwind emerald (hue ~155). Direct migration possible.
- **Edge case**: subscription tier badges use `emerald-300/500` as a "Premium tier" color. This is a tier-meaning. Recommendation: tie to existing `tiers.platinum` / `tiers.diamond` from `lib/design-system/colors.ts` (already defined, just not wired into Tailwind theme).

#### `purple-*` family (~600 occurrences, used in gradients with gen-z-lavender)
- **Most are `from-gen-z-lavender to-purple-500` style gradients** — these were intentional gradients to `--primary`-darker. Migration: `to-purple-500` → arbitrary `to-[var(--primary)]` or define `--primary-dark` semantic token.

#### `slate-* / zinc-* / gray-*`
- **Already documented as anti-patterns** in `docs/design/COLOR_TOKENS.md` § 6 with allowed exceptions list. Out of scope for TICKET-048 (covered by parallel governance audit).

---

## 3. Surface clustering

### 3.1 Heavy gen-z surfaces (legacy / V1.0)

These are the original "Gen-Z Muted Neon" identity carriers:

| Surface | Top tokens | Migration risk |
|---|---|---|
| `app/teen/profile/profile-hub-client.tsx` | lavender(15), mint(5), coral(4), sky(6) | Medium — visible "About me" hero |
| `app/teen/quiz/quiz-hub-client.tsx` | lavender(12), mint(2), coral(2) | Low — internal hub |
| `app/teen/social/social-hub-client.tsx` | lavender(9), mint(5), coral(16), sky(4) | Medium — heavy coral |
| `app/teen/circles/circles-client.tsx` | lavender(5), coral(13) | Low |
| `app/teen/home-dashboard-client.tsx` | lavender(8), coral(2), sky(5), mint(4) | **High — landing page** |
| `app/teen/wallet/wallet-hub-client.tsx` | lavender(17), mint(4), sky(1) | Medium |
| `app/teen/messages/messages-client.tsx` | lavender(2), coral(1), sky(8) | Low |
| `components/gamification/level-up-modal.tsx` | lavender(11), mint(3), coral(10) | **High — celebration moment** |
| `components/teen/dashboard/*` | every file uses gen-z | **High — dashboard surface area** |

### 3.2 Heavy cyan/emerald surfaces (V1.1 / V1.2 / Wave 2)

| Surface | Top tokens | Note |
|---|---|---|
| `components/teen/twin-currency-gauge.tsx` | cyan-{300,400,500}, teal-500 | V1.2 ship — currency identity |
| `components/teen/avatar-coach.tsx` | emerald-{200..950} | V1.2 ship — coach success state |
| `app/teen/internships/page.tsx` | emerald-* | New mentor flow |
| `app/teen/mentors/*` | emerald-* | New mentor flow |
| `app/parent/chores/*` | emerald-* | Wave 2 P1+ batch A |
| `app/teen/quests/friend-defis/*` | emerald-* | Wave 3 friend-defi |
| `app/parent/topup/page.tsx` | emerald-* | Hybrid checkout |
| `gamification-system/components/**` | cyan + emerald (heavy) | Inherited subsystem |

### 3.3 Mixed surfaces (the dual-system smell)

`app/teen/quiz/quiz-hub-client.tsx`, `components/parent/dashboard/*`, `app/teen/quests/[id]/quest-detail-client.tsx`, `components/gamification/streak-counter.tsx` — these import from **both** systems in the same component. They are the smoking gun: a developer adding a new feature pulls whichever vocabulary the nearest IDE autocomplete suggests.

---

## 4. Decision matrix — KEEP, MIGRATE, or RENAME?

| Path | Effort | Visual risk | Brand integrity | DX outcome |
|---|---|---|---|---|
| **A. KEEP both (status quo)** | 0 | none | degrading | terrible — no canonical answer to "what color do I use?" |
| **B. MIGRATE gen-z → cyan/emerald** | XL (~750 file edits, ~1100 substitutions) | **HIGH** — wipes brand identity, OKLCH precision lost, dark-mode adaption regressions | **breaks brand** | bad — Tailwind-native is theme-naive |
| **C. MIGRATE cyan/emerald → gen-z (raw)** | XL (~430 file edits, ~1900 substitutions) | medium | preserves OKLCH | medium — gen-z token names are unsemantic |
| **D. MIGRATE + PROMOTE (recommended)** | L (3–5 days, codemod-able) | low-medium | **strengthens** | **excellent** — semantic names, single source |
| **E. RENAME-only (gen-z → semantic, leave cyan/emerald)** | M (1–2 days) | low | weak | partial — still two systems |

**Path D** is the only one that solves both the gen-z/Tailwind split AND produces durable semantic naming.

---

## 5. Recommended Path D — "Migrate + Promote"

### 5.1 New canonical token table (proposed for V1.3)

Theme-aware, OKLCH-based, semantic-named. Replace § 2 of `globals.css`:

```css
/* SEMANTIC ROLES (theme-aware) */
--primary, --primary-foreground       /* unchanged */
--primary-dark                         /* NEW — for gradient targets */
--accent, --accent-foreground          /* unchanged */
--success, --success-foreground        /* unchanged */
--warning, --warning-foreground        /* unchanged */
--info, --info-foreground              /* unchanged */
--destructive, --destructive-foreground

/* SOFT ACCENT VARIANTS (former gen-z, renamed) */
--brand-soft           /* = old gen-z-lavender, hue 290 */
--accent-soft          /* = old gen-z-coral,    hue 25  */
--success-soft         /* = old gen-z-mint,     hue 165 */
--info-soft            /* = old gen-z-sky,      hue 230 */
--vitality-soft        /* = old gen-z-lime,     hue 130 (only if used) */

/* PRODUCT-MEANING TOKENS */
--currency-twin        /* NEW — replaces TwinCurrencyGauge cyan-* */
--tier-bronze, --tier-silver, --tier-gold, --tier-platinum, --tier-diamond  /* exists in lib, lift into CSS */

/* GAMIFICATION PILLARS */
--neon-{party, vitality, intellect, creativity, prestige}   /* unchanged */

/* DROPPED tokens */
/* gen-z-grape   → --neon-party (glow) | --primary (fill) */
/* gen-z-peach   → --accent-soft */
/* gen-z-yellow  → --warning */
/* gen-z-rose    → --accent-soft */
/* gen-z-teal    → --info-soft */
```

### 5.2 Migration codemod table (deterministic, scriptable)

| Find (regex) | Replace |
|---|---|
| `\bgen-z-lavender\b` | `brand-soft` |
| `\bgen-z-coral\b` | `accent-soft` |
| `\bgen-z-mint\b` | `success-soft` |
| `\bgen-z-sky\b` | `info-soft` |
| `\bgen-z-lime\b` | `vitality-soft` |
| `\bgen-z-grape\b` | (manual review — usually `neon-party`) |
| `\bgen-z-peach\b` | `accent-soft` |
| `\bgen-z-yellow\b` | `warning` |
| `\bgen-z-rose\b` | `accent-soft` |
| `\bgen-z-teal\b` | `info-soft` |
| `\b(text\|bg\|border\|ring)-cyan-(300\|400\|500\|600\|700)\b` | `$1-info` (exception: TwinCurrencyGauge → `$1-currency-twin`) |
| `\b(text\|bg\|border\|ring)-emerald-(300\|400\|500\|600\|700)\b` | `$1-success` |
| `\b(text\|bg\|border\|ring)-teal-(300\|400\|500\|600\|700)\b` | `$1-info-soft` |
| `\b(text\|bg\|border\|ring)-purple-(400\|500\|600\|700)\b` | `$1-primary` (in gradients only — manual review) |

### 5.3 Effort estimate

- **Token redefinition in globals.css**: 1 hour. (Aliases, no value changes — values stay OKLCH.)
- **Update `lib/design-system/colors.ts`**: 1 hour. Rename palette keys, expose semantic.
- **Update `docs/design/COLOR_TOKENS.md`**: 1 hour. New table, new anti-patterns.
- **Codemod sweep — gen-z renames**: 0.5 day. ~330 lavender + 172 coral + 111 mint + 70 sky + others ≈ 760 substitutions across 78 files. Mechanical.
- **Codemod sweep — cyan/emerald wrap**: 1 day. ~250+182=432 files. Higher per-file diff (1–14 occurrences/file). Visual review needed.
- **Visual QA pass on heavy surfaces** (profile, dashboard, level-up-modal, social, quiz, AvatarCoach, TwinCurrencyGauge, parent flows): 1 day.
- **Storybook visual diff capture (acceptance criterion)**: 0.5 day.
- **Buffer / regressions**: 0.5 day.

**Total: 3.5–5 days**, codemod-driven, parallelizable across two engineers if needed.

### 5.4 Migration order (de-risked)

1. **Day 1 (foundation, additive)**: add new token aliases in `globals.css` next to existing ones. Both `bg-gen-z-lavender` and `bg-brand-soft` work. Zero visual impact.
2. **Day 2 (semantic adoption)**: codemod the gen-z renames. Visual diff: zero (aliases).
3. **Day 3 (cyan/emerald)**: codemod cyan/emerald → semantic. Visual review on each affected file. Highest blast-radius.
4. **Day 4 (cleanup)**: remove old `--gen-z-*` token definitions. `bg-gen-z-*` classes 404. CI guard added.
5. **Day 5 (governance)**: ESLint rule banning `cyan-*`, `emerald-*`, `teal-*`, `purple-*`, `gen-z-*` in `app/`, `components/`. Storybook visual diff committed.

### 5.5 Acceptance criteria mapping (TICKET-048)

| TICKET-048 acceptance | Path-D outcome |
|---|---|
| "one canonical palette" | ✅ OKLCH-only, semantic-named |
| "`gen-z-*` either renamed or removed" | ✅ 4 renamed (brand-soft, accent-soft, success-soft, info-soft), 6 removed |
| "visual diff captured in storybook if configured" | ✅ Day 5 deliverable |
| "Effort: L" | ✅ 3.5–5 days matches L |

---

## 6. Final Design System Manifesto for V1.3

> **One palette, OKLCH-pure, semantic-named, theme-aware.**

### Six rules

1. **No raw Tailwind color classes in feature code.** `cyan-400`, `emerald-500`, `purple-600`, `slate-900` are forbidden in `app/` and `components/` (except `components/ui/` primitives that explicitly opt out). Enforced by ESLint.
2. **All product UI uses semantic tokens first** (`--primary`, `--success`, `--accent`, `--info`, `--warning`, `--destructive`, `--muted`, `--card`, `--background`, `--border`, `--ring`).
3. **Decorative variants are `*-soft`**: `--brand-soft`, `--accent-soft`, `--success-soft`, `--info-soft`. Never invent new soft colors per feature.
4. **Gamification has its own namespace** (`--neon-*`) — pillars only, never for general UI.
5. **Product-meaning gets product tokens.** Twin currency is `--currency-twin`. VIP tiers are `--tier-{bronze, silver, gold, platinum, diamond}`. Never overload semantic tokens for product meaning.
6. **Theme-invariant text on luminous backgrounds is `text-on-bright`** — already exists, keep using it.

### Three violets stay distinct (already documented, just enforce)

- `--primary` — interactive, AA on background
- `--brand-soft` (= old gen-z-lavender) — decorative chips/icons, sits next to primary
- `--neon-party` — gamification glow only

### Sunset of gen-z naming

By V1.3 release: **the string `gen-z` should not appear in any non-doc file.** The tokens were never about generation — they were about **decorative softness**, and the new names say so.

### One-source-of-truth contract

`app/globals.css` is the source. `lib/design-system/colors.ts` mirrors. `docs/design/COLOR_TOKENS.md` documents. Drift between any two = CI failure.

---

## 7. Risks & open questions

- **Hue 220 vs 230 (cyan vs sky)**: The decision to fold `cyan-*` into `--info` (hue 240) vs `--info-soft` (hue 230) needs a designer call. Both are defensible.
- **Gradient rewrites**: ~50 `from-gen-z-lavender to-purple-500` style gradients need manual review — codemod handles 80%, eyeball the rest.
- **`gamification-system/` subsystem**: the bundled `gamification-system/components/**` ships with cyan/emerald baked in. Either migrate (~50 files) or quarantine (style-isolated). Recommend migrate to keep the rest of the app consistent.
- **Storybook**: TICKET-048 says "visual diff in storybook if configured". Unclear if Storybook is wired — Day-5 deliverable contingent. Fallback: Playwright screenshot diff on the 12 critical pages from TICKET-049.
- **Visual identity drift on level-up-modal & dashboard cards**: These are the moments users emotionally bond with the app. Even an "OKLCH-equivalent" rename can produce micro-shifts in dark mode (light-L 0.78 vs primary-L 0.72). Review by hand, not script.

---

## 8. Files referenced

- `app/globals.css` — token definitions
- `lib/design-system/colors.ts` — TS palette mirror
- `docs/design/COLOR_TOKENS.md` — existing governance doc (§3, §5, §6 already alignment-ready)
- `docs/vision/audit-content-personalization/TICKETS.md` — TICKET-048 source
- Heavy surfaces: `app/teen/{profile,quiz,social,wallet,home-dashboard-client,circles,messages}/...`, `components/teen/dashboard/**`, `components/gamification/**`, `components/teen/{avatar-coach, twin-currency-gauge}.tsx`, `components/ai/elite-ai-companion.tsx`.

---

**End V5 report — recommended path: D (Migrate + Promote). Effort: L (3.5–5 days).**
