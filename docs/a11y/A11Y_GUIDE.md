# Accessibility Guide (WCAG 2.1 AA)

This guide is the canonical reference for accessibility patterns in NIVY. The
target compliance level is **WCAG 2.1 AA**. The build does not yet *fail* on
moderate violations — only `serious` and `critical` ones — but every PR should
treat moderate findings as a defect.

## Tooling

- `@axe-core/playwright` — automated WCAG scans (`npm run test:a11y`).
- `eslint-plugin-jsx-a11y` — static checks at lint time (`npm run lint`).
- Manual audits: VoiceOver (macOS / iOS), TalkBack (Android), NVDA (Windows),
  Lighthouse a11y category, axe DevTools browser extension.

## Touch targets

All interactive elements (buttons, links, inputs, toggles, dock items, cards
acting as buttons) must respect a minimum hit area of **44×44 px** (WCAG 2.5.5).

The codebase exposes the `min-h-touch` / `min-w-touch` tailwind utilities
(see `docs/design/TOUCH_TARGETS.md`). The `Button` and `NeonButton` components
already honor this contract. When you build a custom interactive element,
either:

- compose it on top of `Button` / `NeonButton`, OR
- add `min-h-touch min-w-touch` (or matching explicit dims) yourself.

## Color contrast

- Body text: contrast ratio ≥ **4.5:1** vs background.
- Large text (≥ 18.66 px bold or ≥ 24 px regular): ≥ **3:1**.
- Non-text UI (focus rings, borders that convey state): ≥ **3:1**.

The design tokens in `docs/design/COLOR_TOKENS.md` are pre-validated against
the dark surface palette. When introducing a new accent color, run it through
[WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
before committing.

The brand "neon-on-dark" pattern uses `text-on-bright` for text rendered on
strong gradient surfaces (e.g. neon CTAs). Do not strip that class — it
upgrades the foreground to a guaranteed-contrast token.

## Aria patterns

### Buttons

- Every icon-only button MUST have an `aria-label`. Add `aria-hidden="true"`
  on the inner icon to prevent double-announcement.
- Buttons that toggle (mute, expand, follow…) should expose `aria-pressed`
  for binary states or `aria-expanded` for disclosures.
- Buttons that perform async work should set `aria-busy={loading}` while the
  request is in flight.

```tsx
<Button
  variant="ghost"
  size="icon"
  aria-label={count > 0 ? `Notifications (${count} non lues)` : "Notifications"}
>
  <Bell aria-hidden="true" />
</Button>
```

### Forms

Use `components/ui/accessibility/form-field.tsx`. It wires `<label htmlFor>`,
`aria-describedby`, `aria-invalid`, `aria-required`, and the inline error
region (`role="alert"` + `aria-live="polite"`) automatically. Never reach for
a bare `<input>` in a flow that has labels and errors.

### Dialogs / sheets / drawers

- All Radix-based primitives (`@radix-ui/react-dialog`, `react-popover`,
  `react-dropdown-menu`, `react-alert-dialog`, `vaul`) ship the right
  `role`, `aria-modal`, focus trap, ESC handler, and return-focus behavior
  out of the box. Use them rather than rolling custom modals.
- For one-off modals where Radix is not a fit, wrap content in `<FocusTrap>`
  from `components/ui/accessibility/focus-trap.tsx` and bind ESC + click-out
  yourself.

### Live regions

Use `<LiveRegion>` / `<Announcer>` from `components/ui/accessibility/visually-hidden.tsx`
to surface async updates (toast contents, mission completed, score change…)
to screen readers. Default priority is `polite`; reserve `assertive` for
errors and time-critical alerts.

### Navigation

The mobile dock (`components/layouts/mobile-dock.tsx`) uses `aria-current="page"`
on the active tab. Sidebars (admin, app) follow the same convention. Custom
nav components must wire `aria-current` themselves.

## Skip links & landmarks

`components/ui/accessibility/skip-links.tsx` exposes the visually-hidden skip
links shown to keyboard users. Each top-level layout MUST render:

1. `<SkipLinks />` near the top of `<body>`.
2. `<MainContent>` (renders `<main id="main-content" tabindex="-1">`).
3. `<MainNavigation>` for the primary navigation region.

Any other landmark (`<nav>`, `<aside>`, `<footer>`) should have an
`aria-label` if more than one of the same type exists on the page.

## Screen-reader-only text

For glyphs / icons that carry meaning but no text label (badges, counters,
status dots), pair them with `<VisuallyHidden>` to announce the same
information to AT users. Do NOT rely on `title` attributes — they are not
reliably announced.

## Reduced motion

Respect `prefers-reduced-motion`. Framer Motion is configured globally to
honor it (`MotionConfig reducedMotion="user"`), so animations defined via
`motion.*` components fall back to instant transitions automatically.

For raw CSS animations, gate them behind:

```css
@media (prefers-reduced-motion: no-preference) {
  .auto-animate { animation: pulse 2s infinite; }
}
```

## Keyboard navigation

- Tab order must follow visual order. If `tabIndex` is positive, you've
  almost certainly introduced a bug — refactor instead.
- Every interactive element must show a visible focus ring. The shared
  `focus-visible:ring-2 focus-visible:ring-offset-2` recipe is on the base
  Button/NeonButton.
- Modals close on `Escape`. Toasts/popovers close on `Escape` *and* outside
  click. Carousels respond to ←/→ arrows. Lists with arrow-key navigation
  must implement roving tabindex (Radix already handles this where used).

## Images

- Decorative images: `alt=""` (empty string), `aria-hidden` if rendered as
  CSS background.
- Informative images: `alt` describes the content, not the file. Avoid
  starting with "Image of…".
- All `<img>` in `app/` and `components/` have been migrated to `next/image`.
  Email templates under `emails/` keep `<img>` because Next.js image
  optimization is unavailable in MIME bodies.

## Known gaps & follow-ups

The smoke axe-core suite (`npm run test:a11y`) is the source of truth.
Findings flagged by triage but not yet fixed live in
`docs/audits/AUDIT_E2E_DOUBLONS_HARDCODE_SCAFFOLD.md`. New findings should
be added to that audit and referenced from the failing test attachment.

Notable items still open at the time of writing:

- Some legacy admin pages (`app/admin/content`, `app/admin/partners`) have
  icon-only `Button size="icon"` clusters where a few are missing
  `aria-label`. Tracked for a focused sweep.
- Sport club cards expand on click without an `aria-expanded` indicator.
- The teen calendar grid uses `<button>` for each day but does not yet
  expose `aria-label="Lundi 5 mai, 3 évènements"` — only the visual day
  number. Plan: emit a hidden full-context label when slot has events.

## References

- WCAG 2.1: https://www.w3.org/TR/WCAG21/
- WAI-ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/
- Touch targets: `docs/design/TOUCH_TARGETS.md`
- Color tokens: `docs/design/COLOR_TOKENS.md`
- Existing implementation notes: `docs/UX_A11Y_IMPLEMENTATION.md`
