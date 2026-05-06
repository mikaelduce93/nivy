# BottomSheet

`components/ui/bottom-sheet.tsx` — high-level wrapper around the `vaul`
drawer primitive. Provides a single, opinionated API for mobile-first
modal surfaces.

## Why a wrapper

The codebase mixes Radix `Dialog`, `Drawer` (vaul) and a few one-off sheets.
For touch UIs we want one consistent shape:

- 90 vh max-height, rounded top, drag handle.
- Drag-to-close with momentum (handled by vaul natively).
- iOS safe-area aware (no clipping under the home indicator).
- Configurable snap points.
- Optional **desktop fallback** to a centered `Dialog` for forms /
  confirmations that already work in a modal (`mode="mobile-only"`).

## API

```tsx
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetBody,
  BottomSheetFooter,
} from "@/components/ui/bottom-sheet"

<BottomSheet
  open={open}
  onOpenChange={setOpen}
  mode="mobile-only"           // default; "mobile-first" forces sheet on desktop too
  snapPoints={[0.4, 0.9]}      // optional, vaul snap points
  dismissible                  // default true
>
  <BottomSheetHeader>
    <BottomSheetTitle>Acheter ce reward</BottomSheetTitle>
    <BottomSheetDescription>Confirme l'échange de XP.</BottomSheetDescription>
  </BottomSheetHeader>
  <BottomSheetBody>
    {/* form / list / picker */}
  </BottomSheetBody>
  <BottomSheetFooter>
    <Button onClick={confirm}>Confirmer</Button>
  </BottomSheetFooter>
</BottomSheet>
```

## Modes

| `mode`           | Mobile (< md)   | Desktop (≥ md)         |
|------------------|-----------------|------------------------|
| `mobile-only`    | bottom sheet    | centered `Dialog`      |
| `mobile-first`   | bottom sheet    | bottom sheet (always)  |

Use `mobile-only` for forms/confirmations. Use `mobile-first` for
"phone-shaped" UIs (action menus, scrollable lists, picker UIs) that
should *feel* native on phones first.

## Migration policy

This is **not** an automated migration. Existing `Dialog` usages stay as
they are. New screens — and any progressively migrated screen — should
adopt `BottomSheet` instead of raw `Drawer` + custom styling.

## Snap points

`vaul` accepts an array of snap points. Each entry is either:

- a number between 0 and 1 (fraction of viewport height), or
- a string ending in `px` (raw pixels), `vh`, etc.

```tsx
<BottomSheet open={open} onOpenChange={setOpen} snapPoints={[0.4, 0.9]}>
```

Open the sheet, drag it: it will snap between 40 % and 90 % of viewport.

## Accessibility

- `BottomSheetTitle` and `BottomSheetDescription` are `vaul` primitives,
  so the dialog is properly labelled.
- Trap focus and restore focus on close are handled by vaul.
- `dismissible={false}` disables drag-to-close *and* overlay click; use it
  sparingly (destructive confirmations only).
