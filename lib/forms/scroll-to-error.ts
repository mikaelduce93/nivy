'use client'

/* ==========================================================================
   SCROLL-TO-ERROR (TICKET-043 / W2-A14 contract)
   --------------------------------------------------------------------------
   Lightweight helper used by parent/teen/partner forms to:
     1. Find the first invalid field in a form (or in a custom error map),
     2. Scroll it smoothly into view (respects prefers-reduced-motion),
     3. Move focus to it,
     4. Announce the error count to screen readers via an aria-live region.
     5. Confirm visibility via IntersectionObserver before declaring "done".

   Public API
     - useScrollToError(formRef, errors, options?)   — React hook (W2-A14)
     - scrollToFirstError(form, errors?)             — imperative
     - findFirstInvalidElement(form, errors?)
     - announceErrors(count)

   Companion: lib/hooks/use-keyboard-aware.ts (W1-A8) supplies a similar
   focused-input scroll helper. This module mirrors its prefers-reduced-motion
   contract and accepts a `keyboardHeight` option so callers wiring both
   together can offset the bottom edge for the on-screen keyboard.

   SSR-safe: every DOM access is guarded by `typeof window` /
   `typeof document` checks and only runs from `useEffect` or imperative calls
   — the module imports nothing browser-only at top level.

   Convention: W1-A3 FormField sets `aria-invalid="true"` and `role="alert"`
   on errored fields; we use that as the primary lookup signal.
   ========================================================================== */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type RefObject,
} from 'react'

const ARIA_LIVE_REGION_ID = '__form-error-live-region__'

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Locate the first invalid element inside a form.
 *
 * Resolution order:
 *   1. Explicit error map: first key that resolves to an element via
 *      [name="<key>"], #<key>, or #field-<key>-input.
 *   2. Native validity (aria-invalid="true" or :invalid).
 */
export function findFirstInvalidElement(
  form: HTMLFormElement | null,
  errors?: Record<string, string | undefined> | null
): HTMLElement | null {
  if (!form || typeof document === 'undefined') return null

  if (errors) {
    for (const [key, msg] of Object.entries(errors)) {
      if (!msg) continue
      const el =
        (form.querySelector(`[name="${CSS.escape(key)}"]`) as HTMLElement | null) ||
        (form.querySelector(`#${CSS.escape(key)}`) as HTMLElement | null) ||
        (form.querySelector(
          `#field-${CSS.escape(key)}-input`
        ) as HTMLElement | null)
      if (el) return el
    }
  }

  // Fallback: any aria-invalid element
  const ariaInvalid = form.querySelector<HTMLElement>('[aria-invalid="true"]')
  if (ariaInvalid) return ariaInvalid

  // Last resort: native :invalid
  try {
    const nativeInvalid = form.querySelector<HTMLElement>(':invalid')
    if (nativeInvalid) return nativeInvalid
  } catch {
    /* :invalid not supported on this element-set */
  }

  return null
}

/**
 * Scroll the first invalid field into view, focus it, and announce
 * the total error count to assistive tech.
 *
 * Returns the element that received focus (or null if no errors).
 */
export function scrollToFirstError(
  form: HTMLFormElement | null,
  errors?: Record<string, string | undefined> | null
): HTMLElement | null {
  const target = findFirstInvalidElement(form, errors)
  if (!target) return null

  const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth'

  try {
    target.scrollIntoView({ behavior, block: 'center' })
  } catch {
    target.scrollIntoView()
  }

  // Defer focus slightly so the scroll can settle on iOS
  if (typeof window !== 'undefined') {
    window.setTimeout(() => {
      try {
        target.focus({ preventScroll: true })
      } catch {
        target.focus()
      }
    }, 60)
  }

  if (errors) {
    const count = Object.values(errors).filter(Boolean).length
    if (count > 0) announceErrors(count)
  }

  return target
}

/**
 * Push a polite aria-live message announcing how many errors the form has.
 * Creates a singleton region in <body> the first time it's used.
 */
export function announceErrors(count: number): void {
  if (typeof document === 'undefined' || count <= 0) return

  let region = document.getElementById(ARIA_LIVE_REGION_ID) as HTMLDivElement | null
  if (!region) {
    region = document.createElement('div')
    region.id = ARIA_LIVE_REGION_ID
    region.setAttribute('role', 'status')
    region.setAttribute('aria-live', 'polite')
    region.setAttribute('aria-atomic', 'true')
    // Visually hidden, but still announced
    region.style.cssText =
      'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;'
    document.body.appendChild(region)
  }

  // Clear then set so identical messages re-announce
  region.textContent = ''
  // Intentional next-tick set
  window.setTimeout(() => {
    if (!region) return
    region.textContent =
      count === 1
        ? '1 erreur dans le formulaire.'
        : `${count} erreurs dans le formulaire.`
  }, 30)
}

