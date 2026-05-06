'use client'

/* ==========================================================================
   SOUND MANAGER - Silicon Valley Grade
   
   Premium audio experience system:
   - Centralized sound management
   - Web Audio API for precise control
   - Spatial audio support
   - User preference persistence
   - Preload critical sounds
   - Reduced motion respect
   - Volume/mute controls
   - Sound categories with individual volumes
   ========================================================================== */

// Sound effect types organized by category
export type SoundCategory = 'ui' | 'gamification' | 'notification' | 'ambient'

export type SoundEffect = 
  // UI Sounds
  | 'click'
  | 'hover'
  | 'toggle'
  | 'open'
  | 'close'
  | 'slide'
  | 'pop'
  | 'whoosh'
  // Gamification
  | 'xp_gain'
  | 'level_up'
  | 'achievement'
  | 'badge_unlock'
  | 'streak'
  | 'coin'
  | 'quest_complete'
  | 'combo'
  // Notifications
  | 'notification'
  | 'message'
  | 'mention'
  | 'alert'
  // Feedback
  | 'success'
  | 'error'
  | 'warning'
  // Special
  | 'celebration'
  | 'fanfare'
  | 'magic'

// Sound configuration
interface SoundConfig {
  path: string
  volume: number
  category: SoundCategory
  preload: boolean
  sprite?: { start: number; end: number }[] // For sprite sheets
}

// Sound definitions with fallbacks
const SOUND_CONFIGS: Record<SoundEffect, SoundConfig> = {
  // UI Sounds - subtle, minimal
  click: { path: '/sounds/click.wav', volume: 0.3, category: 'ui', preload: true },
  hover: { path: '/sounds/hover.wav', volume: 0.15, category: 'ui', preload: true },
  toggle: { path: '/sounds/toggle.wav', volume: 0.25, category: 'ui', preload: true },
  open: { path: '/sounds/open.wav', volume: 0.3, category: 'ui', preload: false },
  close: { path: '/sounds/close.wav', volume: 0.25, category: 'ui', preload: false },
  slide: { path: '/sounds/slide.wav', volume: 0.2, category: 'ui', preload: false },
  pop: { path: '/sounds/pop.wav', volume: 0.35, category: 'ui', preload: true },
  whoosh: { path: '/sounds/whoosh.wav', volume: 0.3, category: 'ui', preload: false },
  
  // Gamification - more prominent
  xp_gain: { path: '/sounds/xp-gain.wav', volume: 0.4, category: 'gamification', preload: true },
  level_up: { path: '/sounds/level-up.wav', volume: 0.6, category: 'gamification', preload: true },
  achievement: { path: '/sounds/achievement.wav', volume: 0.55, category: 'gamification', preload: true },
  badge_unlock: { path: '/sounds/badge-unlock.wav', volume: 0.5, category: 'gamification', preload: false },
  streak: { path: '/sounds/streak.wav', volume: 0.5, category: 'gamification', preload: true },
  coin: { path: '/sounds/coin.wav', volume: 0.45, category: 'gamification', preload: true },
  quest_complete: { path: '/sounds/quest-complete.wav', volume: 0.55, category: 'gamification', preload: false },
  combo: { path: '/sounds/combo.wav', volume: 0.5, category: 'gamification', preload: false },
  
  // Notifications
  notification: { path: '/sounds/notification.wav', volume: 0.5, category: 'notification', preload: true },
  message: { path: '/sounds/message.wav', volume: 0.45, category: 'notification', preload: false },
  mention: { path: '/sounds/mention.wav', volume: 0.5, category: 'notification', preload: false },
  alert: { path: '/sounds/alert.wav', volume: 0.55, category: 'notification', preload: false },
  
  // Feedback
  success: { path: '/sounds/success.wav', volume: 0.45, category: 'ui', preload: true },
  error: { path: '/sounds/error.wav', volume: 0.4, category: 'ui', preload: true },
  warning: { path: '/sounds/warning.wav', volume: 0.4, category: 'ui', preload: false },
  
  // Special effects
  celebration: { path: '/sounds/celebration.wav', volume: 0.6, category: 'gamification', preload: false },
  fanfare: { path: '/sounds/fanfare.wav', volume: 0.55, category: 'gamification', preload: false },
  magic: { path: '/sounds/magic.wav', volume: 0.45, category: 'gamification', preload: false },
}

// Storage keys
const STORAGE_KEYS = {
  enabled: 'tpm-sounds-enabled',
  masterVolume: 'tpm-sounds-master-volume',
  categoryVolumes: 'tpm-sounds-category-volumes',
}

