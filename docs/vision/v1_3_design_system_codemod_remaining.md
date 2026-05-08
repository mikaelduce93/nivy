# V1.3 Design System Codemod — Remaining Work

**Status**: Day 1 + Day 2 done by sub-agent Polish-B (2026-05-08).
**Source plan**: `docs/vision/audit-content-personalization/wave4-reports/V5_design_system.md` (Path D — Migrate + Promote).
**Ticket**: TICKET-048 [ui-completion] Design-system color reconciliation.

---

## What was done (Day 1 + Day 2)

### Day 1 — additive aliases (zero visual diff)

`app/globals.css` now defines four semantic-named aliases that share the
exact OKLCH values of the four most-used `gen-z-*` decorative tokens. Both
the legacy and the new names resolve to the same OKLCH for both light and
dark themes.

| New semantic alias | Replaces gen-z token | OKLCH (light)         | OKLCH (dark)          |
|--------------------|----------------------|-----------------------|-----------------------|
| `--brand-soft`     | `--gen-z-lavender`   | `0.75 0.12 290`       | `0.78 0.14 290`       |
| `--accent-soft`    | `--gen-z-coral`      | `0.72 0.14 25`        | `0.75 0.16 25`        |
| `--success-soft`   | `--gen-z-mint`       | `0.80 0.12 165`       | `0.82 0.14 165`       |
| `--info-soft`      | `--gen-z-sky`        | `0.78 0.12 230`       | `0.80 0.14 230`       |

Wired into the `@theme inline` block as `--color-brand-soft`,
`--color-accent-soft`, `--color-success-soft`, `--color-info-soft` so
Tailwind exposes `bg-brand-soft`, `text-accent-soft`, etc.

`lib/design-system/colors.ts` now exports `semanticSoft` (TS mirror) and the
matching CSS-variable strings in `cssVariables`. Type `SemanticSoftColors`
is exported.

### Day 2 — codemod (semantic adoption, zero visual diff)

Substring `replace_all` across **73 feature files**:

| Mapping                                  | Substitutions |
|------------------------------------------|---------------|
| `gen-z-lavender` → `brand-soft`          | ~313          |
| `gen-z-coral`    → `accent-soft`         | ~160          |
| `gen-z-mint`     → `success-soft`        | ~99           |
| `gen-z-sky`      → `info-soft`           | ~65           |
| **Total**                                | **~637**      |

The four legacy tokens (`--gen-z-lavender`, `--gen-z-coral`, `--gen-z-mint`,
`--gen-z-sky`) are still defined in `app/globals.css` and `lib/design-system/colors.ts`
for backward compatibility (Day 4 work removes them). The other six gen-z
tokens (`lime`, `peach`, `grape`, `yellow`, `rose`, `teal`) were intentionally
**not** touched in this pass — they remain in production code awaiting Day 3.

Compound utility classes that *contain* the substring `gen-z-` but are not
in the four-token scope (e.g. `.bg-gen-z-gradient`, `.bg-gen-z-mesh`,
`.bg-gen-z-hero`, `.glow-gen-z-lavender`, `.text-gen-z-gradient`) were left
as-is — they are defined inside `app/globals.css` only and were never matched
by the codemod (no feature file consumes them by the substring path).

`tsc --noEmit` passes cleanly post-codemod.

---

## What remains (Day 3 → Day 5)

### Day 3 — cyan / emerald wrap (highest blast-radius)

**Scope**: Tailwind-native palette classes inside `app/` and `components/`
need to be mapped to the OKLCH semantic system. From the V5 audit:

- `cyan-{300..700}`: ~1183 occurrences across ~250 files.
- `emerald-{300..700}`: ~716 occurrences across ~182 files.
- `teal-{300..700}`: smaller, often co-located with cyan.
- `purple-{400..700}`: ~600 occurrences, mostly inside gradients
  (`from-brand-soft to-purple-500` style).

**Codemod table** (deterministic; from V5 § 5.2):

| Find                                                       | Replace                              |
|------------------------------------------------------------|--------------------------------------|
| `\b(text\|bg\|border\|ring)-cyan-(300\|400\|500\|600\|700)\b`  | `$1-info` (or `$1-info-soft`)        |
| `\b(text\|bg\|border\|ring)-emerald-(300\|400\|500\|600\|700)\b` | `$1-success`                       |
| `\b(text\|bg\|border\|ring)-teal-(300\|400\|500\|600\|700)\b`   | `$1-info-soft`                      |
| `\b(text\|bg\|border\|ring)-purple-(400\|500\|600\|700)\b`      | `$1-primary` (gradients — manual)   |

**Edge cases requiring manual review** (NOT to be codemodded automatically):

