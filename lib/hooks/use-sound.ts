'use client'

import { useCallback, useEffect, useState } from 'react'
import { getSoundManager, useSoundManager as useRealSoundManager, type SoundEffect } from '@/lib/sounds/sound-manager'

// Re-export useSoundManager from sound-manager.ts for convenience
export { useSoundManager } from '@/lib/sounds/sound-manager'

// Legacy hook for backwards compatibility
type SoundType = 'success' | 'error' | 'click' | 'hover' | 'notification' | 'coin' | 'pop' | 'whoosh'

// Map legacy types to new sound effects
const soundTypeMap: Record<SoundType, SoundEffect> = {
  success: 'success',
  error: 'error',
  click: 'click',
  hover: 'hover',
  notification: 'notification',
  coin: 'coin',
  pop: 'pop',
  whoosh: 'whoosh',
}

export function useSound() {
  const manager = useRealSoundManager()
  
  const play = useCallback((type: SoundType, volume = 0.5) => {
    const effect = soundTypeMap[type]
    if (effect) {
      manager.play(effect, { volume })
    }
  }, [manager])

  return {
    // Expose manager methods first; the legacy `play(type, volume)` takes
    // precedence afterwards for backwards compatibility.
    ...manager,
    play,
  }
}

