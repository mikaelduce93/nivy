'use client'

/**
 * Nivy - Onboarding Transitions
 * =============================
 *
 * Composants de transition fluides pour l'onboarding:
 * - StepTransition: Wrapper animé pour les étapes
 * - ProgressIndicator: Indicateur de progression amélioré
 * - ResumePrompt: Prompt de reprise de session
 */

import { motion, AnimatePresence, Variants } from 'framer-motion'
import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { StickerCard } from '@/components/ui/sticker-card'
import { SegmentedProgress } from '@/components/ui/progress'
import { RefreshCw, Clock, ChevronRight } from 'lucide-react'
import type { OnboardingStep, UserType } from '@/lib/hooks/use-onboarding'

/* ==========================================================================
   STEP TRANSITION
   ========================================================================== */

interface StepTransitionProps {
  children: ReactNode
  direction: 1 | -1
  stepKey: string
}

const slideVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95,
  }),
}

const fadeVariants: Variants = {
  enter: {
    opacity: 0,
    y: 20,
  },
  center: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -20,
  },
}

export function StepTransition({ children, direction, stepKey }: StepTransitionProps) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={stepKey}
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: 'spring', stiffness: 400, damping: 35 },
          opacity: { duration: 0.25 },
          scale: { duration: 0.25 },
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export function FadeTransition({ children, stepKey }: { children: ReactNode; stepKey: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        variants={fadeVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/* ==========================================================================
   PROGRESS INDICATOR
   ========================================================================== */

interface ProgressIndicatorProps {
  currentStep: OnboardingStep
  completedSteps: OnboardingStep[]
  userType: UserType
  progress: number
}

const STEP_CONFIG: Record<
  string,
  { label: string; icon: string; description: string }
> = {
  welcome: {
    label: 'Bienvenue',
    icon: '👋',
    description: 'Bienvenue sur Nivy',
  },
  showcase: {
    label: 'Fonctionnalités',
    icon: '✨',
    description: 'Ce qui t\'attend',
  },
  'profile-type': {
    label: 'Type de compte',
    icon: '👤',
    description: 'Parent ou Ado ?',
  },
  'parent-setup': {
    label: 'Inscription',
    icon: '🔐',
    description: 'Créez votre compte',
  },
  'teen-setup': {
    label: 'Inscription',
    icon: '🎮',
    description: 'Crée ton profil',
  },
  features: {
    label: 'Découverte',
    icon: '🚀',
    description: 'Explorez les fonctionnalités',
  },
  completion: {
    label: 'Terminé',
    icon: '🎉',
    description: 'Vous êtes prêt !',
  },
}

export function ProgressIndicator({
  currentStep,
  userType,
}: ProgressIndicatorProps) {
  // Build step list based on user type
  const steps: OnboardingStep[] = [
    'welcome',
    'showcase',
    'profile-type',
    userType === 'parent' ? 'parent-setup' : userType === 'teen' ? 'teen-setup' : 'parent-setup',
    'features',
    'completion',
  ]

  const currentIndex = steps.indexOf(currentStep)
  const activeIndex = currentIndex >= 0 ? currentIndex : 0
  const config = STEP_CONFIG[currentStep]

  return (
    <div className="w-full">
      {/* Segmented progress charte */}
      <SegmentedProgress steps={steps.length} current={activeIndex} size="md" />

      {/* Current step label + description */}
      <div className="mt-3 text-center">
        {config?.label ? (
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink">
            {config.label}
          </p>
        ) : null}
        {config?.description ? (
          <p className="mt-1 text-sm text-mute">{config.description}</p>
        ) : null}
      </div>
    </div>
  )
}

/* ==========================================================================
   RESUME PROMPT
   ========================================================================== */

interface ResumePromptProps {
  currentStep: OnboardingStep
  onContinue: () => void
  onStartOver: () => void
}

export function ResumePrompt({ currentStep, onContinue, onStartOver }: ResumePromptProps) {
  const config = STEP_CONFIG[currentStep]

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40"
    >
      <StickerCard className="w-full max-w-md p-6">
        <div className="text-center space-y-4">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-ink bg-pink/15">
            <Clock className="w-8 h-8 text-pink" />
          </div>

          {/* Title */}
          <div>
            <h3 className="font-display text-xl font-extrabold tracking-tight text-ink mb-2">
              Reprendre ton inscription ?
            </h3>
            <p className="text-mute text-sm">
              Tu as déjà commencé ton inscription sur Nivy. On reprend là où tu
              t&apos;es arrêté ?
            </p>
          </div>

          {/* Current step info */}
          <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-ink bg-paper">
            <span className="text-xl">{config?.icon}</span>
            <span className="font-semibold text-ink">{config?.label}</span>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onStartOver}
              className="flex-1 gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Recommencer
            </Button>
            <Button
              variant="pink"
              onClick={onContinue}
              className="flex-1 gap-2"
            >
              Continuer
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </StickerCard>
    </motion.div>
  )
}

/* ==========================================================================
   STEP HEADER
   ========================================================================== */

interface StepHeaderProps {
  icon: ReactNode
  iconGradient: string
  title: string
  subtitle?: string
}

export function StepHeader({ icon, title, subtitle }: StepHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center mb-8"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-ink bg-pink mb-4"
      >
        {icon}
      </motion.div>

      <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink mb-3">{title}</h2>

      {subtitle && (
        <p className="text-mute max-w-2xl mx-auto">{subtitle}</p>
      )}
    </motion.div>
  )
}

/* ==========================================================================
   STEP NAVIGATION
   ========================================================================== */

interface StepNavigationProps {
  onBack?: () => void
  onNext: () => void
  canGoBack: boolean
  canGoNext: boolean
  isLoading?: boolean
  nextLabel?: string
  backLabel?: string
}

export function StepNavigation({
  onBack,
  onNext,
  canGoBack,
  canGoNext,
  isLoading = false,
  nextLabel = 'Continuer',
  backLabel = 'Retour',
}: StepNavigationProps) {
  return (
    <div className="flex items-center justify-between gap-4 pt-6">
      {canGoBack && onBack ? (
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="gap-2"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          {backLabel}
        </Button>
      ) : (
        <div />
      )}

      <Button
        variant="pink"
        onClick={onNext}
        disabled={!canGoNext || isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw className="w-4 h-4" />
            </motion.div>
            Chargement...
          </>
        ) : (
          <>
            {nextLabel}
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </Button>
    </div>
  )
}
