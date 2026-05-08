'use client'

/**
 * useLongPress — TICKET-039 (Wave 2)
 * ==================================
 *
 * Returns a `bind` object you spread on any element to detect a long press
 * (touch or mouse). Triggers `onLongPress` after `threshold` ms (default 500;
 * TICKET-039 spec mentions 600 — caller can override). Cancels on:
 *   - pointer up before threshold
 *   - pointer move beyond `moveThreshold` px (so a scroll/drag doesn't fire)
 *   - pointer leave / cancel
 *
 * Also exposes an `onContextMenu` handler that calls `preventDefault()` so
 * native iOS/Android context menus don't fight with our custom one.
 *
 * Usage:
 *   const longPress = useLongPress(() => openMenu(post), { threshold: 500 })
 *   <div {...longPress.bind}>…</div>
 */

import { useCallback, useEffect, useRef } from 'react'

export interface LongPressOptions {
  /** Hold duration in ms before firing. Default 500. */
  threshold?: number
  /** Pixels of movement that cancel the press. Default 10. */
  moveThreshold?: number
  /** Trigger haptic on activation. Default true. */
  haptic?: boolean
  /** Disable the hook. Default false. */
  disabled?: boolean
}

export interface LongPressBind {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerLeave: (e: React.PointerEvent) => void
  onPointerCancel: (e: React.PointerEvent) => void
  onContextMenu: (e: React.MouseEvent) => void
}

export interface UseLongPressReturn {
  bind: LongPressBind
  /** True while the press is being measured (useful for visual feedback). */
  isPressing: () => boolean
  /** Imperatively cancel an in-flight press. */
  cancel: () => void
}

export function useLongPress(
  onLongPress: (event: React.PointerEvent | React.MouseEvent) => void,
  options: LongPressOptions = {}
): UseLongPressReturn {
  const { threshold = 500, moveThreshold = 10, haptic = true, disabled = false } = options

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const firedRef = useRef(false)
  const pressingRef = useRef(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    clearTimer()
    startPosRef.current = null
    firedRef.current = false
    pressingRef.current = false
  }, [clearTimer])

  // Cleanup on unmount.
  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return
      // Only primary button (left click / first touch / pen tip).
      if (e.button !== 0 && e.button !== undefined) return

      firedRef.current = false
      pressingRef.current = true
      startPosRef.current = { x: e.clientX, y: e.clientY }

      clearTimer()
      timerRef.current = setTimeout(() => {
        if (!pressingRef.current) return
        firedRef.current = true
        if (haptic && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(30)
          } catch {
            /* ignore */
          }
        }
        onLongPress(e)
      }, threshold)
    },
    [clearTimer, disabled, haptic, onLongPress, threshold]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pressingRef.current || !startPosRef.current) return
      const dx = e.clientX - startPosRef.current.x
      const dy = e.clientY - startPosRef.current.y
      if (Math.hypot(dx, dy) > moveThreshold) {
        cancel()
      }
    },
    [cancel, moveThreshold]
  )

  const onPointerUp = useCallback(() => {
    cancel()
  }, [cancel])

  const onPointerLeave = useCallback(() => {
    cancel()
  }, [cancel])

  const onPointerCancel = useCallback(() => {
    cancel()
  }, [cancel])

  // Block native context menu so our custom one wins.
  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      // If our long-press already fired, eat the synthesized contextmenu.
      // Otherwise also call the handler so right-click works on desktop.
      if (firedRef.current) {
        e.preventDefault()
        return
      }
      e.preventDefault()
      if (!disabled) onLongPress(e)
    },
    [disabled, onLongPress]
  )

  return {
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerLeave,
      onPointerCancel,
      onContextMenu,
    },
    isPressing: () => pressingRef.current,
    cancel,
  }
}

export default useLongPress
