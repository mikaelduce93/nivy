# Touch Targets — Mobile UX Standard

NIVY targets the WCAG 2.5.5 Level AAA + Apple Human Interface Guidelines minimum:
**44 x 44 px** of pointer hit area for any interactive element on mobile.

## Why 44px

- WCAG 2.5.5 (Target Size — Enhanced): 44x44 CSS pixels minimum for AAA conformance
- Apple HIG: 44pt recommended minimum for any tappable control on iOS
- Material Design: 48dp recommended (we standardise on 44 to keep the visual scale tight)

## Helpers

The following utilities live in `app/globals.css`:

| Class           | Effect                              |
|-----------------|-------------------------------------|
| `min-h-touch`   | `min-height: 44px;`                 |
| `min-w-touch`   | `min-width: 44px;`                  |
| `tap-target`    | both `min-height` and `min-width`   |

Use these whenever a control is **visually smaller** than 44 px (an `h-9` button,
an icon-only chevron, a dock label) so the *hit area* still reaches the minimum
even if the painted box does not.

## Audit summary (Phase 1)

| Component                          | Before        | After                              |
|------------------------------------|---------------|------------------------------------|
| `Button` size `default`            | `h-10` (40px) | `h-11` (44px)                      |
| `Button` size `sm`                 | `h-8` (32px)  | `h-9` + `min-h-11` (visual 36 / hit 44) |
| `Button` size `icon`               | `size-10`     | `size-11`                          |
| `Button` size `icon-sm`            | `size-8`      | `size-9` + `min-h/w-11`            |
| `NeonButton` size `sm`             | `h-9`         | `h-9` + `min-h/w-11`               |
| `MobileDock` link container        | `py-2` (~32px)| `py-2.5` + `min-h-touch` (44px)    |

## Guidelines for new components

1. Default to `h-11` (44 px) for any primary CTA / form button.
2. If you need a *visually compact* button (`h-8`, `h-9`), apply `min-h-11`
   (or the `min-h-touch` utility) to keep the hit area legal.
3. Icon-only triggers must use `tap-target` (or `size-11`) — never
   `size-8` / `size-9` raw.
4. Floating dock / nav items: combine generous `py-*` with `min-h-touch`
   so the parent flex row is the actual hit area, not just the icon.
5. Never rely on hover for affordance; touch users have no hover.

## Verification

Open Chrome DevTools → Device toolbar → 375 px (iPhone SE):

- All dock items are at least 44 px tall.
- Primary `Button` defaults render at 44 px tall.
- Icon buttons in headers are at least 44 x 44 px.
