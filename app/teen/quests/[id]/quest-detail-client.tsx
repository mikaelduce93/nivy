'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SegmentedProgress } from '@/components/ui/progress'
import { StickerCard } from '@/components/ui/sticker-card'
import { NivCelebration } from '@/components/brand'
import { MeshBackground } from '@/components/ui/effects/mesh-background'
import { cn } from '@/lib/utils'
import { useOptimisticRunner } from '@/lib/hooks/use-optimistic-mutation'
import { useJuice } from '@/lib/hooks/use-juice'
import { toast } from '@/lib/utils/toast'

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
    accent: 'text-teal',
    label: 'Cerveau',
  },
  vitality: {
    icon: Dumbbell,
    accent: 'text-lime',
    label: 'Corps',
  },
  creativity: {
    icon: Palette,
    accent: 'text-pink',
    label: 'Créa',
  },
  social: {
    icon: Users,
    accent: 'text-coral',
    label: 'Social',
  },
}

export function QuestDetailClient({ quest, teenId }: QuestDetailClientProps) {
  const router = useRouter()
  const [isStarting, setIsStarting] = useState(false)
  const [steps, setSteps] = useState<QuestStep[]>(quest.steps || [])
  const [currentStatus, setCurrentStatus] = useState(quest.status)
  // Optimistic XP delta — reflects the +50 (or quest reward) added immediately,
  // then reconciled with the server response. Negative if the server rolls back.
  const [optimisticXpDelta, setOptimisticXpDelta] = useState<number>(0)
  const { play: playJuice } = useJuice()

  const config = PILLAR_CONFIG[quest.pillar] || PILLAR_CONFIG.intellect
  const Icon = config.icon

  const completedSteps = steps.filter(s => s.completed).length
  const totalSteps = steps.length

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

  // Optimistic quest completion — immediate UI update + server reconciliation
  // with automatic rollback if the network call fails.
  const completeRunner = useOptimisticRunner<
    void,
    { success: boolean; xpEarned: number; type: string },
    { previousStatus: string; previousXpDelta: number }
  >(
    async () => {
      const response = await fetch('/api/teen/quests/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId: quest.id, teenId }),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      return (await response.json()) as { success: boolean; xpEarned: number; type: string }
    },
    {
      onMutate: () => {
        // 1. Snapshot for rollback.
        const ctx = { previousStatus: currentStatus, previousXpDelta: optimisticXpDelta }
        // 2. Optimistic UI: mark as completed AND surface +XP immediately.
        setCurrentStatus('completed')
        setOptimisticXpDelta((d) => d + (quest.xp_reward || 50))
        // 3. Juice: fire quest_complete celebration BEFORE network round-trip.
        playJuice('quest_complete')
        return ctx
      },
      onError: (_error, _input, ctx) => {
        // Rollback: restore status + XP to pre-mutation snapshot.
        if (ctx) {
          setCurrentStatus(ctx.previousStatus)
          setOptimisticXpDelta(ctx.previousXpDelta)
        }
        toast.error('La quête n\'a pas pu être validée. Réessaie dans un instant.')
      },
      onSuccess: (output) => {
        // Reconcile: server may have awarded a different amount (capped, etc.).
        if (output && typeof output.xpEarned === 'number') {
          setOptimisticXpDelta((d) => {
            // Replace the optimistic delta we added with the authoritative one.
            const optimisticAdded = quest.xp_reward || 50
            return d - optimisticAdded + output.xpEarned
          })
        }
        toast.success(`+${output?.xpEarned ?? quest.xp_reward} XP gagnés !`)
      },
    }
  )

  const isCompleting = completeRunner.isPending

  const handleComplete = () => {
    completeRunner.mutate(undefined as void)
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
    <div className="relative min-h-screen bg-paper text-ink">
      {/* Fond mesh crème conforme (remplace les radial blur bannis) */}
      <MeshBackground className="z-0" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-mute transition-colors hover:text-ink"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Retour aux quêtes</span>
        </button>

        {/* Header Card */}
        {/* TICKET-024 — destination half of the View Transitions morph.
            Pairs with the DefiCard on /teen/quests (same `vt-quest-${id}`).
            The browser auto-tweens the card → hero on navigation. */}
        <StickerCard
          className="p-6 sm:p-8"
          style={{ viewTransitionName: `vt-quest-${quest.id}` }}
        >
          {/* Pillar badge */}
          <div className="mb-6 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider shadow-stkr-sm">
              <Icon className={cn('w-4 h-4', config.accent)} />
              <span className={config.accent}>{config.label}</span>
            </div>

            <div className="flex items-center gap-2">
              {quest.difficulty && (
                <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-white px-3 py-1 text-xs font-bold text-mute">
                  <Flame className="w-3.5 h-3.5" />
                  {quest.difficulty}
                </div>
              )}
              {quest.duration && (
                <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-white px-3 py-1 text-xs font-bold text-mute">
                  <Clock className="w-3.5 h-3.5" />
                  {quest.duration}
                </div>
              )}
            </div>
          </div>

          {/* Title and description */}
          <div className="mb-6 flex gap-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-white sm:h-20 sm:w-20">
              <Target className={cn('h-8 w-8 sm:h-10 sm:w-10', config.accent)} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="mb-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                {quest.title}
              </h1>
              <p className="text-mute text-sm sm:text-base">
                {quest.description}
              </p>
            </div>
          </div>

          {/* XP Reward */}
          <div className="flex items-center justify-between rounded-2xl border-2 border-ink bg-white p-4 shadow-stkr-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-ink bg-white">
                <Zap className="h-6 w-6 text-gold" />
              </div>
              <div>
                <p className="eyebrow text-mute">Récompense</p>
                <p className="font-display text-2xl font-extrabold text-gold tabular-nums">+{quest.xp_reward} XP</p>
                {optimisticXpDelta > 0 && (
                  <p
                    className="mt-1 text-xs font-bold text-lime"
                    aria-live="polite"
                  >
                    +{optimisticXpDelta} XP gagnés
                  </p>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="text-mute hover:text-ink"
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </StickerCard>

        {/* Moment de pic — level-up : Niv proud + confettis au succès */}
        {isCompleted && (
          <NivCelebration
            title="Quête terminée"
            value={`+${optimisticXpDelta || quest.xp_reward} XP`}
            caption="Bien joué ! Ton XP grimpe."
            tone="gold"
            palette="levelup"
            trigger={isCompleted}
          />
        )}

        {/* Progress (if in progress) */}
        {isInProgress && totalSteps > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-ink">Progression</span>
              <span className={cn('font-bold', config.accent)}>
                {completedSteps}/{totalSteps} étapes
              </span>
            </div>
            <SegmentedProgress steps={totalSteps} current={completedSteps} />
          </div>
        )}

        {/* Steps */}
        {totalSteps > 0 && (
          <div className="space-y-4">
            <h2 className="eyebrow text-mute">Étapes</h2>
            <div className="space-y-3">
              {steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => isInProgress && handleStepToggle(step.id)}
                  disabled={!isInProgress}
                  className={cn(
                    'flex w-full items-center gap-4 rounded-2xl border-2 border-ink bg-white p-4 text-left shadow-stkr-sm transition-all',
                    step.completed && 'shadow-stkr-pink',
                    !isInProgress && 'opacity-60 cursor-not-allowed',
                  )}
                >
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink',
                    step.completed ? 'bg-lime text-ink' : 'bg-white text-mute',
                  )}>
                    {step.completed ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      'font-bold',
                      step.completed ? 'text-mute line-through' : 'text-ink',
                    )}>
                      {step.title}
                    </p>
                    {step.description && (
                      <p className="truncate text-sm text-mute">{step.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-4">
          {isCompleted ? (
            <div className="flex items-center justify-center gap-4 rounded-2xl border-2 border-ink bg-white p-6 shadow-stkr-pink">
              <Trophy className="h-8 w-8 text-lime" />
              <div>
                <p className="font-display text-xl font-extrabold text-ink">Quête terminée !</p>
                <p className="text-sm text-mute">+{quest.xp_reward} XP gagnés</p>
              </div>
            </div>
          ) : isInProgress ? (
            <Button
              variant="pink"
              onClick={handleComplete}
              disabled={isCompleting || (totalSteps > 0 && completedSteps < totalSteps)}
              className="h-14 w-full rounded-2xl text-lg font-bold"
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
              variant="pink"
              onClick={handleStart}
              disabled={isStarting}
              className="h-14 w-full rounded-2xl text-lg font-bold"
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
        </div>
      </div>
    </div>
  )
}
