'use client'

import { motion } from 'framer-motion'
import { Zap, Flame, Palette, Users, BookOpen, Trophy, ChevronRight, Clock, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'

export type QuestType = 'quiz' | 'sport' | 'creative' | 'social' | 'academic' | 'event' | 'daily'

export interface QuestCardProps {
  id: string
  title: string
  description?: string
  type: QuestType
  xpReward: number
  progress?: number // 0-100
  status: 'locked' | 'active' | 'in_progress' | 'completed' | 'claimed'
  streakBonus?: number // x1.2, x1.5, etc.
  timeLeft?: string // "2h 30m"
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
}

const typeConfig: Record<QuestType, { icon: typeof Zap, color: string, bgColor: string, neonClass: string }> = {
  quiz: { 
    icon: Zap, 
    color: 'text-gold', 
    bgColor: 'bg-gold/20',
    neonClass: ''
  },
  sport: { 
    icon: Flame, 
    color: 'text-coral', 
    bgColor: 'bg-coral/20',
    neonClass: ''
  },
  creative: { 
    icon: Palette, 
    color: 'text-pink', 
    bgColor: 'bg-pink/20',
    neonClass: ''
  },
  social: { 
    icon: Users, 
    color: 'text-teal', 
    bgColor: 'bg-teal/20',
    neonClass: ''
  },
  academic: { 
    icon: BookOpen, 
    color: 'text-teal', 
    bgColor: 'bg-teal/20',
    neonClass: ''
  },
  event: { 
    icon: Star, 
    color: 'text-pink', 
    bgColor: 'bg-pink/20',
    neonClass: ''
  },
  daily: { 
    icon: Trophy, 
    color: 'text-lime', 
    bgColor: 'bg-lime/20',
    neonClass: ''
  },
}

export function QuestCard({ 
  id,
  title, 
  description, 
  type, 
  xpReward, 
  progress = 0, 
  status, 
  streakBonus,
  timeLeft,
  onClick,
  size = 'md'
}: QuestCardProps) {
  const config = typeConfig[type]
  const Icon = config.icon
  
  const isCompleted = status === 'completed' || status === 'claimed'
  const isLocked = status === 'locked'
  const isActive = status === 'active' || status === 'in_progress'

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }

  return (
    <motion.div
      whileHover={{ scale: isLocked ? 1 : 1.02 }}
      whileTap={{ scale: isLocked ? 1 : 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <GlassCard
        variant={isLocked ? 'default' : 'hover'}
        neon={isActive ? (type === 'quiz' ? 'prestige' : type === 'sport' ? 'creativity' : type === 'creative' ? 'party' : 'intellect') : 'none'}
        className={cn(
          sizeClasses[size],
          'relative overflow-hidden cursor-pointer transition-all duration-300',
          isLocked && 'opacity-50 cursor-not-allowed',
          isCompleted && 'border-lime/30 bg-lime/10',
          isActive && config.neonClass,
          isActive && 'border-l-4',
          isActive && type === 'quiz' && 'border-l-yellow-400',
          isActive && type === 'sport' && 'border-l-orange-400',
          isActive && type === 'creative' && 'border-l-purple-400',
          isActive && type === 'social' && 'border-l-cyan-400',
          isActive && type === 'academic' && 'border-l-blue-400',
          isActive && type === 'event' && 'border-l-pink-400',
          isActive && type === 'daily' && 'border-l-emerald-400',
        )}
        onClick={isLocked ? undefined : onClick}
      >
        {/* Background glow effect for active quests */}
        {isActive && (
          <div className={cn(
            "absolute inset-0 opacity-10",
            config.bgColor
          )} />
        )}

        {/* Completed overlay */}
        {isCompleted && (
          <div className="absolute inset-0 bg-lime/5 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="absolute top-2 right-2"
            >
              <div className="bg-lime rounded-full p-1">
                <Trophy className="w-3 h-3 text-ink" />
              </div>
            </motion.div>
          </div>
        )}

        <div className="relative z-10 flex items-start gap-4">
          {/* Icon with animation */}
          <motion.div 
            className={cn(
              "p-3 rounded-xl shrink-0",
              config.bgColor
            )}
            animate={isActive ? { 
              scale: [1, 1.1, 1],
            } : {}}
            transition={{ 
              repeat: isActive ? Infinity : 0, 
              duration: 2,
              ease: "easeInOut"
            }}
          >
            <Icon className={cn("w-6 h-6", config.color, isCompleted && "text-lime")} />
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className={cn(
                  "font-bold text-ink truncate",
                  size === 'sm' && 'text-sm',
                  size === 'lg' && 'text-lg',
                  isCompleted && 'line-through text-mute'
                )}>
                  {title}
                </h3>
                {description && (
                  <p className={cn(
                    "text-mute mt-1 line-clamp-2",
                    size === 'sm' && 'text-xs',
                    size === 'md' && 'text-sm'
                  )}>
                    {description}
                  </p>
                )}
              </div>
              
              {!isLocked && !isCompleted && (
                <ChevronRight className="w-5 h-5 text-mute shrink-0" />
              )}
            </div>

            {/* Progress bar */}
            {progress > 0 && progress < 100 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-mute mb-1">
                  <span>Progression</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-card rounded-full overflow-hidden">
                  <motion.div 
                    className={cn("h-full rounded-full", config.bgColor.replace('/20', ''))}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{ 
                      boxShadow: `0 0 10px ${config.color.replace('text-', '').replace('-400', '')}` 
                    }}
                  />
                </div>
              </div>
            )}

            {/* Footer: XP, Time, Streak */}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {/* XP Reward */}
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold",
                isCompleted ? "bg-lime/20 text-lime" : "bg-card text-ink"
              )}>
                <Zap className="w-3 h-3" />
                +{xpReward} XP
              </div>

              {/* Streak Bonus */}
              {streakBonus && streakBonus > 1 && (
                <motion.div 
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-coral/20 text-coral text-xs font-bold"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Flame className="w-3 h-3" />
                  x{streakBonus}
                </motion.div>
              )}

              {/* Time Left */}
              {timeLeft && (
                <div className="flex items-center gap-1 text-xs text-mute">
                  <Clock className="w-3 h-3" />
                  {timeLeft}
                </div>
              )}
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  )
}

// Compact version for lists
export function QuestCardCompact({ 
  title, 
  type, 
  xpReward, 
  status,
  onClick 
}: Pick<QuestCardProps, 'title' | 'type' | 'xpReward' | 'status' | 'onClick'>) {
  const config = typeConfig[type]
  const Icon = config.icon
  const isCompleted = status === 'completed' || status === 'claimed'

  return (
    <motion.div
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl bg-card border border-ink cursor-pointer transition-all",
        "hover:bg-card hover:border-ink",
        isCompleted && "opacity-60"
      )}
      onClick={onClick}
    >
      <div className={cn("p-2 rounded-lg", config.bgColor)}>
        <Icon className={cn("w-4 h-4", config.color)} />
      </div>
      <span className={cn(
        "flex-1 font-medium text-ink text-sm truncate",
        isCompleted && "line-through text-mute"
      )}>
        {title}
      </span>
      <span className="text-xs font-bold text-lime">+{xpReward}</span>
    </motion.div>
  )
}