1. **`components/teen/twin-currency-gauge.tsx`** — uses `cyan-{300,400,500}`
   and `teal-500` as the *brand color of the twin currency feature*. This
   is product-meaning, not decoration. Define `--currency-twin: oklch(0.75
   0.15 220)` in `globals.css`, expose as `bg-currency-twin` in
   `@theme inline`, then migrate the component (~10 lines).

2. **`components/teen/avatar-coach.tsx`** — uses the full `emerald-{200..950}`
   ramp for "leveling up" coach state. Direct migration to `--success` is
   visually safe (hue 145 vs Tailwind ~155).

3. **Subscription / VIP tier badges** — `emerald-{300,500}` shows up as
   "Premium tier" color. Tie to existing `tiers.platinum` / `tiers.diamond`
   from `lib/design-system/colors.ts` (already defined, just lift into
   CSS as `--tier-platinum`, `--tier-diamond`).

4. **`gradient` `from-X to-Y` pairs** — ~50 manual reviews to confirm the
   target hue. Codemod handles ~80%, eyeball the rest.

5. **`gamification-system/components/**`** — bundled subsystem ships with
   cyan/emerald baked in. Either migrate (~50 files) or quarantine
   (style-isolated). V5 recommends migrate.

**Effort**: 1 day codemod + 1 day visual QA on heavy surfaces (per V5).

### Day 3.5 — drop the six low-usage gen-z tokens

Per V5 § 2.2:

| Token            | Recommended replacement                         | Files affected |
|------------------|-------------------------------------------------|----------------|
| `gen-z-lime`     | `--success-soft` (or new `--vitality-soft`)     | ~22            |
| `gen-z-grape`    | `--neon-party` (glow) or `--primary` (fill)     | ~7             |
| `gen-z-peach`    | `--accent-soft`                                 | ~18            |
| `gen-z-yellow`   | `--warning`                                     | ~14            |
| `gen-z-rose`     | `--accent-soft`                                 | ~9             |
| `gen-z-teal`     | `--info-soft`                                   | ~2             |

Codemod is straightforward (same pattern as Day 2). Total: ~170
substitutions across ~70 files.

### Day 4 — token removal + hard cutover

Once cyan/emerald + lime/peach/grape/yellow/rose/teal codemods land:

1. **Delete** `--gen-z-{lavender,coral,mint,sky,lime,peach,grape,yellow,rose,teal}`
   from `app/globals.css` (lines ~215–224 light, ~327–336 dark).
2. **Delete** `--color-gen-z-*` mappings from the `@theme inline` block.
3. **Delete** `--gen-z-*` properties from `lib/design-system/colors.ts`
   `cssVariables` template.
4. **Drop** `palette.lavender / coral / mint / yellow / grape / lime` from
   the same file if they have no remaining importers.
5. **Re-evaluate** the legacy utility classes inside `app/globals.css`:
   `.bg-gen-z-gradient`, `.bg-gen-z-mesh`, `.bg-gen-z-hero`,
   `.glow-gen-z-{lavender,coral,lime,grape,mint}`, `.text-gen-z-gradient`,
   `.text-gen-z-holographic`. If still used, rename to `.bg-soft-gradient`,
   `.bg-soft-mesh`, etc., updating their internal `var(--gen-z-*)`
   references to the new semantic vars.
6. After this, `git grep gen-z` should return only documentation files.

### Day 5 — governance + visual diff

1. **ESLint rule** banning `cyan-*`, `emerald-*`, `teal-*`, `purple-*`,
   `gen-z-*` className strings inside `app/` and `components/` (except
   `components/ui/` primitives that explicitly opt out via comment).
2. **Storybook visual diff** (or Playwright screenshot diff) capturing the
   12 critical surfaces from TICKET-049 before/after the migration.
3. **Update** `docs/design/COLOR_TOKENS.md` with the new canonical table
   (semantic + soft + product-meaning + neon).

---

## Risks / open questions for Day 3+

- **Hue 220 vs 230 (cyan vs sky)** — designer call. `cyan-*` → `--info`
  (hue 240) vs `--info-soft` (hue 230). Both defensible.
- **Gradient rewrites** — ~50 `from-brand-soft to-purple-500` style
  gradients need eyeball review.
- **`gamification-system/` subsystem** — bundled cyan/emerald usage.
  Migrate vs quarantine decision.
- **Visual identity drift on level-up-modal & dashboard cards** — review
  by hand, not script. OKLCH-equivalent renames can produce micro-shifts
  in dark mode.

---

## Files referenced (Day 1 + Day 2 deliverables)

- `app/globals.css` — added `--brand-soft`, `--accent-soft`,
  `--success-soft`, `--info-soft` (light + dark) and their `--color-*`
  Tailwind mappings.
- `lib/design-system/colors.ts` — added `semanticSoft` export and
  `SemanticSoftColors` type; extended `cssVariables` template.
- 73 feature files — see `git diff --stat` post-Day-2 commit.

End — Polish-B (2026-05-08).
