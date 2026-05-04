'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Zap, Gift, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StreakCounterProps {
  currentStreak: number
  maxStreak?: number
  multiplier?: number // x1.2, x1.5, etc.
  nextMilestone?: number // Days until next reward
  isProtected?: boolean // Streak freeze active
  isCritical?: boolean // Streak about to expire
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'compact' | 'hero'
}

export function StreakCounter({
  currentStreak,
  maxStreak,
  multiplier = 1,
  nextMilestone,
  isProtected = false,
  isCritical = false,
  size = 'md',
  variant = 'default'
}: StreakCounterProps) {
  // Determine flame intensity based on streak
  const flameIntensity = currentStreak >= 30 ? 'legendary' : 
                         currentStreak >= 14 ? 'epic' : 
                         currentStreak >= 7 ? 'rare' : 
                         currentStreak >= 3 ? 'common' : 'starting'

  // Gen-Z color palette for flame intensity
  const flameColors = {
    starting: { from: 'from-gen-z-peach', to: 'to-gen-z-yellow', glow: 'oklch(0.85 0.10 55 / 0.5)' },
    common: { from: 'from-gen-z-coral', to: 'to-gen-z-peach', glow: 'oklch(0.75 0.16 25 / 0.5)' },
    rare: { from: 'from-gen-z-coral', to: 'to-neon-creativity', glow: 'oklch(0.75 0.24 30 / 0.6)' },
    epic: { from: 'from-gen-z-grape', to: 'to-gen-z-lavender', glow: 'oklch(0.65 0.22 300 / 0.6)' },
    legendary: { from: 'from-gen-z-lavender', to: 'to-gen-z-sky', glow: 'oklch(0.78 0.14 290 / 0.7)' },
  }

  const colors = isCritical 
    ? { from: 'from-destructive', to: 'to-gen-z-coral', glow: 'oklch(0.65 0.26 25 / 0.8)' }
    : flameColors[flameIntensity]

  if (variant === 'compact') {
    return (
      <motion.div 
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all",
          isCritical 
            ? "bg-destructive/10 border-destructive/50 animate-pulse" 
            : "bg-card/80 backdrop-blur-sm border-border/50 shadow-sm"
        )}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        <motion.div
          animate={isCritical ? { 
            scale: [1, 1.3, 1],
            opacity: [1, 0.8, 1] 
          } : { 
            scale: [1, 1.2, 1],
            rotate: [-5, 5, -5]
          }}
          transition={{ repeat: Infinity, duration: isCritical ? 0.5 : 1 }}
        >
          <Flame className={cn(
            "w-5 h-5",
            isCritical ? 'text-destructive' :
            flameIntensity === 'legendary' ? 'text-gen-z-lavender' :
            flameIntensity === 'epic' ? 'text-gen-z-grape' :
            flameIntensity === 'rare' ? 'text-gen-z-coral' : 'text-gen-z-peach'
          )} 
          style={!isCritical ? { filter: `drop-shadow(0 0 8px ${colors.glow})` } : {}}
          />
        </motion.div>
        <span className={cn(
          "font-black text-lg",
          isCritical ? "text-destructive" : "text-foreground"
        )}>{currentStreak}</span>
        {multiplier > 1 && !isCritical && (
          <span className="text-xs font-bold text-gen-z-yellow px-1.5 py-0.5 rounded-full bg-gen-z-yellow/20">x{multiplier}</span>
        )}
        {isCritical && (
          <span className="text-xs font-bold text-destructive animate-pulse">!</span>
        )}
      </motion.div>
    )
  }

  if (variant === 'hero') {
    return (
      <div className="relative">
        {/* Background glow */}
        <motion.div 
          className={cn(
            "absolute inset-0 rounded-3xl blur-3xl opacity-30",
            `bg-gradient-to-r ${colors.from} ${colors.to}`
          )}
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />

        <div className="relative bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center">
          {/* Animated Flame */}
          <div className="relative mx-auto w-32 h-32 mb-4">
            {/* Outer glow ring */}
            <motion.div 
              className={cn(
                "absolute inset-0 rounded-full",
                `bg-gradient-to-r ${colors.from} ${colors.to}`
              )}
              style={{ filter: `blur(20px)` }}
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
            
            {/* Flame icon */}
            <motion.div 
              className="absolute inset-0 flex items-center justify-center"
              animate={{ 
                y: [0, -5, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
            >
              <Flame 
                className={cn(
                  "w-20 h-20",
                  flameIntensity === 'legendary' ? 'text-cyan-400' :
                  flameIntensity === 'epic' ? 'text-purple-400' :
                  flameIntensity === 'rare' ? 'text-red-400' : 'text-orange-400'
                )} 
                style={{ filter: `drop-shadow(0 0 20px ${colors.glow})` }}
              />
            </motion.div>

            {/* Particle effects */}
            {currentStreak >= 7 && (
              <>
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className={cn(
                      "absolute w-2 h-2 rounded-full",
                      `bg-gradient-to-r ${colors.from} ${colors.to}`
                    )}
                    initial={{ 
                      x: '50%', 
                      y: '100%',
                      opacity: 0,
                      scale: 0
                    }}
                    animate={{ 
                      x: `${30 + Math.random() * 40}%`,
                      y: '-20%',
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0]
                    }}
                    transition={{ 
                      repeat: Infinity,
                      duration: 1.5 + Math.random(),
                      delay: i * 0.2,
                      ease: "easeOut"
                    }}
                  />
                ))}
              </>
            )}
          </div>

          {/* Streak Number */}
          <motion.div
            className="relative"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          >
            <span className={cn(
              "text-7xl font-black",
              `bg-gradient-to-r ${colors.from} ${colors.to} bg-clip-text text-transparent`
            )}>
              {currentStreak}
            </span>
            <span className="block text-lg text-zinc-400 font-medium mt-1">
              jour{currentStreak > 1 ? 's' : ''} de série
            </span>
          </motion.div>

          {/* Multiplier Badge */}
          {multiplier > 1 && (
            <motion.div 
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/30"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="font-bold text-yellow-400">Bonus XP x{multiplier}</span>
            </motion.div>
          )}

          {/* Protected indicator */}
          {isProtected && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-cyan-400">
              <Shield className="w-4 h-4" />
              <span>Série protégée</span>
            </div>
          )}

          {/* Next milestone */}
          {nextMilestone && (
            <div className="mt-4 text-sm text-zinc-500">
              <span>Prochaine récompense dans </span>
              <span className="text-white font-bold">{nextMilestone} jour{nextMilestone > 1 ? 's' : ''}</span>
              <Gift className="w-4 h-4 inline ml-1 text-emerald-400" />
            </div>
          )}

          {/* Max streak indicator */}
          {maxStreak && currentStreak >= maxStreak && (
            <motion.div 
              className="mt-4 text-sm text-cyan-400 font-bold"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              🏆 Record personnel atteint !
            </motion.div>
          )}
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <motion.div 
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-md",
        size === 'sm' && 'p-3',
        size === 'md' && 'p-4',
        size === 'lg' && 'p-6'
      )}
      whileHover={{ scale: 1.02 }}
      style={{ boxShadow: `0 0 30px ${colors.glow}` }}
    >
      {/* Background gradient */}
      <div className={cn(
        "absolute inset-0 opacity-10",
        `bg-gradient-to-br ${colors.from} ${colors.to}`
      )} />

      <div className="relative z-10 flex items-center gap-4">
        {/* Animated Flame */}
        <motion.div 
          className={cn(
            "p-3 rounded-xl",
            `bg-gradient-to-br ${colors.from}/20 ${colors.to}/20`
          )}
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [-3, 3, -3]
          }}
          transition={{ repeat: Infinity, duration: 1 }}
        >
          <Flame 
            className={cn(
              size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6',
              flameIntensity === 'legendary' ? 'text-cyan-400' :
              flameIntensity === 'epic' ? 'text-purple-400' :
              flameIntensity === 'rare' ? 'text-red-400' : 'text-orange-400'
            )} 
          />
        </motion.div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <AnimatePresence mode="wait">
              <motion.span
                key={currentStreak}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className={cn(
                  "font-black text-white",
                  size === 'sm' && 'text-2xl',
                  size === 'md' && 'text-3xl',
                  size === 'lg' && 'text-4xl'
                )}
              >
                {currentStreak}
              </motion.span>
            </AnimatePresence>
            <span className="text-zinc-400 text-sm">jour{currentStreak > 1 ? 's' : ''}</span>
            
            {isProtected && (
              <Shield className="w-4 h-4 text-cyan-400 ml-1" />
            )}
          </div>
          
          <div className="flex items-center gap-3 mt-1">
            {multiplier > 1 && (
              <motion.span 
                className="text-xs font-bold text-yellow-400 flex items-center gap-1"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Zap className="w-3 h-3" />
                x{multiplier} XP
              </motion.span>
            )}
            
            {nextMilestone && (
              <span className="text-xs text-zinc-500">
                Récompense dans {nextMilestone}j
              </span>
            )}
          </div>
        </div>

        {/* Intensity badge */}
        <div className={cn(
          "px-2 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold",
          flameIntensity === 'legendary' && 'bg-cyan-500/20 text-cyan-400',
          flameIntensity === 'epic' && 'bg-purple-500/20 text-purple-400',
          flameIntensity === 'rare' && 'bg-red-500/20 text-red-400',
          flameIntensity === 'common' && 'bg-orange-500/20 text-orange-400',
          flameIntensity === 'starting' && 'bg-yellow-500/20 text-yellow-400',
        )}>
          {flameIntensity === 'legendary' ? '🔥 Légendaire' :
           flameIntensity === 'epic' ? '⚡ Épique' :
           flameIntensity === 'rare' ? '💪 En feu' :
           flameIntensity === 'common' ? '🌟 Régulier' : '✨ Début'}
        </div>
      </div>
    </motion.div>
  )
}


