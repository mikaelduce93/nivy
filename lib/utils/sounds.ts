/**
 * Sound Effects Utilities
 * =======================
 * 
 * Provides optional sound effects for gamification events.
 * Sounds are toggled via user preferences.
 */

type SoundEffect = 'xp_gain' | 'level_up' | 'achievement' | 'click' | 'success' | 'error' | 'notification'

// Sound file paths (would need actual audio files)
const soundPaths: Record<SoundEffect, string> = {
  xp_gain: '/sounds/xp-gain.mp3',
  level_up: '/sounds/level-up.mp3',
  achievement: '/sounds/achievement.mp3',
  click: '/sounds/click.mp3',
  success: '/sounds/success.mp3',
  error: '/sounds/error.mp3',
  notification: '/sounds/notification.mp3',
}

// Audio cache
const audioCache = new Map<string, HTMLAudioElement>()

// Storage key for sound preference
const SOUND_PREFERENCE_KEY = 'teen-app-sounds-enabled'

/**
 * Check if sounds are enabled by user
 */
export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(SOUND_PREFERENCE_KEY) !== 'false'
  } catch {
    return true
  }
}

/**
 * Set sound preference
 */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SOUND_PREFERENCE_KEY, enabled ? 'true' : 'false')
  } catch {
    // Storage not available
  }
}

/**
 * Preload a sound effect
 */
export function preloadSound(effect: SoundEffect): void {
  if (typeof window === 'undefined') return
  
  const path = soundPaths[effect]
  if (audioCache.has(path)) return
  
  try {
    const audio = new Audio(path)
    audio.preload = 'auto'
    audioCache.set(path, audio)
  } catch {
    // Audio not supported
  }
}

/**
 * Play a sound effect
 */
export function playSound(effect: SoundEffect, volume: number = 0.5): void {
  if (typeof window === 'undefined') return
  if (!isSoundEnabled()) return
  
  // Respect reduced motion preference for audio too
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }
  
  const path = soundPaths[effect]
  
  try {
    let audio = audioCache.get(path)
    
    if (!audio) {
      audio = new Audio(path)
      audioCache.set(path, audio)
    }
    
    audio.volume = Math.max(0, Math.min(1, volume))
    audio.currentTime = 0
    audio.play().catch(() => {
      // Autoplay blocked or audio file missing
    })
  } catch {
    // Audio playback failed
  }
}

/**
 * React hook for sound effects
 */
export function useSounds() {
  const enabled = isSoundEnabled()
  
  const play = (effect: SoundEffect, volume?: number) => {
    playSound(effect, volume)
  }
  
  return {
    enabled,
    setEnabled: setSoundEnabled,
    play,
    xpGain: () => play('xp_gain'),
    levelUp: () => play('level_up'),
    achievement: () => play('achievement'),
    click: () => play('click'),
    success: () => play('success'),
    error: () => play('error'),
    notification: () => play('notification'),
  }
}
