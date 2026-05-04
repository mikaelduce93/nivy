'use client'

import { useCallback, useRef, useMemo } from 'react'
import { useHaptic, type HapticStyle } from '@/lib/utils/haptics'
import { useSoundManager, type SoundEffect } from '@/lib/sounds/sound-manager'

/* ==========================================================================
   USE ELITE INTERACTION - Silicon Valley Grade
   
   Combined hook for premium micro-interactions:
   - Synchronized sound + haptic feedback
   - Debounced interactions to prevent spam
   - Contextual feedback patterns
   - Reduced motion respect
   ========================================================================== */

export type InteractionType = 
  | 'click'
  | 'hover'
  | 'success'
  | 'error'
  | 'warning'
  | 'toggle'
  | 'open'
  | 'close'
  | 'xp'
  | 'levelUp'
  | 'achievement'
  | 'notification'
  | 'celebration'
  | 'coin'
  | 'pop'

// Mapping of interaction types to sounds and haptics
const interactionConfig: Record<InteractionType, { sound: SoundEffect; haptic: HapticStyle; cooldown?: number }> = {
  click: { sound: 'click', haptic: 'light', cooldown: 50 },
  hover: { sound: 'hover', haptic: 'selection', cooldown: 100 },
  success: { sound: 'success', haptic: 'success', cooldown: 200 },
  error: { sound: 'error', haptic: 'error', cooldown: 200 },
  warning: { sound: 'warning', haptic: 'warning', cooldown: 200 },
  toggle: { sound: 'toggle', haptic: 'light', cooldown: 100 },
  open: { sound: 'open', haptic: 'medium', cooldown: 150 },
  close: { sound: 'close', haptic: 'light', cooldown: 150 },
  xp: { sound: 'xp_gain', haptic: 'medium', cooldown: 100 },
  levelUp: { sound: 'level_up', haptic: 'heavy', cooldown: 1000 },
  achievement: { sound: 'achievement', haptic: 'success', cooldown: 500 },
  notification: { sound: 'notification', haptic: 'medium', cooldown: 200 },
  celebration: { sound: 'celebration', haptic: 'heavy', cooldown: 500 },
  coin: { sound: 'coin', haptic: 'light', cooldown: 50 },
  pop: { sound: 'pop', haptic: 'light', cooldown: 30 },
}

interface UseEliteInteractionOptions {
  /** Disable sound effects */
  muted?: boolean
  /** Disable haptic feedback */
  noHaptics?: boolean
  /** Custom volume multiplier (0-1) */
  volumeMultiplier?: number
}

export function useEliteInteraction(options: UseEliteInteractionOptions = {}) {
  const { muted = false, noHaptics = false, volumeMultiplier = 1 } = options
  
  const haptic = useHaptic()
  const sound = useSoundManager()
  const lastTriggerTime = useRef<Record<string, number>>({})

  // Trigger a specific interaction with sound + haptic
  const trigger = useCallback((type: InteractionType) => {
    const config = interactionConfig[type]
    if (!config) return

    // Debounce check
    const now = Date.now()
    const lastTime = lastTriggerTime.current[type] || 0
    if (config.cooldown && now - lastTime < config.cooldown) {
      return
    }
    lastTriggerTime.current[type] = now

    // Trigger haptic
    if (!noHaptics && haptic.supported) {
      haptic.trigger(config.haptic)
    }

    // Trigger sound
    if (!muted && sound.enabled) {
      sound.play(config.sound, { volume: volumeMultiplier })
    }
  }, [haptic, sound, muted, noHaptics, volumeMultiplier])

  // Create onClick handler with interaction
  const withClick = useCallback(<T extends (...args: any[]) => any>(handler?: T) => {
    return (...args: Parameters<T>) => {
      trigger('click')
      return handler?.(...args)
    }
  }, [trigger])

  // Create onHover handler
  const withHover = useCallback(<T extends (...args: any[]) => any>(handler?: T) => {
    return (...args: Parameters<T>) => {
      trigger('hover')
      return handler?.(...args)
    }
  }, [trigger])

  // Memoized quick triggers
  const quickTriggers = useMemo(() => ({
    click: () => trigger('click'),
    hover: () => trigger('hover'),
    success: () => trigger('success'),
    error: () => trigger('error'),
    warning: () => trigger('warning'),
    toggle: () => trigger('toggle'),
    open: () => trigger('open'),
    close: () => trigger('close'),
    xp: () => trigger('xp'),
    levelUp: () => trigger('levelUp'),
    achievement: () => trigger('achievement'),
    notification: () => trigger('notification'),
    celebration: () => trigger('celebration'),
    coin: () => trigger('coin'),
    pop: () => trigger('pop'),
  }), [trigger])

  return {
    trigger,
    withClick,
    withHover,
    ...quickTriggers,
    // Settings
    hapticSupported: haptic.supported,
    soundEnabled: sound.enabled,
  }
}

/* ==========================================================================
   CELEBRATION TRIGGER - Complex celebration with multiple effects
   ========================================================================== */

export function useCelebration() {
  const interaction = useEliteInteraction()

  const celebrate = useCallback((type: 'xp' | 'levelUp' | 'achievement' | 'basic' = 'basic') => {
    switch (type) {
      case 'levelUp':
        interaction.levelUp()
        break
      case 'achievement':
        interaction.achievement()
        break
      case 'xp':
        interaction.xp()
        break
      default:
        interaction.celebration()
    }
  }, [interaction])

  return { celebrate }
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export { interactionConfig }
export type { HapticStyle }