// Default category volumes
const DEFAULT_CATEGORY_VOLUMES: Record<SoundCategory, number> = {
  ui: 0.7,
  gamification: 1.0,
  notification: 0.9,
  ambient: 0.5,
}

/* ==========================================================================
   SOUND MANAGER CLASS
   ========================================================================== */

class SoundManager {
  private audioContext: AudioContext | null = null
  private audioCache: Map<string, AudioBuffer> = new Map()
  private loadingPromises: Map<string, Promise<AudioBuffer | null>> = new Map()
  private enabled: boolean = true
  private masterVolume: number = 0.8
  private categoryVolumes: Record<SoundCategory, number> = { ...DEFAULT_CATEGORY_VOLUMES }
  private initialized: boolean = false
  private reducedMotion: boolean = false

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadPreferences()
      this.checkReducedMotion()
      this.preloadCriticalSounds()
    }
  }

  /* --------------------------------------------------------------------------
     Initialization
     -------------------------------------------------------------------------- */

  private async initAudioContext(): Promise<void> {
    if (this.audioContext) return
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext!)()
      
      // Resume context on user interaction if suspended
      if (this.audioContext.state === 'suspended') {
        const resume = () => {
          this.audioContext?.resume()
          document.removeEventListener('click', resume)
          document.removeEventListener('touchstart', resume)
        }
        document.addEventListener('click', resume, { once: true })
        document.addEventListener('touchstart', resume, { once: true })
      }
      
      this.initialized = true
    } catch {
      console.debug('Web Audio API not supported')
    }
  }

  private checkReducedMotion(): void {
    if (typeof window === 'undefined') return
    
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.reducedMotion = mediaQuery.matches
    
    mediaQuery.addEventListener('change', (e) => {
      this.reducedMotion = e.matches
    })
  }

  /* --------------------------------------------------------------------------
     Preferences
     -------------------------------------------------------------------------- */

  private loadPreferences(): void {
    try {
      const enabled = localStorage.getItem(STORAGE_KEYS.enabled)
      if (enabled !== null) {
        this.enabled = enabled === 'true'
      }
      
      const masterVolume = localStorage.getItem(STORAGE_KEYS.masterVolume)
      if (masterVolume !== null) {
        this.masterVolume = parseFloat(masterVolume)
      }
      
      const categoryVolumes = localStorage.getItem(STORAGE_KEYS.categoryVolumes)
      if (categoryVolumes) {
        this.categoryVolumes = { ...DEFAULT_CATEGORY_VOLUMES, ...JSON.parse(categoryVolumes) }
      }
    } catch {
      // Storage not available
    }
  }

  private savePreferences(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.enabled, this.enabled.toString())
      localStorage.setItem(STORAGE_KEYS.masterVolume, this.masterVolume.toString())
      localStorage.setItem(STORAGE_KEYS.categoryVolumes, JSON.stringify(this.categoryVolumes))
    } catch {
      // Storage not available
    }
  }

  /* --------------------------------------------------------------------------
     Sound Loading
     -------------------------------------------------------------------------- */

  private async loadSound(effect: SoundEffect): Promise<AudioBuffer | null> {
    const config = SOUND_CONFIGS[effect]
    if (!config) return null
    
    // Check cache
    if (this.audioCache.has(config.path)) {
      return this.audioCache.get(config.path)!
    }
    
    // Check if already loading
    if (this.loadingPromises.has(config.path)) {
      return this.loadingPromises.get(config.path)!
    }
    
    // Start loading
    const loadPromise = this.fetchAndDecodeAudio(config.path)
    this.loadingPromises.set(config.path, loadPromise)
    
    const buffer = await loadPromise
    this.loadingPromises.delete(config.path)
    
    if (buffer) {
      this.audioCache.set(config.path, buffer)
    }
    
    return buffer
  }

  private async fetchAndDecodeAudio(path: string): Promise<AudioBuffer | null> {
    await this.initAudioContext()
    if (!this.audioContext) return null
    
    try {
      const response = await fetch(path)
      if (!response.ok) return null
      
      const arrayBuffer = await response.arrayBuffer()
      return await this.audioContext.decodeAudioData(arrayBuffer)
    } catch {
      // Sound file not found or failed to decode
      return null
    }
  }

  private async preloadCriticalSounds(): Promise<void> {
    const criticalSounds = Object.entries(SOUND_CONFIGS)
      .filter(([_, config]) => config.preload)
      .map(([effect]) => effect as SoundEffect)
    
    // Preload in parallel
    await Promise.all(criticalSounds.map(effect => this.loadSound(effect)))
  }

  /* --------------------------------------------------------------------------
     Playback
     -------------------------------------------------------------------------- */

  async play(effect: SoundEffect, options: { volume?: number; rate?: number } = {}): Promise<void> {
    if (!this.enabled) return
    if (this.reducedMotion) return
    if (typeof window === 'undefined') return
    
    const config = SOUND_CONFIGS[effect]
    if (!config) return
    
    await this.initAudioContext()
    if (!this.audioContext) return
    
    const buffer = await this.loadSound(effect)
    if (!buffer) return
    
    try {
      // Create source
      const source = this.audioContext.createBufferSource()
      source.buffer = buffer
      
      // Create gain node for volume control
      const gainNode = this.audioContext.createGain()
      const finalVolume = (options.volume ?? config.volume) 
        * this.masterVolume 
        * this.categoryVolumes[config.category]
      gainNode.gain.value = Math.max(0, Math.min(1, finalVolume))
      
      // Playback rate (for pitch variation)
      source.playbackRate.value = options.rate ?? 1
      
      // Connect and play
      source.connect(gainNode)
      gainNode.connect(this.audioContext.destination)
      source.start(0)
    } catch {
      // Playback failed
    }
  }

  /* --------------------------------------------------------------------------
     Public API
     -------------------------------------------------------------------------- */

  // Enable/disable sounds
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    this.savePreferences()
  }

  isEnabled(): boolean {
    return this.enabled
  }

  // Master volume (0-1)
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))
    this.savePreferences()
  }

  getMasterVolume(): number {
    return this.masterVolume
  }

  // Category volumes (0-1)
  setCategoryVolume(category: SoundCategory, volume: number): void {
    this.categoryVolumes[category] = Math.max(0, Math.min(1, volume))
    this.savePreferences()
  }

  getCategoryVolume(category: SoundCategory): number {
    return this.categoryVolumes[category]
  }

  // Preload specific sounds
  preload(...effects: SoundEffect[]): void {
    effects.forEach(effect => this.loadSound(effect))
  }

  // Quick play methods
  click(): void { this.play('click') }
  hover(): void { this.play('hover', { volume: 0.15 }) }
  success(): void { this.play('success') }
  error(): void { this.play('error') }
  notification(): void { this.play('notification') }
  xpGain(): void { this.play('xp_gain') }
  levelUp(): void { this.play('level_up') }
  achievement(): void { this.play('achievement') }
  coin(): void { this.play('coin') }
  celebration(): void { this.play('celebration') }
  pop(): void { this.play('pop') }
}

