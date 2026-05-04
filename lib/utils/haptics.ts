/**
 * Haptic Feedback Utilities
 * =========================
 * 
 * Provides haptic feedback for mobile devices.
 * Uses the Vibration API (Android) and Web Haptics (iOS Safari).
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection'

// Vibration patterns (in milliseconds)
const vibrationPatterns: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  warning: [25, 50, 25],
  error: [50, 100, 50],
  selection: 5,
}

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'vibrate' in navigator || 'ontouchstart' in window
}

/**
 * Trigger haptic feedback
 */
export function triggerHaptic(style: HapticStyle = 'light'): void {
  if (typeof window === 'undefined') return
  
  // Check user preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }
  
  // Try Vibration API (Android, some browsers)
  if ('vibrate' in navigator) {
    const pattern = vibrationPatterns[style]
    navigator.vibrate(pattern)
    return
  }
  
  // iOS doesn't support Vibration API, but Safari 16+ has experimental haptics
  // For now, we rely on CSS :active states for iOS feedback
}

/**
 * React hook for haptic feedback
 */
export function useHaptic() {
  const supported = isHapticSupported()
  
  const trigger = (style: HapticStyle = 'light') => {
    if (supported) {
      triggerHaptic(style)
    }
  }
  
  return {
    supported,
    trigger,
    light: () => trigger('light'),
    medium: () => trigger('medium'),
    heavy: () => trigger('heavy'),
    success: () => trigger('success'),
    warning: () => trigger('warning'),
    error: () => trigger('error'),
    selection: () => trigger('selection'),
  }
}

/**
 * Wrapper function to add haptic feedback to event handlers
 */
export function withHaptic<T extends (...args: unknown[]) => void>(
  handler: T,
  style: HapticStyle = 'light'
): T {
  return ((...args: unknown[]) => {
    triggerHaptic(style)
    return handler(...args)
  }) as T
}
