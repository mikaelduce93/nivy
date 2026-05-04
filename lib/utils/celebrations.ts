'use client'

import confetti from 'canvas-confetti'

/* ==========================================================================
   CELEBRATION EFFECTS
   Provides premium celebration animations for achievements, level-ups, etc.
   ========================================================================== */

type CelebrationStyle = 
  | 'confetti' 
  | 'fireworks' 
  | 'stars' 
  | 'snow' 
  | 'hearts'
  | 'coins'
  | 'xp'

interface CelebrationOptions {
  duration?: number
  intensity?: 'low' | 'medium' | 'high'
  colors?: string[]
}

const defaultColors = ['#8b5cf6', '#f43f5e', '#10b981', '#fbbf24', '#06b6d4']

/**
 * Trigger a celebration effect
 */
export function celebrate(style: CelebrationStyle = 'confetti', options: CelebrationOptions = {}) {
  if (typeof window === 'undefined') return

  const { duration = 3000, intensity = 'medium', colors = defaultColors } = options
  
  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  // Trigger haptic feedback if available
  if (navigator.vibrate) {
    navigator.vibrate([50, 50, 50])
  }

  switch (style) {
    case 'confetti':
      triggerConfetti(duration, intensity, colors)
      break
    case 'fireworks':
      triggerFireworks(duration, intensity, colors)
      break
    case 'stars':
      triggerStars(duration, intensity)
      break
    case 'snow':
      triggerSnow(duration)
      break
    case 'hearts':
      triggerHearts(duration, intensity)
      break
    case 'coins':
      triggerCoins(duration, intensity)
      break
    case 'xp':
      triggerXP(duration, intensity)
      break
  }
}

function triggerConfetti(duration: number, intensity: string, colors: string[]) {
  const particleCount = intensity === 'high' ? 150 : intensity === 'medium' ? 100 : 50
  
  confetti({
    particleCount,
    spread: 100,
    origin: { y: 0.6 },
    colors,
    zIndex: 9999,
  })

  if (intensity === 'high') {
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
        zIndex: 9999,
      })
    }, 200)
    
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
        zIndex: 9999,
      })
    }, 400)
  }
}

function triggerFireworks(duration: number, intensity: string, colors: string[]) {
  const count = intensity === 'high' ? 5 : intensity === 'medium' ? 3 : 2
  const interval = duration / count

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const x = 0.2 + Math.random() * 0.6
      const y = 0.3 + Math.random() * 0.3
      
      confetti({
        particleCount: 80,
        spread: 360,
        startVelocity: 30,
        gravity: 0.5,
        origin: { x, y },
        colors,
        zIndex: 9999,
        ticks: 300,
        shapes: ['circle'],
        scalar: 1.2,
      })
    }, i * interval)
  }
}

function triggerStars(duration: number, intensity: string) {
  const count = intensity === 'high' ? 100 : intensity === 'medium' ? 60 : 30
  
  confetti({
    particleCount: count,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#fbbf24', '#fcd34d', '#fef08a'],
    shapes: ['star'],
    zIndex: 9999,
    scalar: 1.5,
  })
}

