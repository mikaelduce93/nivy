'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { useHaptic } from '@/lib/hooks/use-haptic'
import { Trophy, Star, Crown, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type CelebrationType = 'level-up' | 'badge-unlocked' | 'mission-complete' | 'streak-milestone'

interface CelebrationOverlayProps {
  type: CelebrationType
  title: string
  subtitle?: string
  xpEarned?: number
  image?: string // For badges or specific icons
  isOpen: boolean
  onClose: () => void
}

export function CelebrationOverlay({
  type,
  title,
  subtitle,
  xpEarned,
  image,
  isOpen,
  onClose
}: CelebrationOverlayProps) {
  const { trigger } = useHaptic()
  const [showConfetti, setShowConfetti] = useState(false)

  // Configuration par type
  const config = {
    'level-up': {
      icon: Crown,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      borderColor: 'border-amber-500/50',
      neonColor: 'var(--neon-prestige)',
      sound: '/sounds/level-up.mp3'
    },
    'badge-unlocked': {
      icon: Trophy,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/50',
      neonColor: 'var(--neon-party)',
      sound: '/sounds/badge.mp3'
    },
    'mission-complete': {
      icon: Star,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-500/50',
      neonColor: 'var(--neon-vitality)',
      sound: '/sounds/success.mp3'
    },
    'streak-milestone': {
      icon: Sparkles,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/50',
      neonColor: 'var(--neon-prestige)',
      sound: '/sounds/fire.mp3'
    }
  }

  const currentConfig = config[type]
  const Icon = currentConfig.icon

  useEffect(() => {
    if (isOpen) {
      trigger('success')
      setShowConfetti(true)
      
      // Lancer les confettis
      const duration = 3000
      const end = Date.now() + duration

      const colors = type === 'level-up' ? ['#fbbf24', '#f59e0b', '#b45309'] : // Gold
                     type === 'badge-unlocked' ? ['#c084fc', '#a855f7', '#7e22ce'] : // Purple
                     type === 'mission-complete' ? ['#34d399', '#10b981', '#059669'] : // Emerald
                     ['#fb923c', '#f97316', '#c2410c'] // Orange

      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        })
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        })

        if (Date.now() < end && isOpen) {
          requestAnimationFrame(frame)
        }
      }

      frame()
      
      // Play sound if we had an audio system
      // const audio = new Audio(currentConfig.sound)
      // audio.play().catch(e => console.log('Audio play failed', e))
    } else {
      setShowConfetti(false)
    }
  }, [isOpen, type, trigger, currentConfig.sound])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 50, opacity: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 300 }}
            className={`relative w-full max-w-sm p-8 rounded-3xl border-2 ${currentConfig.bgColor} ${currentConfig.borderColor} backdrop-blur-xl shadow-[0_0_50px_-10px_var(--neon-glow)] text-center overflow-hidden`}
            style={{ '--neon-glow': currentConfig.neonColor } as any}
            onClick={(e) => e.stopPropagation()}
          >
             {/* Background Effects */}
             <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
             <div className="absolute -top-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
             <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl" />

             {/* Content */}
             <div className="relative z-10 flex flex-col items-center">
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 border-4 ${currentConfig.borderColor} bg-black/30 shadow-[0_0_30px_-5px_var(--neon-glow)]`}
                >
                  {image ? (
                    <img src={image} alt={title} className="w-16 h-16 object-contain" />
                  ) : (
                    <Icon className={`w-12 h-12 ${currentConfig.color}`} />
                  )}
                </motion.div>

                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-black text-white mb-2 tracking-tight uppercase italic"
                  style={{ textShadow: `0 0 20px ${currentConfig.neonColor}` }}
                >
                  {title}
                </motion.h2>

                {subtitle && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-zinc-300 mb-6 font-medium"
                  >
                    {subtitle}
                  </motion.p>
                )}

                {xpEarned && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="mb-8 flex flex-col items-center"
                  >
                    <span className={`text-4xl font-black ${currentConfig.color} drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]`}>
                      +{xpEarned} XP
                    </span>
                    <span className="text-xs text-white/50 font-bold uppercase tracking-widest mt-1">
                      Récompense
                    </span>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="w-full"
                >
                  <Button 
                    onClick={onClose}
                    className={`w-full py-6 text-lg font-bold rounded-xl shadow-[0_0_20px_-5px_var(--neon-glow)] hover:scale-105 transition-transform bg-white text-black hover:bg-zinc-200 border-none`}
                  >
                    C'EST PARTI ! 🚀
                  </Button>
                </motion.div>
             </div>

             {/* Close Button */}
             <button 
               onClick={onClose}
               className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
             >
               <X className="w-6 h-6" />
             </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

