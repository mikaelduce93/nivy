/**
 * NIVY — Canonical Motion Easing Curves & Durations
 * =================================================
 *
 * Single source of truth for every animation in the app. All cubic-bezier
 * curves and durations are exported from here so designers and engineers
 * can reason about motion in one place.
 *
 * Wave 1 / TICKET-027 — replaces 4+ duplicated easing definitions across:
 *   - components/layouts/page-transition.tsx
 *   - components/providers/page-transition-provider.tsx
 *   - lib/design-system/motion.ts
 *   - components/ui/effects/cinematic-transition.tsx
 *
 * Two namespaces are exported:
 *   - `EASE.*` / `SPRING.*`  — concise tokens used in the codebase today
 *   - `EASE_STANDARD`, `DURATION_FAST`, ... — verbose constants for new code
 *
 * Both refer to the same underlying values; either is fine to use.
 */

import type { Transition } from 'framer-motion'

/* ==========================================================================
   CUBIC-BEZIER CURVES
   ========================================================================== */

/**
 * Standard ease (Apple "ease-out-quint"-inspired) — strong start, gentle end.
 * Use for the vast majority of UI transitions: buttons, hover, layout shifts.
 * Feels confident, responsive, never lazy.
 */
export const EASE_STANDARD = [0.83, 0, 0.17, 1] as const

/**
 * Decelerate — material-design "ease-out". Content entering the viewport
 * lands soft. Use for elements appearing (toasts, sheets, page enters).
 */
export const EASE_DECELERATE = [0, 0, 0.2, 1] as const

/**
 * Accelerate — material-design "ease-in". Content leaving the viewport
 * gathers speed and exits cleanly. Use for unmount / dismiss animations.
 */
export const EASE_ACCELERATE = [0.4, 0, 1, 1] as const

/**
 * Smooth bidirectional ease (material "standard"). Symmetric in/out — best
 * when an element is moving but staying on screen (toggles, accordions).
 */
export const EASE_SMOOTH = [0.4, 0, 0.2, 1] as const

/**
 * Snappy out-back — slight overshoot for satisfying card / chip entries.
 * Picks a tasteful middle between flat ease-out and a full bounce.
 */
export const EASE_SNAPPY = [0.34, 1.56, 0.64, 1] as const

/**
 * Dramatic — long deceleration tail. Use sparingly: hero entrances,
 * level-up reveals, marketing sections.
 */
export const EASE_DRAMATIC = [0.23, 1, 0.32, 1] as const

/* ==========================================================================
   SPRING PHYSICS PRESETS
   ========================================================================== */

/**
 * Spring: snappy — quick response, minimal oscillation. Default for
 * interactive feedback (toggles, modal scale-in, drag spring-back).
 */
export const SPRING_SNAPPY = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 30,
  mass: 1,
}

/**
 * Spring: bouncy — playful overshoot. For celebrations, badge pops,
 * achievement unlocks. Avoid in dense interfaces.
 */
export const SPRING_BOUNCY = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 18,
  mass: 1,
}

/**
 * Spring: gentle — soft, settled motion. For dashboards, ambient ui.
 */
export const SPRING_GENTLE = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 25,
  mass: 1,
}

/**
 * Spring: stiff — near-instant snap. For drag handles, haptic-like beats.
 */
export const SPRING_STIFF = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 35,
  mass: 0.8,
}

/* ==========================================================================
   DURATIONS (seconds — framer-motion native unit)
   ========================================================================== */

/** 150 ms — micro-interactions: hover, focus, tap. */
export const DURATION_FAST = 0.15
/** 250 ms — default UI transitions. */
export const DURATION_NORMAL = 0.25
/** 400 ms — modal / sheet / page transitions. */
export const DURATION_SLOW = 0.4
/** 600 ms — hero entrances, level-up moments. Use sparingly. */
export const DURATION_DRAMATIC = 0.6
/** 80 ms — instant feedback (button press confirm). */
export const DURATION_INSTANT = 0.08

/* ==========================================================================
   GROUPED NAMESPACES — `EASE.*`, `SPRING.*`, `DURATION.*`
   ========================================================================== */

/**
 * Easing namespace — short aliases for common usage.
 *
 * @example
 *   transition={{ duration: 0.25, ease: EASE.smooth }}
 */
export const EASE = {
  smooth: EASE_STANDARD,
  decelerate: EASE_DECELERATE,
  accelerate: EASE_ACCELERATE,
  symmetric: EASE_SMOOTH,
  snappy: EASE_SNAPPY,
  bouncy: EASE_SNAPPY, // alias kept for migration ergonomics
  dramatic: EASE_DRAMATIC,
} as const

/**
 * Spring namespace.
 *
 * @example
 *   transition={SPRING.snappy}
 */
export const SPRING = {
  snappy: SPRING_SNAPPY,
  bouncy: SPRING_BOUNCY,
  gentle: SPRING_GENTLE,
  stiff: SPRING_STIFF,
} as const

/**
 * Duration namespace.
 *
 * @example
 *   transition={{ duration: DURATION.normal, ease: EASE.smooth }}
 */
export const DURATION = {
  instant: DURATION_INSTANT,
  fast: DURATION_FAST,
  normal: DURATION_NORMAL,
  slow: DURATION_SLOW,
  dramatic: DURATION_DRAMATIC,
} as const

/* ==========================================================================
   READY-MADE TRANSITION PRESETS
   ========================================================================== */

/**
 * The default transition used by `<Motion.*>` when none is provided.
 * 250 ms, EASE_STANDARD — feels at home in 95 % of UI surfaces.
 */
export const DEFAULT_TRANSITION: Transition = {
  duration: DURATION_NORMAL,
  ease: EASE_STANDARD,
}

/** Reduced-motion transition: zero duration, zero delay — render final state. */
export const REDUCED_MOTION_TRANSITION: Transition = {
  duration: 0,
  delay: 0,
}

export type EaseToken = keyof typeof EASE
export type SpringToken = keyof typeof SPRING
export type DurationToken = keyof typeof DURATION
