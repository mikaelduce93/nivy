'use client'

/* ==========================================================================
   useJuice — High-level "juice" feedback hook (sound + haptic + confetti)

   Combines the three sensory channels of a delightful UI:
     1. Sound (via lib/sounds/sound-manager)
     2. Haptic vibration (via lib/hooks/use-haptic)
     3. Visual celebration (canvas-confetti) for the big moments

   Goals:
   - One single API for consumers: play("level_up"), play("xp_gain"), …
   - Respects prefers-reduced-motion (skips confetti, light haptic only).
   - Respects the user "mute" setting (LocalStorage `nivy.audio` -> "muted"
     OR existing `tpm-sounds-enabled` from sound-manager).
   - Defensive: missing /public/sounds files do not throw — sound-manager
     simply no-ops, and the hook still fires haptic + confetti.

   Usage:
     const { play } = useJuice()
     play('level_up')          // big celebration
     play('click')             // subtle button feedback
     play('xp_gain', { confettiOrigin: { x: 0.5, y: 0.7 } })
   ========================================================================== */

import { useCallback, useMemo } from 'react'
import canvasConfetti from 'canvas-confetti'
import { useHaptic } from '@/lib/hooks/use-haptic'
import { getSoundManager, type SoundEffect } from '@/lib/sounds/sound-manager'

export type JuiceEvent =
  // UI
  | 'click'
  | 'tap'
  | 'button_press'
  | 'toggle'
  | 'open'
  | 'close'
  | 'pop'
  // Feedback
  | 'success'
  | 'error'
  | 'warning'
  // Gamification — the real juice
  | 'xp_gain'
  | 'level_up'
  | 'achievement_unlock'
  | 'streak_milestone'
  | 'quest_complete'
  // Social
  | 'like'
  | 'message_send'
  | 'notification'

type HapticType = 'success' | 'warning' | 'error' | 'light' | 'medium' | 'heavy' | 'selection'

type ConfettiPreset = 'none' | 'soft' | 'burst' | 'fireworks' | 'fanfare' | 'streak'

interface JuiceMapping {
  sound: SoundEffect | null
  haptic: HapticType | null
  confetti: ConfettiPreset
}

const JUICE_MAP: Record<JuiceEvent, JuiceMapping> = {
  // UI — minimal, non-intrusive
  click: { sound: 'click', haptic: 'light', confetti: 'none' },
  tap: { sound: 'click', haptic: 'light', confetti: 'none' },
  button_press: { sound: 'click', haptic: 'selection', confetti: 'none' },
  toggle: { sound: 'toggle', haptic: 'selection', confetti: 'none' },
  open: { sound: 'open', haptic: 'light', confetti: 'none' },
  close: { sound: 'close', haptic: 'light', confetti: 'none' },
  pop: { sound: 'pop', haptic: 'light', confetti: 'none' },

  // Feedback — broadcast outcome
  success: { sound: 'success', haptic: 'success', confetti: 'none' },
  error: { sound: 'error', haptic: 'error', confetti: 'none' },
  warning: { sound: 'warning', haptic: 'warning', confetti: 'none' },

  // Gamification — punchy
  xp_gain: { sound: 'xp_gain', haptic: 'light', confetti: 'soft' },
  level_up: { sound: 'level_up', haptic: 'success', confetti: 'fireworks' },
  achievement_unlock: { sound: 'achievement', haptic: 'heavy', confetti: 'fanfare' },
  streak_milestone: { sound: 'streak', haptic: 'medium', confetti: 'streak' },
  quest_complete: { sound: 'quest_complete', haptic: 'success', confetti: 'burst' },

  // Social
  like: { sound: 'pop', haptic: 'light', confetti: 'none' },
  message_send: { sound: 'message', haptic: 'selection', confetti: 'none' },
  notification: { sound: 'notification', haptic: 'medium', confetti: 'none' },
}

/* --------------------------------------------------------------------------
   Mute / reduced-motion helpers (SSR-safe)
   -------------------------------------------------------------------------- */

const NIVY_AUDIO_KEY = 'nivy.audio'

function isMutedByUser(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const v = localStorage.getItem(NIVY_AUDIO_KEY)
    if (v === 'muted' || v === 'off' || v === 'false') return true
  } catch {
    // ignore — storage unavailable
  }
  return false
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/* --------------------------------------------------------------------------
   Confetti presets
   -------------------------------------------------------------------------- */

const PALETTES = {
  xp: ['#8b5cf6', '#fbbf24', '#ffffff', '#a78bfa', '#f59e0b'],
  rainbow: ['#ef4444', '#f97316', '#fbbf24', '#22c55e', '#0ea5e9', '#8b5cf6', '#ec4899'],
  gold: ['#fbbf24', '#f59e0b', '#d97706', '#fcd34d'],
  fire: ['#fb923c', '#f97316', '#ef4444', '#fbbf24'],
  emerald: ['#34d399', '#10b981', '#059669', '#a7f3d0'],
}

