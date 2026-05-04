'use client'

import { useCallback } from 'react'

type HapticType = 'success' | 'warning' | 'error' | 'light' | 'medium' | 'heavy' | 'selection'

export function useHaptic() {
  const trigger = useCallback((type: HapticType = 'medium') => {
    // Check if navigator and vibration API are available
    if (typeof navigator === 'undefined' || !navigator.vibrate) {
      return
    }

    try {
      switch (type) {
        case 'success':
          // Two quick pulses
          navigator.vibrate([50, 30, 50])
          break
        case 'warning':
          // Long pulse
          navigator.vibrate(200)
          break
        case 'error':
          // Three quick pulses
          navigator.vibrate([50, 30, 50, 30, 50])
          break
        case 'light':
          navigator.vibrate(10)
          break
        case 'medium':
          navigator.vibrate(20)
          break
        case 'heavy':
          navigator.vibrate(40)
          break
        case 'selection':
          navigator.vibrate(15)
          break
        default:
          navigator.vibrate(20)
      }
    } catch (e) {
      // Ignore errors if vibration fails or is not supported
      console.debug('Haptic feedback failed', e)
    }
  }, [])

  return { trigger }
}

