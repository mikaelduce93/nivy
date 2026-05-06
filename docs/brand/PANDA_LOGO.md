# NIVY — Panda Logo Usage

> The NIVY mark: a geometric, joyful panda + the **NIVY** wordmark.
> Code: `components/brand/panda-logo.tsx`, `components/brand/mascot-states.tsx`.
> Re-export: `import { PandaLogo, PandaIcon, PandaMascot } from '@/components/brand'`.

---

## 1. Why a panda

- **Memorable.** Single recognisable silhouette (round head + ear smudges).
- **Gen-Z.** Cousin of Snapchat ghost / Discord wumpus — fun, not sanctimonious.
- **Safe.** Black + white reads at any size; no ethnic / religious connotations
  for our 13-17 Moroccan audience.
- **Mascot-able.** Easy to express different emotions (happy, celebrating,
  confused, sad, sleeping) without redrawing — the eye patches do the work.

**Not** the WWF panda — ours is **stylised, joyful, kinetic**, never melancholic.

---

## 2. Component API

### `<PandaLogo>` — the brand mark

```tsx
<PandaLogo size="md" variant="full" />
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | sm=24px, md=36px, lg=48px, xl=72px (icon side) |
| `variant` | `'full' \| 'icon' \| 'wordmark'` | `'full'` | `full` = panda + NIVY type |
| `animated` | `boolean` | `false` | Enables `motion-safe:animate-bounce` |
| `className` | `string` | — | Tailwind passthrough |
| `title` | `string` | `'NIVY'` | a11y label |

**When to use which variant:**

- `full` — navbar, hero, footer logo lockup, marketing.
- `icon` — favicon proxy, PWA splash, avatar fallback, tight nav (mobile).
- `wordmark` — when the panda is already on the page and you only need the type.

### `<PandaIcon>` — the head, no wordmark

Lower-level primitive. Useful for empty states, badges, list bullets.

```tsx
<PandaIcon size={48} expression="celebrating" />
```

| Prop | Type | Default |
|---|---|---|
| `size` | `number` (px) | required |
| `expression` | `'happy' \| 'celebrating' \| 'confused' \| 'sad' \| 'sleeping'` | `'happy'` |
| `animated` | `boolean` | `false` |
| `className` | `string` | — |

### `<PandaMascot>` — the expressive variant

Same as `PandaIcon` but with surrounding decorations (sparkles, sweat drops, Z's)
and slot-based sizes. Reach for this in **empty states, error dialogs, onboarding
screens, and confirmation flows**.

```tsx
<PandaMascot state="confused" size="lg" />
```

| `state` | What it conveys | Where |
|---|---|---|
| `happy` | Default, neutral-positive | onboarding hero, generic empty state |
| `celebrating` | XP earned, level-up, RSVP success | XP toast cards, completed challenge |
| `confused` | 404, "no results", search empty | search empty state, broken link page |
| `sad` | Hard error, expired ticket, refund flow | error pages, cancellation toasts |
| `sleeping` | Idle, no notifications, no events | inbox empty, "tout est calme" |

---

## 3. Theming

The panda is **theme-aware via `currentColor`**:

- The black ink (ears, eye patches, nose, mouth) inherits the parent's text colour.
- The white face is literal `#fdfdff` — pandas are white, the colour stays.
- The cheek blush uses brand purple `#c084fc` at 55% opacity.

Practical implication: drop the panda inside a `text-foreground` container and
it picks up dark/light theme automatically. To force a colour, wrap in
`<span className="text-purple-500">…</span>`.

---

## 4. Don'ts

- ❌ Don't recolour the white face. The contrast carries the silhouette.
- ❌ Don't rotate beyond ±10°. The panda has an "up" and it should stay there.
- ❌ Don't pair with a second mascot or emoji-mascot. One panda per surface.
- ❌ Don't shrink below 16px — facial features collapse.
- ❌ Don't add drop shadows in code; let `GlowPulse` / theme effects do it.

---

## 5. File / asset map

| File | Role |
|---|---|
| `components/brand/panda-logo.tsx` | `PandaLogo`, `PandaIcon` |
| `components/brand/mascot-states.tsx` | `PandaMascot` |
| `components/brand/index.ts` | Public re-exports |
| `docs/brand/PANDA_LOGO.md` | This file |
| `docs/brand/VOICE_AND_TONE.md` | Brand voice guide |

A future agent (A6 Visual) handles **integration** — replacing the existing
`TP` initial logo in `components/navbar.tsx`, adding panda to empty states,
swapping the favicon. This phase only ships the components.
