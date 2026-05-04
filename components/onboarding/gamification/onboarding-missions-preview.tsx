'use client'

/**
 * TEENS PARTY MOROCCO - Onboarding Missions Preview
 * =================================================
 *
 * Sidebar montrant les missions d'onboarding avec:
 * - Liste des étapes avec statut
 * - XP à gagner par étape
 * - Progression visuelle
 */

import { motion } from 'framer-motion'
import {
  Hand,
  Compass,
  GitBranch,
  UserCheck,
  Sparkles,
  PartyPopper,
  Check,
  Zap,
  Gift,
  Award,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  STEP_XP_REWARDS,
  TOTAL_ONBOARDING_XP,
  type OnboardingStep,
} from '@/gamification-system/features/onboarding/schema'

interface OnboardingMissionsPreviewProps {
  currentStep: OnboardingStep
  completedSteps: OnboardingStep[]
  earnedXP: number
  className?: string
}

// Map steps to icons
const STEP_ICONS: Record<string, React.ReactNode> = {
  welcome: <Hand className="w-4 h-4" />,
  showcase: <Compass className="w-4 h-4" />,
  'profile-type': <GitBranch className="w-4 h-4" />,
  'parent-setup': <UserCheck className="w-4 h-4" />,
  'teen-setup': <UserCheck className="w-4 h-4" />,
  features: <Sparkles className="w-4 h-4" />,
  completion: <PartyPopper className="w-4 h-4" />,
}

const STEP_NAMES: Record<string, string> = {
  welcome: 'Bienvenue',
  showcase: 'Découverte',
  'profile-type': 'Choix profil',
  'parent-setup': 'Configuration',
  'teen-setup': 'Configuration',
  features: 'Fonctionnalités',
  completion: 'Terminé!',
}

export function OnboardingMissionsPreview({
  currentStep,
  completedSteps,
  earnedXP,
  className,
}: OnboardingMissionsPreviewProps) {
  // Get visible steps (exclude the one not used based on flow)
  const visibleSteps: OnboardingStep[] = [
    'welcome',
    'showcase',
    'profile-type',
    // We'll show either parent-setup or teen-setup depending on what's in completedSteps
    completedSteps.includes('parent-setup') || currentStep === 'parent-setup'
      ? 'parent-setup'
      : 'teen-setup',
    'features',
    'completion',
  ]

  const percentage = Math.min((earnedXP / TOTAL_ONBOARDING_XP) * 100, 100)

  return (
    <motion.div
      className={cn(
        'bg-zinc-900/80 backdrop-blur-lg border border-zinc-800 rounded-2xl p-5',
        className
      )}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm">Missions Onboarding</h3>
          <p className="text-zinc-500 text-xs">{earnedXP} / {TOTAL_ONBOARDING_XP} XP</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-5">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Missions list */}
      <div className="space-y-2">
        {visibleSteps.map((step, index) => {
          const isCompleted = completedSteps.includes(step)
          const isCurrent = step === currentStep
          const xp = STEP_XP_REWARDS[step] || 0

          return (
            <motion.div
              key={step}
              className={cn(
                'flex items-center gap-3 p-2.5 rounded-xl transition-colors',
                isCurrent
                  ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30'
                  : isCompleted
                    ? 'bg-zinc-800/30'
                    : 'bg-transparent opacity-50'
              )}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: isCompleted || isCurrent ? 1 : 0.5, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Step indicator */}
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center',
                  isCompleted
                    ? 'bg-green-500'
                    : isCurrent
                      ? 'bg-gradient-to-br from-cyan-500 to-blue-600'
                      : 'bg-zinc-700'
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <span className="text-white">{STEP_ICONS[step]}</span>
                )}
              </div>

              {/* Step name */}
              <span
                className={cn(
                  'flex-1 text-sm font-medium',
                  isCurrent ? 'text-cyan-400' : isCompleted ? 'text-zinc-400' : 'text-zinc-500'
                )}
              >
                {STEP_NAMES[step]}
              </span>

              {/* XP reward */}
              <div
                className={cn(
                  'flex items-center gap-1 text-xs',
                  isCompleted ? 'text-green-400' : isCurrent ? 'text-cyan-400' : 'text-zinc-600'
                )}
              >
                {isCompleted ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>+{xp}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3" />
                    <span>{xp} XP</span>
                  </>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Bonus rewards preview */}
      <div className="mt-5 pt-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-500 mb-3">Bonus à la fin</p>
        <div className="flex gap-3">
          {/* Coins bonus */}
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
            <Gift className="w-4 h-4 text-yellow-500" />
            <span className="text-yellow-400 text-sm font-medium">+50 Coins</span>
          </div>

          {/* Badge */}
          <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
            <Award className="w-4 h-4 text-purple-500" />
            <span className="text-purple-400 text-sm font-medium">2 Badges</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
