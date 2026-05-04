'use client'

/* ==========================================================================
   TOUCH-OPTIMIZED INTERACTIONS HOOK
   
   Provides touch-first interactions that gracefully degrade for mouse users.
   Replaces hover-based interactions with touch-optimized versions.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react'

/* ==========================================================================
   TYPES
   ========================================================================== */

export interface TouchState {
  isTouchDevice: boolean
  isTouching: boolean
  touchStartPosition: { x: number; y: number } | null
  swipeDirection: 'left' | 'right' | 'up' | 'down' | null
}

export interface UseTouchOptimizedOptions {
  /** Minimum swipe distance to register (px) */
  swipeThreshold?: number
  /** Enable haptic feedback on touch */
  hapticFeedback?: boolean
  /** Long press duration (ms) */
  longPressDuration?: number
}

export interface UseTouchOptimizedReturn {
  /** Whether the device supports touch */
  isTouchDevice: boolean
  /** Whether user is currently touching */
  isTouching: boolean
  /** Props to spread on touchable elements */
  touchProps: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
    onTouchCancel: () => void
  }
  /** Current swipe direction (if any) */
  swipeDirection: 'left' | 'right' | 'up' | 'down' | null
  /** Reset touch state */
  reset: () => void
}

/* ==========================================================================
   MAIN HOOK
   ========================================================================== */

/**
 * Hook for touch-optimized interactions
 * 
 * @param options - Configuration options
 * @param onSwipe - Callback when swipe is detected
 * @param onLongPress - Callback for long press
 * @returns Touch state and handlers
 */
export function useTouchOptimized(
  options: UseTouchOptimizedOptions = {},
  onSwipe?: (direction: 'left' | 'right' | 'up' | 'down') => void,
  onLongPress?: () => void
): UseTouchOptimizedReturn {
  const {
    swipeThreshold = 50,
    hapticFeedback = true,
    longPressDuration = 500,
  } = options
  
  const [state, setState] = useState<TouchState>({
    isTouchDevice: false,
    isTouching: false,
    touchStartPosition: null,
    swipeDirection: null,
  })
  
  const longPressTimerRef = useRef<NodeJS.Timeout>()
  
  // Detect touch device on mount
  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    setState(prev => ({ ...prev, isTouchDevice }))
  }, [])
  
  // Trigger haptic feedback if available
  const triggerHaptic = useCallback(() => {
    if (!hapticFeedback) return
    
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
  }, [hapticFeedback])
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    
    setState(prev => ({
      ...prev,
      isTouching: true,
      touchStartPosition: { x: touch.clientX, y: touch.clientY },
      swipeDirection: null,
    }))
    
    triggerHaptic()
    
    // Start long press timer
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        onLongPress()
        triggerHaptic()
      }, longPressDuration)
    }
  }, [triggerHaptic, onLongPress, longPressDuration])
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!state.touchStartPosition) return
    
    const touch = e.touches[0]
    const deltaX = touch.clientX - state.touchStartPosition.x
    const deltaY = touch.clientY - state.touchStartPosition.y
    
    // Cancel long press if moved too much
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
    
    // Determine swipe direction
    if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
      let direction: 'left' | 'right' | 'up' | 'down'
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left'
      } else {
        direction = deltaY > 0 ? 'down' : 'up'
      }
      
      setState(prev => ({ ...prev, swipeDirection: direction }))
    }
  }, [state.touchStartPosition, swipeThreshold])
  
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
    }
    
    // Trigger swipe callback
    if (state.swipeDirection && onSwipe) {
      onSwipe(state.swipeDirection)
      triggerHaptic()
    }
    
    setState(prev => ({
      ...prev,
      isTouching: false,
      touchStartPosition: null,
      swipeDirection: null,
    }))
  }, [state.swipeDirection, onSwipe, triggerHaptic])
  
  const handleTouchCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
    }
    
    setState(prev => ({
      ...prev,
      isTouching: false,
      touchStartPosition: null,
      swipeDirection: null,
    }))
  }, [])
  
  const reset = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
    }
    
    setState({
      isTouchDevice: state.isTouchDevice,
      isTouching: false,
      touchStartPosition: null,
      swipeDirection: null,
    })
  }, [state.isTouchDevice])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [])
  
  return {
    isTouchDevice: state.isTouchDevice,
    isTouching: state.isTouching,
    swipeDirection: state.swipeDirection,
    touchProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
    reset,
  }
}

/* ==========================================================================
   TAP FEEDBACK HOOK
   ========================================================================== */

/**
 * Simple tap feedback hook for touch devices
 * Returns isTapped state that can be used for visual feedback
 */
export function useTapFeedback() {
  const [isTapped, setIsTapped] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  const handleTouchStart = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsTapped(true)
  }, [])
  
  const handleTouchEnd = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsTapped(false)
    }, 150)
  }, [])
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
  
  return {
    isTapped,
    tapProps: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: () => setIsTapped(false),
    },
  }
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export default useTouchOptimized
