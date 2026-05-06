/**
 * Rasterise the panda SVG favicon into the PNG sizes referenced from
 * app/layout.tsx metadata.icons (16, 32, 152, 180, 192, 512) plus an
 * apple-touch-icon and an Open Graph image.
 *
 * Run from the repo root:  node scripts/icons/generate-favicons.mjs
 */

import sharp from "sharp"
import { readFileSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..", "..")
const ICONS = join(ROOT, "public", "icons")
mkdirSync(ICONS, { recursive: true })

const svg = readFileSync(join(ICONS, "panda-favicon.svg"))

const targets = [
  { name: "icon-16x16.png", size: 16 },
  { name: "icon-32x32.png", size: 32 },
  { name: "icon-152x152.png", size: 152 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "icon-192x192.png", size: 192 },
  { name: "icon-512x512.png", size: 512 },
]

for (const { name, size } of targets) {
  await sharp(svg, { density: Math.max(72, size * 4) })
    .resize(size, size)
    .png()
    .toFile(join(ICONS, name))
  console.log(`generated ${name} (${size}x${size})`)
}

// Generate a simple OG image (1200x630) with the panda centred on a dark card.
const ogSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f0f1a"/>
      <stop offset="1" stop-color="#1a1530"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g transform="translate(600 280) scale(4) translate(-32 -32)">
    <circle cx="14" cy="14" r="8" fill="#0f0f1a"/>
    <circle cx="50" cy="14" r="8" fill="#0f0f1a"/>
    <circle cx="14" cy="14" r="3.5" fill="#ffd6f5" opacity="0.85"/>
    <circle cx="50" cy="14" r="3.5" fill="#ffd6f5" opacity="0.85"/>
    <circle cx="32" cy="34" r="22" fill="#fdfdff"/>
    <circle cx="18" cy="40" r="3" fill="#c084fc" opacity="0.55"/>
    <circle cx="46" cy="40" r="3" fill="#c084fc" opacity="0.55"/>
    <ellipse cx="23" cy="30" rx="5" ry="6" fill="#0f0f1a" transform="rotate(-18 23 30)"/>
    <ellipse cx="41" cy="30" rx="5" ry="6" fill="#0f0f1a" transform="rotate(18 41 30)"/>
    <circle cx="23.5" cy="29" r="1.6" fill="#fff"/>
    <circle cx="41.5" cy="29" r="1.6" fill="#fff"/>
    <ellipse cx="32" cy="36" rx="2.4" ry="1.8" fill="#0f0f1a"/>
    <path d="M27 41 Q32 46 37 41" stroke="#0f0f1a" stroke-width="2" stroke-linecap="round" fill="none"/>
  </g>
  <text x="600" y="510" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="78" font-weight="900" fill="#fdfdff">NIVY</text>
  <text x="600" y="565" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="28" font-weight="600" fill="#c084fc">Teen Life Unleashed</text>
</svg>`

await sharp(Buffer.from(ogSvg))
  .resize(1200, 630)
  .jpeg({ quality: 88 })
  .toFile(join(ROOT, "public", "og-image.jpg"))
console.log(`generated og-image.jpg (1200x630)`)

console.log(`\nFavicons written to ${ICONS}`)
