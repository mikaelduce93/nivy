# Favicons — TODO (PNG raster export)

Source of truth for the NIVY favicon mark is the **panda head** as drawn in
[`components/brand/panda-logo.tsx`](../../components/brand/panda-logo.tsx)
(`<PandaIcon expression="happy" />`). It is intentionally geometric — circles
and arcs only — so it survives down to 16x16 without anti-aliasing mush.

## What ships today

| Asset | Path | Status |
| --- | --- | --- |
| SVG favicon (modern browsers) | `public/icons/panda-favicon.svg` | ✅ Shipped — vector, no rasterization |
| Safari pinned-tab mask | `public/icons/safari-pinned-tab.svg` | ✅ Shipped — mono-colour silhouette, mask-icon color set to `#a855f7` (brand purple) |
| `apple-touch-icon` 180x180 | `public/icons/apple-touch-icon.png` | ⏳ TODO |
| Android `192x192` | `public/icons/icon-192x192.png` | ⏳ TODO |
| Android `512x512` | `public/icons/icon-512x512.png` | ⏳ TODO |
| Browser `32x32` | `public/icons/icon-32x32.png` | ⏳ TODO |
| Browser `16x16` | `public/icons/icon-16x16.png` | ⏳ TODO |
| iPad 152x152 | `public/icons/icon-152x152.png` | ⏳ TODO |

`app/layout.tsx > metadata.icons` already references all sizes — once the PNGs
exist they will be picked up automatically.

## Generation recipe

The simplest reproducible flow (offline, no service):

```bash
# requires `rsvg-convert` (librsvg) or `magick` (ImageMagick 7+)
SRC=public/icons/panda-favicon.svg

for size in 16 32 152 180 192 512; do
  rsvg-convert -w $size -h $size "$SRC" -o public/icons/icon-${size}x${size}.png
done

# Apple touch icon is 180x180 with the rounded background already baked in:
cp public/icons/icon-180x180.png public/icons/apple-touch-icon.png
```

If `rsvg-convert` is not installed, `magick` works equivalently:

```bash
magick -background none -density 600 "$SRC" -resize 192x192 public/icons/icon-192x192.png
```

## Visual specs

- Background: rounded square `#0f0f1a` (matches panda-favicon.svg `<rect>`).
  Keeps the icon legible on both white (Chrome) and dark (browser PWA shortcut)
  surfaces.
- Brand purple accent: `#a855f7` (`oklch(0.65 0.20 290)` family) — used for the
  Safari pinned-tab `mask-icon color` and any future macOS dock badge.
- The SVG is **theme-aware via `currentColor`** when used inline in React
  (`<PandaIcon />`). For the favicon the colors are baked-in (we cannot rely
  on CSS context inside `<link rel="icon">`).

## Manifest

`public/manifest.json` should reference the same 192/512 PNGs once exported.
That file is not in the agent write-set for this PR; create it in the next
pass alongside the PNG generation.
