# Color Tokens — NIVY Design System

Source of truth: `app/globals.css`. This document explains how tokens map to use cases and lists anti-patterns to avoid.

---

## 1. Semantic tokens (theme-aware — flip in light/dark)

These tokens flip values between light and dark mode. **Always prefer them** for any UI surface that should adapt to the active theme.

| Token | Tailwind class | Usage |
|---|---|---|
| `--background` | `bg-background` | Page / app shell background |
| `--foreground` | `text-foreground` | Default body text |
| `--card` | `bg-card` | Elevated surfaces (cards, modals) |
| `--card-foreground` | `text-card-foreground` | Text on a card |
| `--popover` | `bg-popover` | Floating menus, tooltips |
| `--primary` | `bg-primary` / `text-primary` | Primary CTA, brand interactive |
| `--primary-foreground` | `text-primary-foreground` | Text on primary bg |
| `--secondary` | `bg-secondary` | Secondary surface |
| `--muted` | `bg-muted` | Subtle bg (skeletons, disabled) |
| `--muted-foreground` | `text-muted-foreground` | Caption / subdued text |
| `--accent` | `bg-accent` | Accent surface (sunset coral) |
| `--destructive` | `bg-destructive` | Errors, dangerous actions |
| `--success` | `bg-success` | Confirmations |
| `--warning` | `bg-warning` | Cautions |
| `--info` | `bg-info` | Informational state |
| `--border` | `border-border` | Default border color |
| `--input` | `border-input` | Form input borders |
| `--ring` | `ring-ring` | Focus rings |

---

## 2. Gen-Z palette (decorative — also theme-aware, but bright in both modes)

These are the "muted neon" colors used for decorative accents (badges, avatars, illustrations). They are **brighter in dark mode** but still bright in light mode — meaning they are luminous in both themes.

| Token | Tailwind class | Light L | Dark L | Notes |
|---|---|---|---|---|
| `--gen-z-lavender` | `bg-gen-z-lavender` | 0.75 | 0.78 | Brand-adjacent, decorative |
| `--gen-z-coral` | `bg-gen-z-coral` | 0.72 | 0.75 | Energetic accent |
| `--gen-z-lime` | `bg-gen-z-lime` | 0.82 | 0.85 | Bright — dark text required |
| `--gen-z-mint` | `bg-gen-z-mint` | 0.80 | 0.82 | Bright — dark text required |
| `--gen-z-peach` | `bg-gen-z-peach` | 0.85 | 0.82 | Bright — dark text required |
| `--gen-z-sky` | `bg-gen-z-sky` | 0.78 | 0.80 | Bright — dark text required |
| `--gen-z-yellow` | `bg-gen-z-yellow` | 0.88 | 0.90 | Bright — dark text required |
| `--gen-z-grape` | `bg-gen-z-grape` | 0.55 | 0.65 | Mid — white text required |
| `--gen-z-rose` | `bg-gen-z-rose` | 0.75 | 0.78 | Mid-bright |
| `--gen-z-teal` | `bg-gen-z-teal` | 0.72 | 0.75 | Mid-bright |

---

## 3. Neon pillars (gamification — Life RPG)

Used for the gamification "pillars" (party, vitality, intellect, creativity, prestige) and the `NeonButton` / `Avatar` ring variants.

| Token | Tailwind class | Hue | Notes |
|---|---|---|---|
| `--neon-party` | `bg-neon-party` | violet/magenta | Signature glow — distinct from `--primary` |
| `--neon-vitality` | `bg-neon-vitality` | bright lime | Bright — dark text required |
| `--neon-intellect` | `bg-neon-intellect` | bright cyan | Mid — white text |
| `--neon-creativity` | `bg-neon-creativity` | bright coral | Mid — white text |
| `--neon-prestige` | `bg-neon-prestige` | bright gold | Bright — dark text required |

> Neon pillars are **only defined in dark mode** today (`.dark` block in `globals.css`). In light mode they fall back to whatever was last set (browser default). If you start using `NeonButton` in light contexts, mirror the values into `:root` first.

---

## 4. The `--color-on-bright` token (theme-invariant)