function fireConfetti(
  preset: ConfettiPreset,
  origin: { x: number; y: number } = { x: 0.5, y: 0.6 }
): void {
  if (typeof window === 'undefined') return

  switch (preset) {
    case 'soft':
      canvasConfetti({
        particleCount: 30,
        spread: 50,
        startVelocity: 25,
        gravity: 0.9,
        origin,
        colors: PALETTES.xp,
        zIndex: 9999,
        ticks: 100,
      })
      return
    case 'burst':
      canvasConfetti({
        particleCount: 120,
        spread: 90,
        startVelocity: 40,
        origin,
        colors: PALETTES.emerald,
        zIndex: 9999,
      })
      return
    case 'fireworks': {
      // Two side bursts for a "level up" feel
      const colors = PALETTES.rainbow
      canvasConfetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors, zIndex: 9999 })
      canvasConfetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors, zIndex: 9999 })
      canvasConfetti({ particleCount: 150, spread: 100, origin, colors, zIndex: 9999 })
      return
    }
    case 'fanfare':
      canvasConfetti({
        particleCount: 200,
        spread: 120,
        startVelocity: 55,
        ticks: 200,
        origin,
        colors: PALETTES.gold,
        scalar: 1.1,
        zIndex: 9999,
      })
      return
    case 'streak':
      canvasConfetti({
        particleCount: 60,
        spread: 70,
        startVelocity: 45,
        gravity: 0.6,
        origin: { x: origin.x, y: origin.y },
        colors: PALETTES.fire,
        shapes: ['circle'],
        zIndex: 9999,
      })
      return
    case 'none':
    default:
      return
  }
}

/* --------------------------------------------------------------------------
   Hook
   -------------------------------------------------------------------------- */

export interface PlayJuiceOptions {
  /** Skip the sound channel for this single call. */
  silent?: boolean
  /** Skip the haptic channel for this single call. */
  noHaptic?: boolean
  /** Skip the confetti channel for this single call. */
  noConfetti?: boolean
  /** Override confetti origin (0..1 in viewport coords). */
  confettiOrigin?: { x: number; y: number }
  /** Override sound volume (0..1). */
  volume?: number
}

export function useJuice() {
  const { trigger } = useHaptic()
  const sound = useMemo(() => (typeof window !== 'undefined' ? getSoundManager() : null), [])

  const play = useCallback(
    (event: JuiceEvent, options: PlayJuiceOptions = {}) => {
      const mapping = JUICE_MAP[event]
      if (!mapping) return

      const reduced = prefersReducedMotion()
      const muted = isMutedByUser()

      // 1. Sound — gated by mute setting + sound-manager's own enabled flag.
      if (mapping.sound && !options.silent && !muted && sound) {
        // sound-manager already returns early if disabled or reduced-motion.
        sound.play(mapping.sound, options.volume !== undefined ? { volume: options.volume } : {}).catch(() => {
          /* ignore — missing audio file is fine */
        })
      }

      // 2. Haptic — gated by reduced-motion (vibration is a motion).
      if (mapping.haptic && !options.noHaptic && !reduced) {
        trigger(mapping.haptic)
      }

      // 3. Confetti — gated by reduced-motion (skip entirely for a11y).
      if (mapping.confetti !== 'none' && !options.noConfetti && !reduced) {
        fireConfetti(mapping.confetti, options.confettiOrigin)
      }
    },
    [trigger, sound]
  )

  return { play }
}

/* --------------------------------------------------------------------------
   Standalone (non-hook) trigger — useful for one-off side effects in
   non-React contexts (e.g. inside a toast wrapper, a service callback).
   -------------------------------------------------------------------------- */

export function playJuice(event: JuiceEvent, options: PlayJuiceOptions = {}): void {
  if (typeof window === 'undefined') return
  const mapping = JUICE_MAP[event]
  if (!mapping) return

  const reduced = prefersReducedMotion()
  const muted = isMutedByUser()

  if (mapping.sound && !options.silent && !muted) {
    getSoundManager()
      .play(mapping.sound, options.volume !== undefined ? { volume: options.volume } : {})
      .catch(() => {})
  }
  if (mapping.haptic && !options.noHaptic && !reduced && typeof navigator !== 'undefined' && navigator.vibrate) {
    // Inline minimal vibration mapping (matches use-haptic.ts).
    const map: Record<HapticType, number | number[]> = {
      success: [50, 30, 50],
      warning: 200,
      error: [50, 30, 50, 30, 50],
      light: 10,
      medium: 20,
      heavy: 40,
      selection: 15,
    }
    try {
      navigator.vibrate(map[mapping.haptic])
    } catch {
      /* ignore */
    }
  }
  if (mapping.confetti !== 'none' && !options.noConfetti && !reduced) {
    fireConfetti(mapping.confetti, options.confettiOrigin)
  }
}

/* --------------------------------------------------------------------------
   Mute helpers (consumed by Settings UI)
   -------------------------------------------------------------------------- */

export function setNivyAudioMuted(muted: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(NIVY_AUDIO_KEY, muted ? 'muted' : 'on')
  } catch {
    /* ignore */
  }
}

export function isNivyAudioMuted(): boolean {
  return isMutedByUser()
}