/* ==========================================================================
   SINGLETON INSTANCE
   ========================================================================== */

let soundManagerInstance: SoundManager | null = null

export function getSoundManager(): SoundManager {
  if (!soundManagerInstance) {
    soundManagerInstance = new SoundManager()
  }
  return soundManagerInstance
}

/* ==========================================================================
   REACT HOOK
   ========================================================================== */

import { useCallback, useEffect, useState } from 'react'

export function useSoundManager() {
  const [enabled, setEnabledState] = useState(true)
  const [masterVolume, setMasterVolumeState] = useState(0.8)
  const manager = getSoundManager()

  useEffect(() => {
    setEnabledState(manager.isEnabled())
    setMasterVolumeState(manager.getMasterVolume())
  }, [manager])

  const setEnabled = useCallback((value: boolean) => {
    manager.setEnabled(value)
    setEnabledState(value)
  }, [manager])

  const setMasterVolume = useCallback((value: number) => {
    manager.setMasterVolume(value)
    setMasterVolumeState(value)
  }, [manager])

  const play = useCallback((effect: SoundEffect, options?: { volume?: number; rate?: number }) => {
    manager.play(effect, options)
  }, [manager])

  return {
    enabled,
    setEnabled,
    masterVolume,
    setMasterVolume,
    play,
    // Quick methods
    click: () => manager.click(),
    hover: () => manager.hover(),
    success: () => manager.success(),
    error: () => manager.error(),
    notification: () => manager.notification(),
    xpGain: () => manager.xpGain(),
    levelUp: () => manager.levelUp(),
    achievement: () => manager.achievement(),
    coin: () => manager.coin(),
    celebration: () => manager.celebration(),
    pop: () => manager.pop(),
  }
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export { SOUND_CONFIGS, STORAGE_KEYS, DEFAULT_CATEGORY_VOLUMES }
export type { SoundConfig }