function triggerSnow(duration: number) {
  const end = Date.now() + duration

  const frame = () => {
    confetti({
      particleCount: 3,
      startVelocity: 0,
      gravity: 0.3,
      drift: Math.random() - 0.5,
      origin: { x: Math.random(), y: -0.1 },
      colors: ['#ffffff', '#e0f2fe', '#bae6fd'],
      shapes: ['circle'],
      scalar: 0.8,
      zIndex: 9999,
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }

  frame()
}

function triggerHearts(duration: number, intensity: string) {
  const count = intensity === 'high' ? 80 : intensity === 'medium' ? 50 : 25
  
  confetti({
    particleCount: count,
    spread: 100,
    origin: { y: 0.7 },
    colors: ['#f43f5e', '#fb7185', '#fda4af'],
    shapes: ['circle'],
    zIndex: 9999,
    scalar: 2,
  })
}

function triggerCoins(duration: number, intensity: string) {
  const count = intensity === 'high' ? 80 : intensity === 'medium' ? 50 : 25
  
  confetti({
    particleCount: count,
    spread: 60,
    origin: { y: 0.5 },
    colors: ['#fbbf24', '#f59e0b', '#d97706'],
    shapes: ['circle'],
    zIndex: 9999,
    gravity: 1.5,
    scalar: 0.8,
  })
}

function triggerXP(duration: number, intensity: string) {
  const count = intensity === 'high' ? 100 : intensity === 'medium' ? 60 : 30
  
  confetti({
    particleCount: count,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#8b5cf6', '#a78bfa', '#c4b5fd'],
    shapes: ['circle', 'square'],
    zIndex: 9999,
    scalar: 1.2,
  })
}

/* ==========================================================================
   LEVEL UP CELEBRATION
   Special celebration for level-ups with staged animations
   ========================================================================== */

export async function celebrateLevelUp(newLevel: number) {
  if (typeof window === 'undefined') return
  
  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  // Stage 1: Initial burst
  confetti({
    particleCount: 100,
    spread: 100,
    origin: { y: 0.6 },
    colors: ['#8b5cf6', '#a78bfa', '#c4b5fd'],
    zIndex: 9999,
  })

  // Stage 2: Side cannons
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#fbbf24', '#f59e0b'],
      zIndex: 9999,
    })
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#fbbf24', '#f59e0b'],
      zIndex: 9999,
    })
  }, 300)

  // Stage 3: Firework burst
  setTimeout(() => {
    confetti({
      particleCount: 150,
      spread: 360,
      startVelocity: 45,
      gravity: 0.8,
      origin: { x: 0.5, y: 0.4 },
      colors: ['#8b5cf6', '#f43f5e', '#10b981', '#fbbf24'],
      zIndex: 9999,
      ticks: 400,
    })
  }, 600)

  // Haptic feedback
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100, 50, 200])
  }
}

/* ==========================================================================
   ACHIEVEMENT UNLOCKED
   Celebration for unlocking achievements/badges
   ========================================================================== */

export function celebrateAchievement(rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common') {
  if (typeof window === 'undefined') return
  
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  const configs = {
    common: { count: 30, colors: ['#71717a', '#a1a1aa'] },
    rare: { count: 60, colors: ['#3b82f6', '#60a5fa'] },
    epic: { count: 100, colors: ['#8b5cf6', '#a78bfa'] },
    legendary: { count: 150, colors: ['#fbbf24', '#f59e0b', '#dc2626'] },
  }

  const config = configs[rarity]

  confetti({
    particleCount: config.count,
    spread: 70,
    origin: { y: 0.6 },
    colors: config.colors,
    shapes: ['star', 'circle'],
    zIndex: 9999,
    scalar: rarity === 'legendary' ? 1.5 : 1,
  })

  if (rarity === 'legendary') {
    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 100,
        startVelocity: 45,
        origin: { y: 0.5 },
        colors: ['#fbbf24', '#f59e0b'],
        shapes: ['star'],
        zIndex: 9999,
        scalar: 2,
      })
    }, 300)
  }

  // Haptic feedback based on rarity
  if (navigator.vibrate) {
    const patterns = {
      common: 50,
      rare: [50, 50, 50],
      epic: [100, 50, 100],
      legendary: [100, 50, 100, 50, 200],
    }
    navigator.vibrate(patterns[rarity])
  }
}

/* ==========================================================================
   STREAK CELEBRATION
   Celebration for maintaining streaks
   ========================================================================== */

export function celebrateStreak(days: number) {
  if (typeof window === 'undefined') return
  
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  const intensity = days >= 30 ? 'high' : days >= 7 ? 'medium' : 'low'
  const colors = ['#f97316', '#fb923c', '#fdba74']

  const count = intensity === 'high' ? 100 : intensity === 'medium' ? 60 : 30

  confetti({
    particleCount: count,
    spread: 70,
    origin: { y: 0.6 },
    colors,
    zIndex: 9999,
  })

  if (navigator.vibrate) {
    navigator.vibrate([50, 30, 50])
  }
}
