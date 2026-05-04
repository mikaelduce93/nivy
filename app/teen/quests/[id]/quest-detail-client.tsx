'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Brain, 
  Dumbbell, 
  Palette, 
  Users,
  Zap, 
  Clock, 
  Trophy,
  CheckCircle2,
  Circle,
  Play,
  Share2,
  Flame,
  Target,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import confetti from 'canvas-confetti'

interface QuestStep {
  id: string
  title: string
  description?: string
  completed?: boolean
}

interface Quest {
  id: string
  title: string
  description: string
  xp_reward: number
  pillar: 'intellect' | 'vitality' | 'creativity' | 'social'
  type: string
  status: string
  steps?: QuestStep[]
  duration?: string
  difficulty?: string
  deadline?: string
  requirements?: string[]
}

interface QuestDetailClientProps {
  quest: Quest
  teenId: string
}

const PILLAR_CONFIG = {
  intellect: {
    icon: Brain,
    color: 'var(--gen-z-sky)',
    gradient: 'from-gen-z-sky to-cyan-600',
    bg: 'bg-gen-z-sky/10',
    label: 'INTELLECT',
  },
  vitality: {
    icon: Dumbbell,
    color: 'var(--gen-z-lime)',
    gradient: 'from-gen-z-lime to-green-600',
    bg: 'bg-gen-z-lime/10',
    label: 'VITALITY',
  },
  creativity: {
    icon: Palette,
    color: 'var(--gen-z-lavender)',
    gradient: 'from-gen-z-lavender to-purple-600',
    bg: 'bg-gen-z-lavender/10',
    label: 'CREATIVITY',
  },
  social: {
    icon: Users,
    color: 'var(--gen-z-coral)',
    gradient: 'from-gen-z-coral to-rose-600',
    bg: 'bg-gen-z-coral/10',
    label: 'SOCIAL',
  },
}

