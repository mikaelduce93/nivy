# Pillars rename — Phase 2 visual polish

Phase 2 brand audit flagged the four pillar labels as too generic / academic
for a Gen-Z audience. This document records the rename, scope, and the
intentionally **unchanged** parts (CSS tokens, IDs, DB columns).

## What changed

| Pillar (token id) | Old UI label | New UI label | Emoji |
| --- | --- | --- | --- |
| `vitality` | VITALITY | Glow Up | 💚 |
| `intellect` | INTELLECT | Big Brain | 🧠 |
| `creativity` | CREATIVITY | Self-Express | 🎨 |
| `party` | PARTY / SOCIAL | Main Character | 🎉 |

The change is **label-only**. Pillar identity (`vitality`, `intellect`,
`creativity`, `party`, plus `prestige` for the meta-pillar) stays the same
across:

- CSS custom properties: `--neon-party`, `--neon-vitality`,
  `--neon-intellect`, `--neon-creativity`, `--neon-prestige` (defined in
  `app/globals.css` for both light and dark themes).
- Tailwind theme mapping: `--color-neon-*`.
- Component prop unions (e.g. `GlassCard` `neon` prop, `NeonButton` `variant`).
- Database schema, API payloads, gamification engine.
- Icon registry (Lucide `Heart`, `Sparkles`, `Palette`, `PartyPopper`).

Renaming the underlying tokens would break too much code with no user-facing
benefit — the labels are the only thing teens read.

## Files touched in this PR

- `app/page.tsx` — pillars section (lines ~174–227): rebuilt cards with new
  labels + emoji.
- `components/gamification/avatar-dashboard.tsx` — preview gauge labels in
  the home-page dashboard preview.

## Out of scope (handled by other agents / future PRs)

- Microcopy in `messages/{fr,darija,en}.json` — Agent A2 owns i18n strings.
  When that lands, replace the inline strings on the home page with `t()`
  keys named `pillars.glowUp.label`, `pillars.bigBrain.label`, etc.
- Internal admin labels, leaderboard category dropdowns, and crew filters
  still show old labels — sweep those in a follow-up once the i18n keys
  exist (avoids drift between hard-coded FR strings).
- Landing pages of individual pillars (`/clubs?category=*`) — copywriting
  pass needed.

## Voice notes

- Keep the pillar name short (one or two syllables max). "Main Character"
  is two words but acts as a single phrase teens already use online.
- Always pair the label with the emoji on first display; subsequent
  references (e.g. progress bars) can drop the emoji to reduce noise.
- Do **not** translate the names mechanically into Darija / Arabic — they
  are loan-phrases. Confirm with native speakers in Phase 3.