When a foreground sits on a bright background that stays bright in **both light and dark mode** (lime, mint, peach, sky, yellow, vitality, prestige), the text must remain dark in both modes for readability. Standard `text-foreground` would invert to white in dark mode and become unreadable on a bright lime/yellow background.

```css
--color-on-bright: oklch(0.20 0.02 280); /* near-black, theme-invariant */
```

Tailwind class: **`text-on-bright`**. **Never override in `.dark`.**

### Decision matrix for "what color is the text?"

| Background | Light mode | Dark mode | Use class |
|---|---|---|---|
| `bg-primary`, `bg-card`, `bg-background`, ... | adapts | adapts | `text-foreground` / `text-{role}-foreground` |
| `bg-gen-z-lime`, `bg-gen-z-mint`, `bg-gen-z-peach`, `bg-gen-z-sky`, `bg-gen-z-yellow`, `bg-neon-vitality`, `bg-neon-prestige` | bright | bright | **`text-on-bright`** |
| `bg-gen-z-lavender`, `bg-gen-z-coral`, `bg-gen-z-grape`, `bg-gen-z-rose`, `bg-neon-party`, `bg-neon-intellect`, `bg-neon-creativity`, `bg-destructive` | mid/saturated | mid/saturated | **`text-white`** |

---

## 5. Purple unification — three violets, one purpose each

NIVY ships **three** distinct purple/violet tokens. They are kept distinct on purpose:

| Token | OKLCH (light / dark) | Role |
|---|---|---|
| `--primary` | `0.60 0.18 290` / `0.72 0.18 290` | Brand interactive: buttons, links, focus ring |
| `--gen-z-lavender` | `0.75 0.12 290` / `0.78 0.14 290` | Decorative accent: avatar rings, soft tags |
| `--neon-party` | (only dark) `0.72 0.28 300` | Gamification "party" pillar — signature neon glow |

**Why not alias them?**

- `--primary` is more saturated & slightly darker than `--gen-z-lavender` (chroma 0.18 vs 0.12). It's tuned for AA contrast on `--background`.
- `--gen-z-lavender` is softer, designed to sit *next to* `--primary` without competing for attention.
- `--neon-party` has a different hue (300 vs 290) and a much higher chroma (0.28). It's a glow color, not a fill color — using it for body interactive would be visually fatiguing.

**Rule of thumb:**
- Need a button / link / focus ring? → `--primary`
- Need a decorative chip / avatar background? → `--gen-z-lavender`
- Need a glow effect / gamification "party" pillar? → `--neon-party`

---

## 6. Anti-patterns (do NOT do)

```tsx
// ❌ Hardcoded gray — breaks in dark mode (1:1 contrast)
<div className="text-gray-900 bg-card">...</div>

// ✅ Use semantic token
<div className="text-foreground bg-card">...</div>
```

```tsx
// ❌ Hardcoded zinc — breaks theme adaptation
<div className="bg-zinc-900/50 border border-white/5">...</div>

// ✅ Use semantic surface
<div className="bg-card/50 border border-border/50">...</div>
```

```tsx
// ❌ Mixing zinc-900 and gray-900 ad hoc
<button className="bg-gen-z-lime text-zinc-900">...</button>
<button className="bg-gen-z-mint text-gray-900">...</button>

// ✅ Use the dedicated token
<button className="bg-gen-z-lime text-on-bright">...</button>
<button className="bg-gen-z-mint text-on-bright">...</button>
```

```tsx
// ❌ Hardcoded full-bleed black background
<div className="bg-[#020203]">...</div>

// ✅ Theme-aware
<div className="bg-background">...</div>
```

---

## 7. Audit & enforcement

Run this grep to spot regressions:

```bash
rg "text-gray-90[0-9]|text-zinc-90[0-9]|bg-zinc-90[0-9]|bg-gray-90[0-9]" components/ app/
```

Allowed exceptions (justified):
- `components/ui/query-error-fallback.tsx` line 127 — error code preview block (intentionally fixed dark theme for code snippets) — out of A1 scope.
- `components/ui/swipeable-card.tsx` lines 347 / 627 — full-screen overlay sheet (intentionally dark for stack-on-content effect) — out of A1 scope.

Any **new** instance in `components/ui/` should use `text-on-bright` (bright bg) or `text-foreground` / `bg-card` / `bg-muted` (theme-aware surface) instead.
