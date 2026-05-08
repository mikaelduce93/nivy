'use client'

/* ==========================================================================
   KEYBOARD-AWARE HOOK + CONTAINERS
   TICKET-040 [mobile-gestures] Keyboard-aware form scrolling
   ----------------------------------------------------------------------------
   Detects when the on-screen virtual keyboard is open by monitoring
   `window.visualViewport` (height delta vs `window.innerHeight`).

   Returns:
     - keyboardOpen   : boolean
     - keyboardHeight : number  (px occluded by keyboard, including iOS offsetTop)
     - scrollIntoView : (el?) => void   helper to bring focused field above keyboard

   Companion components:
     - <KeyboardAwareScrollContainer>  scrollable wrapper, auto pads bottom by
       keyboardHeight + safe-area-inset-bottom when keyboard open
     - <FormKeyboardAware>             HOC-style wrapper for forms

   SSR-safe: all viewport access is wrapped in `typeof window` checks and only
   runs inside `useEffect` (never `useLayoutEffect`).

   iOS Safari quirks handled:
     - `visualViewport.offsetTop` is non-zero on iOS when the page is shifted
       up by the keyboard; we factor it into the occluded height.
     - iOS fires `resize` AND `scroll` on visualViewport; we listen to both.
     - On iOS the focused input is sometimes already partially scrolled by
       the browser; we always re-align to a safe margin above the keyboard.

   prefers-reduced-motion:
     - smooth scroll otherwise; instant ('auto') when reduced motion requested.
   ========================================================================== */

import {
  createElement,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react'

/* ==========================================================================
   TYPES
   ========================================================================== */

export interface UseKeyboardAwareOptions {
  /**
   * Minimum height delta (px) between window.innerHeight and visualViewport.height
   * to be considered "keyboard open". Defaults to 150 px.
   * (Browser chrome bars usually account for < 100 px; keyboards are ≥ 250 px.)
   */
  threshold?: number
  /**
   * Additional padding (px) to leave between the focused element bottom edge
   * and the top of the keyboard when scrolling into view. Default 16 px.
   */
  scrollPadding?: number
  /**
   * Whether to auto-scroll the active element when the keyboard opens.
   * Default `true`.
   */
  autoScrollOnOpen?: boolean
}

export interface UseKeyboardAwareReturn {
  /** True when the on-screen keyboard appears to be open */
  keyboardOpen: boolean
  /** Pixels currently occluded by the keyboard at the bottom of the viewport */
  keyboardHeight: number
  /**
   * Scroll the given element (or the currently focused element if omitted)
   * so that it sits above the keyboard with `scrollPadding` of breathing room.
   */
  scrollIntoView: (el?: HTMLElement | null) => void
}

/* ==========================================================================
   INTERNAL: prefers-reduced-motion (SSR-safe, no extra dep)
   ========================================================================== */

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update)
      return () => mq.removeEventListener('change', update)
    }
    // Safari < 14
    mq.addListener(update)
    return () => mq.removeListener(update)
  }, [])

  return reduced
}

/* ==========================================================================
   HOOK
   ========================================================================== */

export function useKeyboardAware(
  options: UseKeyboardAwareOptions = {}
): UseKeyboardAwareReturn {
  const { threshold = 150, scrollPadding = 16, autoScrollOnOpen = true } = options

  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const reducedMotion = usePrefersReducedMotion()

  // Refs to avoid stale closures inside event listeners
  const keyboardOpenRef = useRef(false)
  const keyboardHeightRef = useRef(0)
  const reducedMotionRef = useRef(reducedMotion)
  reducedMotionRef.current = reducedMotion

  /* -- scroll helper ----------------------------------------------------- */

  const scrollIntoView = useCallback(
    (el?: HTMLElement | null) => {
      if (typeof window === 'undefined') return

      const target =
        el ??
        (document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null)
      if (!target) return

      // Recompute "live" — listener state may not have flushed yet on iOS
      const vv = window.visualViewport
      const innerH = window.innerHeight
      const liveOcclusion = vv
        ? Math.max(0, innerH - vv.height - vv.offsetTop)
        : keyboardHeightRef.current

      const rect = target.getBoundingClientRect()
      // Bottom edge of the visible (un-occluded) area
      const visibleBottom = innerH - liveOcclusion - scrollPadding

      if (rect.bottom <= visibleBottom && rect.top >= 0) return // already visible

      const behavior: ScrollBehavior = reducedMotionRef.current ? 'auto' : 'smooth'

      // Prefer the element's own API — scrolls nearest scroll container too
      try {
        target.scrollIntoView({ behavior, block: 'center' })
      } catch {
        // Fallback for older browsers that don't accept the options object
        target.scrollIntoView()
      }
    },
    [scrollPadding]
  )

  /* -- visualViewport listener ------------------------------------------ */

  useEffect(() => {
    if (typeof window === 'undefined') return
    const vv = window.visualViewport
    if (!vv) return // unsupported (very old browsers / Firefox older versions)

    let raf = 0
    const recompute = () => {
      raf = 0
      // iOS Safari shifts the layout viewport up by visualViewport.offsetTop
      // when the keyboard is open; the truly hidden region therefore equals
      // (window.innerHeight − visualViewport.height − visualViewport.offsetTop).
      const occluded = Math.max(
        0,
        window.innerHeight - vv.height - vv.offsetTop
      )
      const open = occluded > threshold

      if (open !== keyboardOpenRef.current) {
        keyboardOpenRef.current = open
        setKeyboardOpen(open)
      }
      if (occluded !== keyboardHeightRef.current) {
        keyboardHeightRef.current = occluded
        setKeyboardHeight(occluded)
      }

      if (open && autoScrollOnOpen) {
        // Defer one frame so layout has settled (iOS).
        window.requestAnimationFrame(() => scrollIntoView())
      }
    }

    const onChange = () => {
      if (raf) return
      raf = window.requestAnimationFrame(recompute)
    }

    // Initial measurement (covers case where keyboard is already open,
    // e.g. user navigates back to a page with focused input).
    recompute()

    vv.addEventListener('resize', onChange)
    vv.addEventListener('scroll', onChange) // iOS keyboard pans the viewport
    window.addEventListener('orientationchange', onChange)

    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      vv.removeEventListener('resize', onChange)
      vv.removeEventListener('scroll', onChange)
      window.removeEventListener('orientationchange', onChange)
    }
  }, [threshold, autoScrollOnOpen, scrollIntoView])

  /* -- focusin: scroll new field into view while keyboard already open --- */

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onFocusIn = (e: FocusEvent) => {
      if (!keyboardOpenRef.current) return
      const t = e.target
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement ||
        (t instanceof HTMLElement && t.isContentEditable)
      ) {
        // Slight delay to let iOS finish repositioning
        window.setTimeout(() => scrollIntoView(t as HTMLElement), 50)
      }
    }
    document.addEventListener('focusin', onFocusIn)
    return () => document.removeEventListener('focusin', onFocusIn)
  }, [scrollIntoView])

  return useMemo(
    () => ({ keyboardOpen, keyboardHeight, scrollIntoView }),
    [keyboardOpen, keyboardHeight, scrollIntoView]
  )
}

