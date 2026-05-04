"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Zap, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface XPBarProps {
  currentXP: number
  level: number
  xpToNextLevel: number
  className?: string
  showLevel?: boolean
  animate?: boolean
  size?: "sm" | "md" | "lg"
}

export function XPBar({
  currentXP,
  level,
  xpToNextLevel,
  className,
  showLevel = true,
  animate = true,
  size = "md",
}: XPBarProps) {
  const [displayXP, setDisplayXP] = useState(animate ? 0 : currentXP)
  const [isAnimating, setIsAnimating] = useState(false)

  // XP dans le niveau actuel
  const xpInCurrentLevel = currentXP % 100
  const xpNeeded = 100 // XP nécessaire par niveau
  const percentage = Math.min((xpInCurrentLevel / xpNeeded) * 100, 100)

  useEffect(() => {
    if (!animate) {
      setDisplayXP(currentXP)
      return
    }

    setIsAnimating(true)
    const duration = 1000
    const startTime = Date.now()
    const startXP = displayXP

    const animateXP = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing ease-out
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const newXP = Math.round(startXP + (currentXP - startXP) * easeOut)

      setDisplayXP(newXP)

      if (progress < 1) {
        requestAnimationFrame(animateXP)
      } else {
        setIsAnimating(false)
      }
    }

    requestAnimationFrame(animateXP)
  }, [currentXP, animate])

  const sizeClasses = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Header avec niveau et XP */}
      <div className="flex items-center justify-between mb-2">
        {showLevel && (
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="relative">
              <motion.div
                className="w-8 h-8 rounded-xl bg-gradient-to-br from-gen-z-lavender to-gen-z-grape flex items-center justify-center shadow-lg"
                animate={isAnimating ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                <span className="text-white font-black text-sm">{level}</span>
              </motion.div>
              {/* Gen-Z Glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gen-z-lavender/40 blur-lg -z-10" />
            </div>
            <span className="text-muted-foreground text-sm font-semibold">Niveau {level}</span>
          </motion.div>
        )}

        <motion.div
          className="flex items-center gap-1.5 text-gen-z-lavender"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Zap className="w-4 h-4" />
          <span className="font-black">{displayXP.toLocaleString()}</span>
          <span className="text-muted-foreground text-sm font-medium">XP</span>
        </motion.div>
      </div>

      {/* Barre de progression - Gen-Z gradient */}
      <div className="relative">
        <div
          className={cn(
            "w-full bg-muted rounded-full overflow-hidden",
            sizeClasses[size]
          )}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-gen-z-lavender via-gen-z-coral to-gen-z-lime rounded-full relative"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: animate ? 1 : 0, ease: "easeOut" }}
            style={{
              boxShadow: `0 0 20px var(--gen-z-lavender)`
            }}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </motion.div>
        </div>

        {/* Progress milestones with dots */}
        <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none">
          {[25, 50, 75].map((mark) => (
            <motion.div
              key={mark}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors",
                percentage >= mark ? "bg-white" : "bg-muted-foreground/30"
              )}
              style={{ marginLeft: `${mark}%` }}
              animate={percentage >= mark ? { scale: [1, 1.5, 1] } : {}}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </div>

      {/* Footer avec progression vers prochain niveau */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted-foreground font-medium">
          {xpInCurrentLevel} / {xpNeeded} XP
        </span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <TrendingUp className="w-3 h-3 text-gen-z-lime" />
          <span className="font-medium">{xpNeeded - xpInCurrentLevel} XP pour niveau {level + 1}</span>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   XP GAIN POPUP - Apparaît quand on gagne de l'XP
   ========================================================================== */

interface XPGainPopupProps {
  amount: number
  reason?: string
  onComplete?: () => void
}

export function XPGainPopup({ amount, reason, onComplete }: XPGainPopupProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.()
    }, 2500)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <motion.div
      className="fixed top-20 right-4 z-50"
      initial={{ opacity: 0, x: 50, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="relative overflow-hidden bg-gradient-to-r from-gen-z-lavender/20 to-gen-z-grape/20 backdrop-blur-xl border border-gen-z-lavender/30 rounded-2xl px-5 py-4 shadow-xl">
        {/* Animated background shimmer */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1, repeat: 2 }}
        />
        
        <div className="relative flex items-center gap-4">
          <motion.div
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gen-z-lavender to-gen-z-grape flex items-center justify-center shadow-lg"
            animate={{ 
              rotate: [0, 15, -15, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 0.6, repeat: 1 }}
          >
            <Zap className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <motion.p
              className="text-gen-z-lavender font-black text-2xl"
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.4 }}
            >
              +{amount} XP
            </motion.p>
            {reason && (
              <p className="text-muted-foreground text-sm font-medium">{reason}</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   XP MINI BAR - Version compacte pour header/navbar
   ========================================================================== */

interface XPMiniBarProps {
  currentXP: number
  level: number
  className?: string
}

export function XPMiniBar({ currentXP, level, className }: XPMiniBarProps) {
  const xpInCurrentLevel = currentXP % 100
  const percentage = (xpInCurrentLevel / 100) * 100

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <motion.div 
        className="w-7 h-7 rounded-xl bg-gradient-to-br from-gen-z-lavender to-gen-z-grape flex items-center justify-center shadow-md"
        whileHover={{ scale: 1.1, rotate: 5 }}
      >
        <span className="text-white font-black text-xs">{level}</span>
      </motion.div>
      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-gen-z-lavender to-gen-z-coral rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ boxShadow: '0 0 10px var(--gen-z-lavender)' }}
        />
      </div>
      <span className="text-gen-z-lavender text-xs font-bold">{currentXP.toLocaleString()} XP</span>
    </div>
  )
}
