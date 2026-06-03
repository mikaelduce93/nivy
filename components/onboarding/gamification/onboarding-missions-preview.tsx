'use client'

/**
 * Nivy - Onboarding Missions Preview
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
  completion: 'Terminé !',
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
        'rounded-2xl border-2 border-ink bg-white p-5 shadow-stkr-md',
        className
      )}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full border-2 border-ink bg-teal flex items-center justify-center">
          <Zap className="w-4 h-4 text-ink" />
        </div>
        <div>
          <h3 className="text-ink font-display font-extrabold text-sm">Missions Onboarding</h3>
          <p className="text-mute font-mono text-xs">{earnedXP} / {TOTAL_ONBOARDING_XP} XP</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 bg-ink/10 rounded-full border-2 border-ink overflow-hidden mb-5">
        <motion.div
          className="h-full bg-pink rounded-full"
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
                'flex items-center gap-3 p-2.5 rounded-xl border-2 transition-colors',
                isCurrent
                  ? 'border-ink bg-teal/15'
                  : isCompleted
                    ? 'border-line bg-paper-2'
                    : 'border-transparent bg-transparent opacity-50'
              )}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: isCompleted || isCurrent ? 1 : 0.5, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Step indicator */}
              <div
                className={cn(
                  'w-7 h-7 rounded-full border-2 border-ink flex items-center justify-center',
                  isCompleted
                    ? 'bg-lime'
                    : isCurrent
                      ? 'bg-teal'
                      : 'bg-paper-2'
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 text-ink" />
                ) : (
                  <span className="text-ink">{STEP_ICONS[step]}</span>
                )}
              </div>

              {/* Step name */}
              <span
                className={cn(
                  'flex-1 text-sm font-medium',
                  isCurrent ? 'text-ink' : 'text-mute'
                )}
              >
                {STEP_NAMES[step]}
              </span>

              {/* XP reward */}
              <div
                className={cn(
                  'flex items-center gap-1 font-mono text-xs',
                  isCompleted ? 'text-lime' : isCurrent ? 'text-teal' : 'text-mute'
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
      <div className="mt-5 pt-4 border-t-2 border-ink">
        <p className="font-mono text-xs uppercase tracking-wide text-mute mb-3">Bonus à la fin</p>
        <div className="flex gap-3">
          {/* Coins bonus */}
          <div className="flex items-center gap-2 rounded-lg border-2 border-ink bg-coral/15 px-3 py-2">
            <Gift className="w-4 h-4 text-coral" />
            <span className="text-ink text-sm font-bold">+50 Coins</span>
          </div>

          {/* Badge */}
          <div className="flex items-center gap-2 rounded-lg border-2 border-ink bg-pink/15 px-3 py-2">
            <Award className="w-4 h-4 text-pink" />
            <span className="text-ink text-sm font-bold">2 Badges</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
