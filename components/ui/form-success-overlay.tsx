"use client"

/**
 * FormSuccessOverlay — TICKET-020 (Wave 3 / W3-A6 motion designer)
 * =================================================================
 *
 * A celebratory whole-form animation rendered as an absolute-positioned
 * overlay above a form on a successful submit. Pairs with the per-button
 * loading + success states already shipped on PremiumButton in Wave 2.
 *
 * Composition:
 *   - Lucide CheckCircle2 (green) scales 0 → 1.2 → 1 via SPRING_BOUNCY.
 *   - A circular ring expands from 0 → 200% while fading opacity 1 → 0
 *     over 600ms, giving a "ripple of success" feel around the icon.
 *   - Auto-dismisses after `dismissAfterMs` (default 1500ms) and fires
 *     the optional `onComplete` callback.
 *
 * Accessibility:
 *   - Honours `prefers-reduced-motion`: drops scale/expand/keyframes,
 *     keeps a simple fade in/out for the same total visible duration.
 *   - Adds `role="status"` + `aria-live="polite"` so screen readers
 *     announce the success state.
 *
 * Usage:
 *   <div className="relative">
 *     <form ...>...</form>
 *     <FormSuccessOverlay show={success} onComplete={() => router.push(...)} />
 *   </div>
 */

import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { SPRING_BOUNCY } from '@/lib/motion/easing'

export interface FormSuccessOverlayProps {
  /** Mount/unmount the celebratory overlay. */
  show: boolean
  /** Fires once the auto-dismiss timer elapses (after `dismissAfterMs`). */
  onComplete?: () => void
  /** Auto-dismiss delay in ms. Defaults to 1500ms. */
  dismissAfterMs?: number
  /** Optional accessible label. Defaults to "Succès". */
  label?: string
  /** Extra classes for the overlay backdrop. */
  className?: string
}

export function FormSuccessOverlay({
  show,
  onComplete,
  dismissAfterMs = 1500,
  label = 'Succès',
  className,
}: FormSuccessOverlayProps) {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!show) return
    const id = window.setTimeout(() => {
      onComplete?.()
    }, dismissAfterMs)
    return () => window.clearTimeout(id)
  }, [show, dismissAfterMs, onComplete])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="form-success-overlay"
          role="status"
          aria-live="polite"
          aria-label={label}
          className={cn(
            'pointer-events-none absolute inset-0 z-50 flex items-center justify-center',
            'rounded-[inherit] bg-zinc-950/60 backdrop-blur-sm',
            className,
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Expanding ring — purely decorative */}
          {!reduceMotion && (
            <motion.span
              aria-hidden="true"
              className="absolute h-20 w-20 rounded-full border-2 border-emerald-400"
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          )}

          {/* Check icon — scale 0 → 1.2 → 1 spring (or simple fade for reduced motion).
              The 0 → 1 scale uses SPRING_BOUNCY (overshoot already gives the
              "1.2 → 1" feel); opacity fades in alongside via tween. */}
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
            transition={
              reduceMotion
                ? { duration: 0.2 }
                : {
                    scale: SPRING_BOUNCY,
                    opacity: { duration: 0.2 },
                  }
            }
            className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15"
          >
            <CheckCircle2
              className="h-12 w-12 text-emerald-400 drop-shadow-[0_4px_12px_rgba(52,211,153,0.45)]"
              aria-hidden="true"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default FormSuccessOverlay
