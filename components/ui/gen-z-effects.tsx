"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

// ============================================================================
// GEN-Z VISUAL EFFECTS
// Grain, glow, gradients, and other visual flourishes
// ============================================================================

// ============================================================================
// GRAIN OVERLAY
// ============================================================================

interface GrainOverlayProps {
  opacity?: number
  className?: string
}

/**
 * Adds a subtle film grain texture overlay
 */
export function GrainOverlay({ opacity = 0.03, className }: GrainOverlayProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-50",
        className
      )}
      style={{
        opacity,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        mixBlendMode: "overlay"
      }}
    />
  )
}

// ============================================================================
// GLOW EFFECTS
// ============================================================================

interface GlowBlobProps {
  color?: string
  size?: number
  blur?: number
  className?: string
  animate?: boolean
}

/**
 * Ambient glow blob for backgrounds
 */
export function GlowBlob({
  color = "var(--gen-z-lavender)",
  size = 400,
  blur = 60, // Reduced from 120 for better performance
  className,
  animate = true
}: GlowBlobProps) {
  return (
    <motion.div
      className={cn(
        "absolute rounded-full pointer-events-none will-change-transform",
        className
      )}
      style={{
        width: size,
        height: size,
        background: color,
        filter: `blur(${blur / 2}px)`,
        opacity: 0.3,
        willChange: "transform, opacity"
      }}
      animate={animate ? {
        scale: [1, 1.1, 1],
        opacity: [0.3, 0.5, 0.3]
      } : undefined}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  )
}

interface MeshGradientProps {
  className?: string
}

/**
 * Gen-Z mesh gradient background
 */
export function MeshGradient({ className }: MeshGradientProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      <GlowBlob 
        color="var(--gen-z-lavender)" 
        className="top-[-20%] left-[-10%]" 
        size={600}
      />
      <GlowBlob 
        color="var(--gen-z-coral)" 
        className="top-[10%] right-[-20%]" 
        size={500}
        blur={100}
      />
      <GlowBlob 
        color="var(--gen-z-mint)" 
        className="bottom-[-10%] left-[20%]" 
        size={450}
        blur={140}
      />
      <GlowBlob 
        color="var(--gen-z-peach)" 
        className="bottom-[20%] right-[10%]" 
        size={350}
        blur={100}
      />
    </div>
  )
}

interface GlowRingProps {
  color?: string
  size?: number
  thickness?: number
  className?: string
  animate?: boolean
}

/**
 * Animated glow ring effect
 */
export function GlowRing({
  color = "var(--primary)",
  size = 200,
  thickness = 2,
  className,
  animate = true
}: GlowRingProps) {
  return (
    <motion.div
      className={cn(
        "absolute rounded-full pointer-events-none",
        className
      )}
      style={{
        width: size,
        height: size,
        border: `${thickness}px solid ${color}`,
        boxShadow: `
          0 0 20px ${color},
          0 0 40px ${color},
          inset 0 0 20px ${color}
        `,
        opacity: 0.6
      }}
      animate={animate ? {
        scale: [1, 1.05, 1],
        opacity: [0.4, 0.7, 0.4]
      } : undefined}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  )
}

// ============================================================================
// HOLOGRAPHIC EFFECTS
// ============================================================================

interface HolographicBadgeProps {
  children: React.ReactNode
  className?: string
  rarity?: "common" | "rare" | "epic" | "legendary"
}

/**
 * Holographic badge effect for achievements
 */
export function HolographicBadge({ 
  children, 
  className,
  rarity = "common"
}: HolographicBadgeProps) {
  const rarityStyles = {
    common: "from-slate-300 via-slate-400 to-slate-300",
    rare: "from-blue-400 via-cyan-300 to-blue-400",
    epic: "from-purple-400 via-pink-300 to-purple-400",
    legendary: "from-yellow-400 via-orange-300 to-yellow-400"
  }

  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-2xl p-[2px]",
        "bg-gradient-to-r bg-[length:200%_100%]",
        rarityStyles[rarity],
        className
      )}
      animate={{
        backgroundPosition: ["0% 0%", "200% 0%"]
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "linear"
      }}
    >
      <div className="relative bg-card rounded-[14px] p-4">
        {children}
        {/* Shimmer overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          style={{ transform: "skewX(-20deg)" }}
          animate={{
            x: ["-200%", "200%"]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            ease: "easeInOut"
          }}
        />
      </div>
    </motion.div>
  )
}

// ============================================================================
// PARTICLE EFFECTS
// ============================================================================

interface ParticleFieldProps {
  count?: number
  color?: string
  className?: string
}

/**
 * Floating particle field background
 */
export function ParticleField({ 
  count = 20, 
  color = "var(--primary)",
  className 
}: ParticleFieldProps) {
  const particles = React.useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5
    }))
  }, [count])

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            backgroundColor: color,
            opacity: 0.3
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.5, 0.2],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  )
}

// ============================================================================
// STREAK FLAME
// ============================================================================

interface StreakFlameProps {
  days: number
  size?: "sm" | "md" | "lg"
  className?: string
}

/**
 * Animated streak flame like Duolingo
 */
