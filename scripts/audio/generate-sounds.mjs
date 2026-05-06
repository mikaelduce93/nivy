/**
 * Generate placeholder WAV sound effects for the NIVY juice system.
 *
 * Run with `node scripts/audio/generate-sounds.mjs` from the repo root.
 * Outputs into public/sounds/<name>.wav. These are synthesised tones, not
 * authored sound design — they exist so the sound manager has audible
 * feedback today and a future asset pass can replace them file by file.
 */

import { writeFileSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, "..", "..", "public", "sounds")
mkdirSync(OUT_DIR, { recursive: true })

const SAMPLE_RATE = 44100

function writeWav(filename, samplesFloat) {
  const samples = samplesFloat.map((s) => Math.max(-1, Math.min(1, s)))
  const numSamples = samples.length
  const buffer = Buffer.alloc(44 + numSamples * 2)
  buffer.write("RIFF", 0)
  buffer.writeUInt32LE(36 + numSamples * 2, 4)
  buffer.write("WAVE", 8)
  buffer.write("fmt ", 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write("data", 36)
  buffer.writeUInt32LE(numSamples * 2, 40)
  for (let i = 0; i < numSamples; i++) {
    buffer.writeInt16LE(Math.round(samples[i] * 32767), 44 + i * 2)
  }
  writeFileSync(join(OUT_DIR, filename), buffer)
}

function envelope(i, total, attack = 0.01, release = 0.5) {
  const t = i / total
  if (t < attack) return t / attack
  if (t > 1 - release) return (1 - t) / release
  return 1
}

function tone({ freq, durationMs, amplitude = 0.4, shape = "sine", attack = 0.005, release = 0.3, slide = 0 }) {
  const total = Math.floor((durationMs / 1000) * SAMPLE_RATE)
  const samples = new Array(total)
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE
    const f = freq + (slide * i) / total
    const phase = 2 * Math.PI * f * t
    let s
    if (shape === "sine") s = Math.sin(phase)
    else if (shape === "square") s = Math.sin(phase) > 0 ? 1 : -1
    else if (shape === "triangle") s = (2 / Math.PI) * Math.asin(Math.sin(phase))
    else if (shape === "saw") s = 2 * (f * t - Math.floor(0.5 + f * t))
    else s = Math.sin(phase)
    samples[i] = s * amplitude * envelope(i, total, attack, release)
  }
  return samples
}

function noise({ durationMs, amplitude = 0.3, attack = 0.01, release = 0.5, lowpass = 0 }) {
  const total = Math.floor((durationMs / 1000) * SAMPLE_RATE)
  const samples = new Array(total)
  let prev = 0
  for (let i = 0; i < total; i++) {
    let s = Math.random() * 2 - 1
    if (lowpass > 0) {
      const alpha = 1 - Math.exp((-2 * Math.PI * lowpass) / SAMPLE_RATE)
      s = prev + alpha * (s - prev)
      prev = s
    }
    samples[i] = s * amplitude * envelope(i, total, attack, release)
  }
  return samples
}

function mix(...layers) {
  const len = Math.max(...layers.map((l) => l.length))
  const out = new Array(len).fill(0)
  for (const layer of layers) {
    for (let i = 0; i < layer.length; i++) out[i] += layer[i]
  }
  const peak = Math.max(...out.map(Math.abs), 0.0001)
  if (peak > 1) for (let i = 0; i < out.length; i++) out[i] /= peak
  return out
}

function concat(...segments) {
  return segments.flat()
}

const C = 261.63
const E = 329.63
const G = 392.0
const C2 = 523.25
const E2 = 659.25
const G2 = 783.99