/* ==========================================================================
   useScrollToError — REACT HOOK (TICKET-043 main deliverable)
   --------------------------------------------------------------------------
   Watches `errors`; when its set of truthy keys changes and is non-empty,
   finds the first invalid field inside `formRef` (via `aria-invalid="true"`
   set by W1-A3 FormField — falls back to name/id resolution from the error
   map for non-FormField inputs), scrolls it smoothly into view (offset for
   keyboard + sticky header, prefers-reduced-motion respected), focuses it,
   then uses IntersectionObserver to confirm the field is actually visible
   (≥ 50 %) before invoking the optional `onVisible` callback.

   Loose `errors` shape works with react-hook-form `FieldErrors`, Formik
   `errors`, Zod `flatten().fieldErrors`, or any plain object keyed by field
   name (truthiness only is examined).
   ========================================================================== */

/** Loose shape — values are inspected for truthiness, not structure. */
export type ErrorsLike = Record<string, unknown> | null | undefined

export interface UseScrollToErrorOptions {
  /**
   * If true, automatically scroll whenever `errors` transitions from empty
   * to non-empty (or its truthy-key set changes). Default `true` — this is
   * the primary purpose of the hook. Set `false` to use only the imperative
   * trigger.
   */
  autoOnChange?: boolean
  /**
   * Pixels to leave between the top of the field and the top of the
   * viewport (or the bottom edge of any sticky header). Default 24 px.
   */
  offsetTop?: number
  /**
   * Pixels to leave between the bottom of the field and the top of the
   * keyboard when open. Default 16 px. Only applied when `keyboardHeight > 0`.
   */
  offsetBottom?: number
  /**
   * Current keyboard height (typically from `useKeyboardAware`). When > 0
   * we factor it into the visibility check's bottom rootMargin. Default 0.
   */
  keyboardHeight?: number
  /**
   * CSS selector for a sticky header whose height should be added to the
   * top offset. Default `'[data-sticky-header]'`. Set to empty string to
   * disable sticky-header detection.
   */
  stickyHeaderSelector?: string
  /**
   * Whether the hook is enabled. Default `true`.
   */
  enabled?: boolean
  /**
   * Callback invoked once IntersectionObserver confirms the target field is
   * ≥ 50 % visible (or immediately on legacy browsers without IO support).
   */
  onVisible?: (el: HTMLElement) => void
  /**
   * If `true`, also push the error count to the polite live region.
   * Default `true`.
   */
  announce?: boolean
}

export interface UseScrollToErrorReturn {
  /** Imperatively run scrollToFirstError against the current ref + errors. */
  trigger: () => HTMLElement | null
  /** Alias for `trigger` (matches the spec naming in TICKET-043). */
  scrollToFirstError: () => HTMLElement | null
}

/* -- internal: stable fingerprint of error keys ------------------------- */

function fingerprintErrors(errors: ErrorsLike): string {
  if (!errors) return ''
  const keys = Object.keys(errors).sort()
  if (keys.length === 0) return ''
  const parts: string[] = []
  for (const k of keys) {
    const v = (errors as Record<string, unknown>)[k]
    if (v) parts.push(k)
  }
  return parts.join('|')
}

function countErrors(errors: ErrorsLike): number {
  if (!errors) return 0
  let n = 0
  for (const k in errors) {
    if (Object.prototype.hasOwnProperty.call(errors, k)) {
      if ((errors as Record<string, unknown>)[k]) n++
    }
  }
  return n
}

/* -- internal: focusable resolver --------------------------------------- */

const FOCUSABLE_SELECTOR =
  'input:not([disabled]):not([type="hidden"]),' +
  'select:not([disabled]),' +
  'textarea:not([disabled]),' +
  'button:not([disabled]),' +
  '[contenteditable="true"],' +
  '[tabindex]:not([tabindex="-1"])'

function pickFocusable(el: HTMLElement): HTMLElement | null {
  if (typeof el.matches === 'function' && el.matches(FOCUSABLE_SELECTOR)) {
    return el
  }
  return el.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
}

/* -- the hook ---------------------------------------------------------- */