export function StreakFlame({ days, size = "md", className }: StreakFlameProps) {
  const sizes = {
    sm: { flame: 32, text: "text-sm" },
    md: { flame: 48, text: "text-lg" },
    lg: { flame: 64, text: "text-2xl" }
  }

  const isHot = days >= 7
  const isOnFire = days >= 30
  const isLegendary = days >= 100

  const flameColor = isLegendary 
    ? "var(--gen-z-coral)" 
    : isOnFire 
    ? "var(--neon-creativity)" 
    : isHot 
    ? "var(--gen-z-yellow)" 
    : "var(--gen-z-peach)"

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <motion.div
        className="relative"
        style={{ width: sizes[size].flame, height: sizes[size].flame }}
        animate={{
          scale: [1, 1.05, 0.98, 1.02, 1],
          rotate: [0, -2, 2, -1, 0]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Flame SVG */}
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          className="w-full h-full"
        >
          <motion.path
            d="M12 2C12 2 7 7 7 12C7 14.5 8.5 16.5 10 17.5C10 17.5 9 16 9 14C9 12 12 10 12 10C12 10 15 12 15 14C15 16 14 17.5 14 17.5C15.5 16.5 17 14.5 17 12C17 7 12 2 12 2Z"
            fill={flameColor}
            animate={{
              d: [
                "M12 2C12 2 7 7 7 12C7 14.5 8.5 16.5 10 17.5C10 17.5 9 16 9 14C9 12 12 10 12 10C12 10 15 12 15 14C15 16 14 17.5 14 17.5C15.5 16.5 17 14.5 17 12C17 7 12 2 12 2Z",
                "M12 2C12 2 6 8 6 12C6 15 8 17 10 18C10 18 8.5 16 8.5 14C8.5 11.5 12 9 12 9C12 9 15.5 11.5 15.5 14C15.5 16 14 18 14 18C16 17 18 15 18 12C18 8 12 2 12 2Z",
                "M12 2C12 2 7 7 7 12C7 14.5 8.5 16.5 10 17.5C10 17.5 9 16 9 14C9 12 12 10 12 10C12 10 15 12 15 14C15 16 14 17.5 14 17.5C15.5 16.5 17 14.5 17 12C17 7 12 2 12 2Z"
              ]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          {/* Inner flame */}
          <motion.path
            d="M12 8C12 8 10 10 10 12C10 13.5 11 14.5 12 15C13 14.5 14 13.5 14 12C14 10 12 8 12 8Z"
            fill="var(--gen-z-yellow)"
            animate={{
              opacity: [0.8, 1, 0.8],
              scale: [0.95, 1.05, 0.95]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </svg>
        
        {/* Glow effect */}
        <div 
          className="absolute inset-0 rounded-full blur-lg opacity-50"
          style={{ backgroundColor: flameColor }}
        />
        
        {/* Particles for hot streaks */}
        {isHot && (
          <>
            <motion.div
              className="absolute w-1 h-1 rounded-full bg-yellow-300"
              style={{ left: "30%", top: "20%" }}
              animate={{ y: [-5, -20], opacity: [1, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="absolute w-1 h-1 rounded-full bg-orange-300"
              style={{ left: "70%", top: "30%" }}
              animate={{ y: [-5, -25], opacity: [1, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
            />
          </>
        )}
      </motion.div>
      
      <span className={cn("font-bold", sizes[size].text)}>
        {days}
      </span>
    </div>
  )
}

// ============================================================================
// LEVEL UP ANIMATION
// ============================================================================

interface LevelUpEffectProps {
  level: number
  show: boolean
  onComplete?: () => void
}

/**
 * Full-screen level up celebration
 */
export function LevelUpEffect({ level, show, onComplete }: LevelUpEffectProps) {
  if (!show) return null

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onComplete}
    >
      {/* Radial glow */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, var(--gen-z-lavender) 0%, transparent 70%)",
          opacity: 0.5
        }}
        animate={{
          scale: [0, 2],
          opacity: [0.8, 0]
        }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />

      {/* Level badge */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ 
          scale: [0, 1.2, 1], 
          rotate: [-180, 10, 0]
        }}
        transition={{ 
          duration: 0.8, 
          ease: "easeOut",
          times: [0, 0.7, 1]
        }}
      >
        <motion.div
          className="text-6xl font-black mb-4 text-gen-z-gradient"
          animate={{ 
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            duration: 0.5, 
            delay: 0.8,
            repeat: 2
          }}
        >
          LEVEL UP!
        </motion.div>
        
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gen-z-lavender to-gen-z-coral flex items-center justify-center">
            <span className="text-5xl font-black text-white">{level}</span>
          </div>
          <GlowRing 
            color="var(--gen-z-lavender)" 
            size={140} 
            className="-top-1 -left-1"
          />
        </motion.div>

        <motion.p
          className="mt-6 text-lg text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Tap to continue
        </motion.p>
      </motion.div>

      {/* Confetti particles */}
      <ParticleField count={40} color="var(--gen-z-coral)" />
    </motion.div>
  )
}

// ============================================================================
// PROGRESS EFFECTS
// ============================================================================

interface AnimatedProgressProps {
  value: number
  max: number
  color?: string
  showParticles?: boolean
  className?: string
}

/**
 * Animated progress bar with Gen-Z styling
 */
export function AnimatedProgress({
  value,
  max,
  color = "var(--primary)",
  showParticles = true,
  className
}: AnimatedProgressProps) {
  const percentage = Math.min((value / max) * 100, 100)

  return (
    <div className={cn("relative w-full h-3 rounded-full bg-muted overflow-hidden", className)}>
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Shine effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{
            x: ["-100%", "200%"]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1,
            ease: "easeInOut"
          }}
        />
      </motion.div>

      {/* Glow at the end */}
      {showParticles && percentage > 0 && (
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full"
          style={{
            left: `calc(${percentage}% - 8px)`,
            backgroundColor: color,
            filter: "blur(6px)",
            opacity: 0.6
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.7, 0.4]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </div>
  )
}