const sounds = {
  // UI - subtle
  "click.wav": tone({ freq: 1400, durationMs: 40, amplitude: 0.35, attack: 0.01, release: 0.5 }),
  "hover.wav": tone({ freq: 1800, durationMs: 25, amplitude: 0.18, attack: 0.02, release: 0.6 }),
  "toggle.wav": concat(
    tone({ freq: 700, durationMs: 50, amplitude: 0.3, release: 0.5 }),
    tone({ freq: 1100, durationMs: 50, amplitude: 0.3, release: 0.5 }),
  ),
  "open.wav": tone({ freq: 600, durationMs: 180, amplitude: 0.3, slide: 600, release: 0.4 }),
  "close.wav": tone({ freq: 1200, durationMs: 180, amplitude: 0.3, slide: -600, release: 0.4 }),
  "slide.wav": noise({ durationMs: 220, amplitude: 0.25, lowpass: 1500, attack: 0.05, release: 0.6 }),
  "pop.wav": tone({ freq: 700, durationMs: 80, amplitude: 0.45, slide: 400, attack: 0.005, release: 0.4 }),
  "whoosh.wav": noise({ durationMs: 320, amplitude: 0.3, lowpass: 800, attack: 0.05, release: 0.7 }),

  // Gamification
  "xp-gain.wav": concat(
    tone({ freq: G, durationMs: 60, amplitude: 0.4 }),
    tone({ freq: C2, durationMs: 90, amplitude: 0.45, release: 0.5 }),
  ),
  "level-up.wav": concat(
    tone({ freq: C, durationMs: 100, amplitude: 0.5 }),
    tone({ freq: E, durationMs: 100, amplitude: 0.5 }),
    tone({ freq: G, durationMs: 100, amplitude: 0.5 }),
    tone({ freq: C2, durationMs: 200, amplitude: 0.55 }),
    mix(
      tone({ freq: C2, durationMs: 350, amplitude: 0.4, release: 0.7 }),
      tone({ freq: E2, durationMs: 350, amplitude: 0.4, release: 0.7 }),
      tone({ freq: G2, durationMs: 350, amplitude: 0.4, release: 0.7 }),
    ),
  ),
  "achievement.wav": concat(
    mix(
      tone({ freq: C, durationMs: 200, amplitude: 0.4 }),
      tone({ freq: E, durationMs: 200, amplitude: 0.35 }),
      tone({ freq: G, durationMs: 200, amplitude: 0.35 }),
    ),
    mix(
      tone({ freq: C2, durationMs: 400, amplitude: 0.45, release: 0.6 }),
      tone({ freq: E2, durationMs: 400, amplitude: 0.4, release: 0.6 }),
      tone({ freq: G2, durationMs: 400, amplitude: 0.4, release: 0.6 }),
    ),
  ),
  "badge-unlock.wav": concat(
    tone({ freq: E, durationMs: 80, amplitude: 0.4 }),
    tone({ freq: G, durationMs: 80, amplitude: 0.4 }),
    mix(
      tone({ freq: C2, durationMs: 300, amplitude: 0.45, release: 0.6 }),
      tone({ freq: E2, durationMs: 300, amplitude: 0.4, release: 0.6 }),
    ),
  ),
  "streak.wav": concat(
    tone({ freq: 220, durationMs: 60, amplitude: 0.4, slide: 300 }),
    noise({ durationMs: 150, amplitude: 0.3, lowpass: 2000, attack: 0.02, release: 0.6 }),
    tone({ freq: 660, durationMs: 100, amplitude: 0.45, release: 0.5 }),
  ),
  "coin.wav": concat(
    tone({ freq: 988, durationMs: 50, amplitude: 0.5 }),
    tone({ freq: 1319, durationMs: 100, amplitude: 0.45, release: 0.6 }),
  ),
  "quest-complete.wav": concat(
    tone({ freq: G, durationMs: 100, amplitude: 0.45 }),
    tone({ freq: C2, durationMs: 100, amplitude: 0.5 }),
    mix(
      tone({ freq: E2, durationMs: 350, amplitude: 0.45, release: 0.7 }),
      tone({ freq: G2, durationMs: 350, amplitude: 0.4, release: 0.7 }),
    ),
  ),
  "combo.wav": concat(
    tone({ freq: E, durationMs: 60, amplitude: 0.4 }),
    tone({ freq: G, durationMs: 60, amplitude: 0.4 }),
    tone({ freq: C2, durationMs: 60, amplitude: 0.45 }),
    tone({ freq: E2, durationMs: 200, amplitude: 0.5, release: 0.5 }),
  ),

  // Notifications
  "notification.wav": concat(
    tone({ freq: 880, durationMs: 80, amplitude: 0.4 }),
    tone({ freq: 1320, durationMs: 220, amplitude: 0.4, release: 0.7 }),
  ),
  "message.wav": tone({ freq: 1200, durationMs: 140, amplitude: 0.4, release: 0.7, slide: -100 }),
  "mention.wav": concat(
    tone({ freq: 1480, durationMs: 80, amplitude: 0.45 }),
    tone({ freq: 1976, durationMs: 200, amplitude: 0.45, release: 0.6 }),
  ),
  "alert.wav": concat(
    tone({ freq: 880, durationMs: 80, amplitude: 0.45, shape: "square" }),
    tone({ freq: 660, durationMs: 80, amplitude: 0.45, shape: "square" }),
    tone({ freq: 880, durationMs: 200, amplitude: 0.45, shape: "square", release: 0.5 }),
  ),

  // Feedback
  "success.wav": concat(
    tone({ freq: G, durationMs: 80, amplitude: 0.45 }),
    tone({ freq: C2, durationMs: 220, amplitude: 0.45, release: 0.6 }),
  ),
  "error.wav": concat(
    tone({ freq: 392, durationMs: 90, amplitude: 0.4, shape: "square" }),
    tone({ freq: 294, durationMs: 220, amplitude: 0.4, shape: "square", release: 0.5 }),
  ),
  "warning.wav": concat(
    tone({ freq: 660, durationMs: 100, amplitude: 0.4, shape: "triangle" }),
    tone({ freq: 660, durationMs: 100, amplitude: 0.4, shape: "triangle" }),
  ),

  // Special
  "celebration.wav": concat(
    mix(
      tone({ freq: C, durationMs: 800, amplitude: 0.35, release: 0.7 }),
      tone({ freq: E, durationMs: 800, amplitude: 0.3, release: 0.7 }),
      tone({ freq: G, durationMs: 800, amplitude: 0.3, release: 0.7 }),
      tone({ freq: C2, durationMs: 800, amplitude: 0.35, release: 0.7 }),
    ),
  ),
  "fanfare.wav": concat(
    tone({ freq: G, durationMs: 150, amplitude: 0.45, shape: "triangle" }),
    tone({ freq: C2, durationMs: 150, amplitude: 0.5, shape: "triangle" }),
    tone({ freq: E2, durationMs: 150, amplitude: 0.5, shape: "triangle" }),
    mix(
      tone({ freq: C2, durationMs: 500, amplitude: 0.4, release: 0.7 }),
      tone({ freq: E2, durationMs: 500, amplitude: 0.4, release: 0.7 }),
      tone({ freq: G2, durationMs: 500, amplitude: 0.4, release: 0.7 }),
    ),
  ),
  "magic.wav": concat(
    tone({ freq: 1200, durationMs: 60, amplitude: 0.35, slide: 600 }),
    tone({ freq: 1800, durationMs: 60, amplitude: 0.35, slide: 800 }),
    tone({ freq: 2400, durationMs: 200, amplitude: 0.4, release: 0.7 }),
  ),
}

for (const [name, samples] of Object.entries(sounds)) {
  writeWav(name, samples)
  console.log(`generated ${name} (${(samples.length / SAMPLE_RATE).toFixed(2)}s)`)
}

console.log(`\nWrote ${Object.keys(sounds).length} files to ${OUT_DIR}`)