/* ==========================================================================
   <KeyboardAwareScrollContainer>
   --------------------------------------------------------------------------
   A scrollable wrapper that automatically pads its bottom by `keyboardHeight`
   (plus `env(safe-area-inset-bottom)`) so the last form field is never hidden.
   ========================================================================== */

export interface KeyboardAwareScrollContainerProps
  extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Forwarded to the underlying useKeyboardAware hook */
  keyboardOptions?: UseKeyboardAwareOptions
  /** Extra base padding (px) added to the bottom even when keyboard is closed */
  basePaddingBottom?: number
}

export const KeyboardAwareScrollContainer = forwardRef(
  function KeyboardAwareScrollContainer(
    {
      children,
      keyboardOptions,
      basePaddingBottom = 0,
      style,
      ...rest
    }: KeyboardAwareScrollContainerProps,
    ref: Ref<HTMLDivElement>
  ) {
    const { keyboardHeight, keyboardOpen } = useKeyboardAware(keyboardOptions)

    // Combine keyboard occlusion with iOS safe-area inset.
    // When the keyboard is open the safe-area is moot (keyboard sits above
    // the home indicator), but we still add a tiny base for breathing room.
    const paddingBottom = keyboardOpen
      ? `${keyboardHeight + basePaddingBottom}px`
      : `calc(env(safe-area-inset-bottom, 0px) + ${basePaddingBottom}px)`

    const mergedStyle: CSSProperties = {
      // Smooth pad transition unless reduced motion (CSS handles that via
      // @media (prefers-reduced-motion)). Keep it short to feel reactive.
      transition: 'padding-bottom 180ms ease-out',
      paddingBottom,
      ...style,
    }

    return createElement(
      'div',
      {
        ref,
        'data-keyboard-open': keyboardOpen ? 'true' : 'false',
        style: mergedStyle,
        ...rest,
      },
      children
    )
  }
)

/* ==========================================================================
   <FormKeyboardAware>
   --------------------------------------------------------------------------
   Higher-order wrapper that renders a <form> inside a
   KeyboardAwareScrollContainer. Drop-in replacement for <form>.
   ========================================================================== */

export interface FormKeyboardAwareProps
  extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode
  /** Container className (the scroll wrapper around the form) */
  containerClassName?: string
  /** Forwarded to useKeyboardAware */
  keyboardOptions?: UseKeyboardAwareOptions
  /** Extra base bottom padding (px) — added on top of safe-area / keyboard */
  basePaddingBottom?: number
}

export const FormKeyboardAware = forwardRef(function FormKeyboardAware(
  {
    children,
    containerClassName,
    keyboardOptions,
    basePaddingBottom = 24,
    ...formProps
  }: FormKeyboardAwareProps,
  ref: Ref<HTMLFormElement>
) {
  return createElement(
    KeyboardAwareScrollContainer,
    {
      className: containerClassName,
      keyboardOptions,
      basePaddingBottom,
      children: createElement('form', { ref, ...formProps, children }),
    }
  )
})

/* ==========================================================================
   DEFAULT EXPORT
   ========================================================================== */

export default useKeyboardAware