export function QuestDetailClient({ quest, teenId }: QuestDetailClientProps) {
  const router = useRouter()
  const [isStarting, setIsStarting] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [steps, setSteps] = useState<QuestStep[]>(quest.steps || [])
  const [currentStatus, setCurrentStatus] = useState(quest.status)

  const config = PILLAR_CONFIG[quest.pillar] || PILLAR_CONFIG.intellect
  const Icon = config.icon

  const completedSteps = steps.filter(s => s.completed).length
  const totalSteps = steps.length
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

  const isCompleted = currentStatus === 'completed'
  const isInProgress = currentStatus === 'in_progress'

  const handleStart = async () => {
    setIsStarting(true)
    try {
      const response = await fetch('/api/teen/quests/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId: quest.id, teenId }),
      })

      if (response.ok) {
        setCurrentStatus('in_progress')
      }
    } catch (error) {
      console.error('Failed to start quest:', error)
    } finally {
      setIsStarting(false)
    }
  }

  const handleStepToggle = async (stepId: string) => {
    const updatedSteps = steps.map(s => 
      s.id === stepId ? { ...s, completed: !s.completed } : s
    )
    setSteps(updatedSteps)

    // Check if all steps completed
    if (updatedSteps.every(s => s.completed)) {
      // Auto-complete quest
      handleComplete()
    }
  }

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      const response = await fetch('/api/teen/quests/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId: quest.id, teenId }),
      })

      if (response.ok) {
        setCurrentStatus('completed')
        // Celebration!
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#8b5cf6', '#f43f5e', '#10b981', '#fbbf24'],
          zIndex: 9999,
        })
        if (navigator.vibrate) navigator.vibrate([50, 100, 50])
      }
    } catch (error) {
      console.error('Failed to complete quest:', error)
    } finally {
      setIsCompleting(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Je fais la quête: ${quest.title}`,
          text: `Rejoins-moi sur cette quête et gagne ${quest.xp_reward} XP!`,
          url: window.location.href,
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#020203] text-white">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div 
          className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-20"
          style={{ backgroundColor: config.color }}
        />
        <div 
          className="absolute bottom-[10%] -left-[10%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-10"
          style={{ backgroundColor: config.color }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-8">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => router.back()}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Retour aux quêtes</span>
        </motion.button>

        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-zinc-900/60 backdrop-blur-xl border border-white/10 p-6 sm:p-8"
        >
          {/* Pillar badge */}
          <div className="flex items-center justify-between mb-6">
            <div 
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black tracking-wider",
                config.bg
              )}
              style={{ color: config.color }}
            >
              <Icon className="w-4 h-4" />
              {config.label}
            </div>
            
            <div className="flex items-center gap-3">
              {quest.difficulty && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-xs font-bold text-zinc-400">
                  <Flame className="w-3.5 h-3.5" />
                  {quest.difficulty}
                </div>
              )}
              {quest.duration && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-xs font-bold text-zinc-400">
                  <Clock className="w-3.5 h-3.5" />
                  {quest.duration}
                </div>
              )}
            </div>
          </div>

          {/* Title and description */}
          <div className="flex gap-6 mb-6">
            <div 
              className={cn(
                "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center flex-shrink-0",
                "bg-gradient-to-br", config.gradient
              )}
            >
              <Target className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
                {quest.title}
              </h1>
              <p className="text-zinc-400 text-sm sm:text-base">
                {quest.description}
              </p>
            </div>
          </div>

          {/* XP Reward */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gen-z-yellow/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-gen-z-yellow" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Récompense</p>
                <p className="text-2xl font-black text-white">+{quest.xp_reward} XP</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="rounded-xl text-zinc-400 hover:text-white"
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>

        {/* Progress (if in progress) */}
        {(isInProgress || isCompleted) && totalSteps > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-white">Progression</span>
              <span className="font-bold" style={{ color: config.color }}>
                {completedSteps}/{totalSteps} étapes
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </motion.div>
        )}

        {/* Steps */}
        {totalSteps > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-black uppercase tracking-wider text-zinc-500">Étapes</h2>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <motion.button
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  onClick={() => isInProgress && handleStepToggle(step.id)}
                  disabled={!isInProgress}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left",
                    step.completed
                      ? "bg-gen-z-mint/10 border-gen-z-mint/30"
                      : "bg-white/5 border-white/10 hover:bg-white/10",
                    !isInProgress && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                    step.completed
                      ? "bg-gen-z-mint text-black"
                      : "bg-white/10 text-zinc-500"
                  )}>
                    {step.completed ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-bold",
                      step.completed ? "text-gen-z-mint line-through" : "text-white"
                    )}>
                      {step.title}
                    </p>
                    {step.description && (
                      <p className="text-sm text-zinc-500 truncate">{step.description}</p>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="pt-4"
        >
          {isCompleted ? (
            <div className="flex items-center justify-center gap-4 p-6 rounded-3xl bg-gen-z-mint/20 border border-gen-z-mint/30">
              <Trophy className="w-8 h-8 text-gen-z-mint" />
              <div>
                <p className="text-xl font-black text-gen-z-mint">Quête Complétée !</p>
                <p className="text-sm text-gen-z-mint/70">+{quest.xp_reward} XP gagnés</p>
              </div>
            </div>
          ) : isInProgress ? (
            <Button
              onClick={handleComplete}
              disabled={isCompleting || (totalSteps > 0 && completedSteps < totalSteps)}
              className={cn(
                "w-full h-14 rounded-2xl text-lg font-black transition-all",
                "bg-gradient-to-r", config.gradient,
                "disabled:opacity-50"
              )}
            >
              {isCompleting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6 mr-2" />
                  Terminer la quête
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleStart}
              disabled={isStarting}
              className={cn(
                "w-full h-14 rounded-2xl text-lg font-black transition-all",
                "bg-gradient-to-r", config.gradient
              )}
            >
              {isStarting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Play className="w-6 h-6 mr-2" />
                  Commencer la quête
                </>
              )}
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  )
}