export function useScrollToError(
  formRef: RefObject<HTMLFormElement | null>,
  errors: ErrorsLike,
  options: UseScrollToErrorOptions = {}
): UseScrollToErrorReturn {
  const {
    autoOnChange = true,
    offsetTop = 24,
    offsetBottom = 16,
    keyboardHeight = 0,
    stickyHeaderSelector = '[data-sticky-header]',
    enabled = true,
    onVisible,
    announce = true,
  } = options

  // Latest options + errors held in refs so the imperative function stays
  // referentially stable across renders.
  const errorsRef = useRef<ErrorsLike>(errors)
  errorsRef.current = errors

  const optsRef = useRef({
    offsetTop,
    offsetBottom,
    keyboardHeight,
    stickyHeaderSelector,
    onVisible,
    announce,
  })
  optsRef.current = {
    offsetTop,
    offsetBottom,
    keyboardHeight,
    stickyHeaderSelector,
    onVisible,
    announce,
  }

  /* Imperative scroll → focus → observe. */
  const trigger = useCallback<UseScrollToErrorReturn['trigger']>(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return null
    }
    const form = formRef.current
    if (!form) return null

    const o = optsRef.current

    // 1. Resolve target. Prefer the `errors` map (so we hit the exact field
    //    the caller flagged); fall back to `[aria-invalid="true"]` set by
    //    W1-A3 FormField; final fallback is native `:invalid`.
    const errMap = errorsRef.current as
      | Record<string, string | undefined>
      | null
      | undefined
    const target = findFirstInvalidElement(form, errMap)
    if (!target) return null

    // 2. Compute combined top padding (sticky header + caller offset).
    let stickyOffset = 0
    if (o.stickyHeaderSelector) {
      const header = document.querySelector<HTMLElement>(o.stickyHeaderSelector)
      if (header) {
        const r = header.getBoundingClientRect()
        // Only count if pinned to (or near) the top of the viewport.
        if (r.top <= 1) stickyOffset = r.height
      }
    }
    const topPad = stickyOffset + o.offsetTop

    // 3. Decide scroll behavior (prefers-reduced-motion → instant).
    const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth'

    // 4. Scroll the document so the field's top edge sits at `topPad`.
    //    `Element.scrollIntoView({ block: 'start' })` ignores sticky
    //    headers, so we compute the offset on the document scroller.
    const rect = target.getBoundingClientRect()
    const currentY =
      window.scrollY ??
      window.pageYOffset ??
      document.documentElement.scrollTop ??
      0
    const targetY = Math.max(0, currentY + rect.top - topPad)
    try {
      window.scrollTo({ top: targetY, behavior })
    } catch {
      window.scrollTo(0, targetY)
    }

    // Nested-scroller fallback: ensures parent scrollable containers also
    // bring the field into view (no offset support, but better than nothing).
    try {
      target.scrollIntoView({ behavior, block: 'center' })
    } catch {
      target.scrollIntoView()
    }

    // 5. Focus. Defer slightly so iOS settles, and use `preventScroll` so
    //    the focus call doesn't fight the smooth scroll above.
    const focusTarget = pickFocusable(target)
    if (focusTarget) {
      window.setTimeout(() => {
        try {
          focusTarget.focus({ preventScroll: true })
        } catch {
          focusTarget.focus()
        }
      }, 60)
    }

    // 6. Confirm visibility with IntersectionObserver. Negative bottom
    //    rootMargin accounts for the on-screen keyboard; negative top
    //    rootMargin accounts for any sticky header.
    if (typeof IntersectionObserver !== 'undefined') {
      const rootMarginBottom =
        o.keyboardHeight > 0 ? -(o.keyboardHeight + o.offsetBottom) : 0
      const rootMarginTop = -stickyOffset
      let resolved = false
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && !resolved) {
              resolved = true
              io.disconnect()
              o.onVisible?.(target)
              break
            }
          }
        },
        {
          threshold: 0.5,
          rootMargin: `${rootMarginTop}px 0px ${rootMarginBottom}px 0px`,
        }
      )
      io.observe(target)
      // Safety timeout: disconnect after 1.2 s even if the field never
      // crosses the threshold (e.g. it became display:none mid-scroll).
      window.setTimeout(() => {
        if (!resolved) io.disconnect()
      }, 1200)
    } else {
      // Older browsers: optimistically declare done.
      o.onVisible?.(target)
    }

    // Announce error count to assistive tech.
    if (o.announce) {
      const c = countErrors(errorsRef.current)
      if (c > 0) announceErrors(c)
    }

    return target
  }, [formRef])

  /* Reactive: run when the truthy-key fingerprint of `errors` changes. */
  const fingerprint = useMemo(() => fingerprintErrors(errors), [errors])
  const prevFingerprintRef = useRef('')

  useEffect(() => {
    if (!enabled || !autoOnChange) {
      prevFingerprintRef.current = fingerprint
      return
    }
    if (typeof window === 'undefined') return

    // Trigger on any truthy-key set change (covers empty→non-empty *and*
    // distinct-error → distinct-error transitions, e.g. fixing one field
    // and submitting again with a different field invalid).
    if (fingerprint && fingerprint !== prevFingerprintRef.current) {
      // Defer one frame so the DOM has flushed `aria-invalid` for the
      // newly errored fields (form libs set it on the same render that
      // produced the new errors object; iOS Safari occasionally lags).
      const raf = window.requestAnimationFrame(() => {
        trigger()
      })
      prevFingerprintRef.current = fingerprint
      return () => window.cancelAnimationFrame(raf)
    }
    prevFingerprintRef.current = fingerprint
    return undefined
  }, [fingerprint, enabled, autoOnChange, trigger])

  return useMemo(
    () => ({ trigger, scrollToFirstError: trigger }),
    [trigger]
  )
}

/* ==========================================================================
   DEFAULT EXPORT
   ========================================================================== */

export default useScrollToError
