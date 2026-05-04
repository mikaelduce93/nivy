'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, Zap, Gift, Trophy, Sparkles, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NeonButton } from '@/components/ui/neon-button'

interface Reward {
  type: 'xp_bonus' | 'coins' | 'badge' | 'title' | 'item' | 'feature'
  name: string
  icon?: string
  value?: number
}

interface LevelUpModalProps {
  isOpen: boolean
  onClose: () => void
  newLevel: number
  newTitle?: string
  newTitleIcon?: string
  rewards?: Reward[]
  xpToNextLevel?: number
}

export function LevelUpModal({
  isOpen,
  onClose,
  newLevel,
  newTitle,
  newTitleIcon,
  rewards = [],
  xpToNextLevel
}: LevelUpModalProps) {
  const [showRewards, setShowRewards] = useState(false)
  const [particlesVisible, setParticlesVisible] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setShowRewards(false)
      setParticlesVisible(true)
      
      // Show rewards after initial animation
      const timer = setTimeout(() => setShowRewards(true), 1500)
      
      // Hide particles after some time
      const particleTimer = setTimeout(() => setParticlesVisible(false), 4000)
      
      return () => {
        clearTimeout(timer)
        clearTimeout(particleTimer)
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div 
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />

          {/* Gen-Z Particles */}
          {particlesVisible && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Floating particles with Gen-Z colors */}
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  className={cn(
                    "absolute w-2 h-2 rounded-full",
                    i % 5 === 0 ? "bg-gen-z-lavender" :
                    i % 5 === 1 ? "bg-gen-z-coral" :
                    i % 5 === 2 ? "bg-gen-z-lime" :
                    i % 5 === 3 ? "bg-gen-z-mint" : "bg-gen-z-peach"
                  )}
                  initial={{ 
                    x: '50vw',
                    y: '50vh',
                    scale: 0,
                    opacity: 0
                  }}
                  animate={{ 
                    x: `${Math.random() * 100}vw`,
                    y: `${Math.random() * 100}vh`,
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0]
                  }}
                  transition={{ 
                    duration: 2 + Math.random() * 2,
                    delay: Math.random() * 0.5,
                    ease: "easeOut"
                  }}
                />
              ))}

              {/* Shooting stars */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={`star-${i}`}
                  className="absolute w-1 h-16 bg-gradient-to-b from-white to-transparent rounded-full"
                  style={{ 
                    left: `${10 + Math.random() * 80}%`,
                    transformOrigin: 'top'
                  }}
                  initial={{ 
                    y: -100,
                    rotate: 45,
                    opacity: 0
                  }}
                  animate={{ 
                    y: '100vh',
                    opacity: [0, 1, 0]
                  }}
                  transition={{ 
                    duration: 0.8,
                    delay: 0.5 + i * 0.3,
                    ease: "easeIn"
                  }}
                />
              ))}
            </div>
          )}

          {/* Main Modal */}
          <motion.div
            className="relative z-10 w-full max-w-md"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 10 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            {/* Gen-Z Glow rings */}
            <motion.div 
              className="absolute -inset-8 bg-gradient-to-r from-gen-z-lavender via-gen-z-coral to-gen-z-lime rounded-full blur-3xl opacity-40"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <motion.div 
              className="absolute -inset-4 bg-gradient-to-r from-gen-z-mint via-gen-z-grape to-gen-z-coral rounded-full blur-2xl opacity-30"
              animate={{ 
                scale: [1.2, 1, 1.2],
                opacity: [0.2, 0.4, 0.2],
                rotate: [0, 180, 360]
              }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            />

            {/* Card */}
            <div className="relative bg-card border border-border/50 rounded-3xl overflow-hidden shadow-2xl">
              {/* Close button */}
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {/* Header section - Gen-Z styled */}
              <div className="relative pt-12 pb-8 px-8 text-center overflow-hidden">
                {/* Background pattern - Gen-Z gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-gen-z-lavender/20 via-gen-z-coral/10 to-transparent" />
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute top-4 left-4 w-20 h-20 border-2 border-white rounded-full" />
                  <div className="absolute bottom-8 right-8 w-16 h-16 border-2 border-white rounded-full" />
                </div>

                {/* Level badge */}
                <motion.div
                  initial={{ y: -50, opacity: 0, scale: 0 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                  className="relative"
                >
                  <div className="relative inline-block">
                    {/* Glow - Gen-Z gradient */}
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-gen-z-lavender to-gen-z-coral rounded-full blur-2xl"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.8, 0.5] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                    
                    {/* Badge - Gen-Z holographic */}
                    <motion.div 
                      className="relative w-36 h-36 mx-auto flex items-center justify-center rounded-full bg-gradient-to-br from-gen-z-lavender via-gen-z-coral to-gen-z-lime border-4 border-white/30 shadow-2xl"
                      animate={{ 
                        rotate: [0, 5, -5, 0],
                        scale: [1, 1.02, 1]
                      }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    >
                      <span className="text-6xl font-black text-white drop-shadow-lg">
                        {newLevel}
                      </span>
                      {/* Holographic shimmer */}
                      <motion.div
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{ rotate: [0, 360] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                      />
                    </motion.div>

                    {/* Stars around badge - Gen-Z colors */}
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute"
                        style={{
                          top: `${50 + 65 * Math.sin((i / 6) * Math.PI * 2)}%`,
                          left: `${50 + 65 * Math.cos((i / 6) * Math.PI * 2)}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                        animate={{ 
                          scale: [0.8, 1.3, 0.8],
                          rotate: [0, 180, 360]
                        }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: 2,
                          delay: i * 0.15
                        }}
                      >
                        <Star className={cn(
                          "w-5 h-5 fill-current",
                          i % 3 === 0 ? "text-gen-z-lavender" :
                          i % 3 === 1 ? "text-gen-z-coral" : "text-gen-z-lime"
                        )} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Title - Gen-Z gradient */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-6"
                >
                  <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gen-z-lavender via-gen-z-coral to-gen-z-lime">
                    LEVEL UP !
                  </h2>
                  <p className="text-muted-foreground mt-2 text-lg">
                    Tu as atteint le niveau <span className="text-foreground font-bold">{newLevel}</span>
                  </p>
                </motion.div>

                {/* New Title - Gen-Z styled */}
                {newTitle && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 1, type: 'spring' }}
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-gen-z-grape/20 to-gen-z-lavender/20 border border-gen-z-lavender/30"
                  >
                    <span className="text-2xl">{newTitleIcon || '🏆'}</span>
                    <span className="font-bold text-foreground">{newTitle}</span>
                    <Sparkles className="w-4 h-4 text-gen-z-lavender" />
                  </motion.div>
                )}
              </div>

              {/* Rewards section - Gen-Z styled */}
              <AnimatePresence>
                {showRewards && rewards.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-6 pb-6"
                  >
                    <div className="border-t border-border/50 pt-6">
                      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
                        <Gift className="w-4 h-4 text-gen-z-coral" />
                        Récompenses débloquées
                      </h3>
                      
                      <div className="space-y-3">
                        {rewards.map((reward, index) => (
                          <motion.div
                            key={index}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className={cn(
                              "flex items-center gap-3 p-4 rounded-2xl border",
                              reward.type === 'xp_bonus' && "bg-gen-z-lime/10 border-gen-z-lime/20",
                              reward.type === 'coins' && "bg-gen-z-yellow/10 border-gen-z-yellow/20",
                              reward.type === 'badge' && "bg-gen-z-grape/10 border-gen-z-grape/20",
                              reward.type === 'title' && "bg-gen-z-coral/10 border-gen-z-coral/20",
                              reward.type === 'item' && "bg-gen-z-mint/10 border-gen-z-mint/20",
                              reward.type === 'feature' && "bg-gen-z-lavender/10 border-gen-z-lavender/20",
                            )}
                          >
                            <span className="text-2xl">{reward.icon || getRewardIcon(reward.type)}</span>
                            <div className="flex-1">
                              <span className="font-semibold text-foreground">{reward.name}</span>
                              {reward.value && (
                                <span className="ml-2 text-sm text-muted-foreground font-medium">
                                  +{reward.value.toLocaleString()}
                                </span>
                              )}
                            </div>
                            <Trophy className="w-5 h-5 text-gen-z-yellow" />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer - Gen-Z styled */}
              <div className="px-6 pb-6">
                {xpToNextLevel && (
                  <p className="text-center text-sm text-muted-foreground mb-4">
                    <Zap className="w-3 h-3 inline mr-1 text-gen-z-lavender" />
                    {xpToNextLevel.toLocaleString()} XP pour le niveau {newLevel + 1}
                  </p>
                )}
                
                <NeonButton 
                  variant="prestige" 
                  size="lg" 
                  className="w-full rounded-2xl"
                  onClick={onClose}
                >
                  <span className="font-bold">Continuer l'aventure</span>
                  <ChevronRight className="w-5 h-5 ml-2" />
                </NeonButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function getRewardIcon(type: Reward['type']): string {
  switch (type) {
    case 'xp_bonus': return '⚡'
    case 'coins': return '🪙'
    case 'badge': return '🏅'
    case 'title': return '👑'
    case 'item': return '🎁'
    case 'feature': return '🔓'
    default: return '✨'
  }
}

// Hook for managing level up state
export function useLevelUp() {
  const [levelUpData, setLevelUpData] = useState<{
    isOpen: boolean
    newLevel: number
    newTitle?: string
    newTitleIcon?: string
    rewards?: Reward[]
    xpToNextLevel?: number
  }>({
    isOpen: false,
    newLevel: 1
  })

  const triggerLevelUp = (data: Omit<typeof levelUpData, 'isOpen'>) => {
    setLevelUpData({ ...data, isOpen: true })
  }

  const closeLevelUp = () => {
    setLevelUpData(prev => ({ ...prev, isOpen: false }))
  }

  return {
    ...levelUpData,
    triggerLevelUp,
    closeLevelUp
  }
}


