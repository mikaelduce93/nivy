'use client'

/**
 * TEENS PARTY MOROCCO - Onboarding Transitions
 * ============================================
 *
 * Composants de transition fluides pour l'onboarding:
 * - StepTransition: Wrapper animé pour les étapes
 * - ProgressIndicator: Indicateur de progression amélioré
 * - ResumePrompt: Prompt de reprise de session
 */

import { motion, AnimatePresence, Variants } from 'framer-motion'
import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Check, RefreshCw, Clock, ChevronRight } from 'lucide-react'
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
    description: 'Découvre Teen Club',
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
  completedSteps,
  userType,
  progress,
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

  return (
    <div className="w-full">
      {/* Progress Bar */}
      <div className="relative h-2 bg-secondary/30 rounded-full overflow-hidden mb-6">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-purple-500 to-pink-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        />
      </div>

      {/* Step Dots */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step)
          const isCurrent = currentStep === step
          const config = STEP_CONFIG[step]

          return (
            <div
              key={`${step}-${index}`}
              className="flex flex-col items-center gap-2"
            >
              {/* Dot */}
              <motion.div
                className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  isCompleted
                    ? 'bg-primary border-primary text-white'
                    : isCurrent
                    ? 'bg-background border-primary text-primary'
                    : 'bg-background border-muted text-muted-foreground'
                }`}
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.1 }}
                  >
                    <Check className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <span className="text-lg">{config.icon}</span>
                )}

                {/* Pulse effect for current step */}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [1, 0, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  />
                )}
              </motion.div>

              {/* Label (hidden on mobile) */}
              <div className="hidden sm:block text-center">
                <p
                  className={`text-xs font-medium ${
                    isCurrent ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {config.label}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Current step description */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mt-4"
      >
        <p className="text-sm text-muted-foreground">
          {STEP_CONFIG[currentStep]?.description}
        </p>
      </motion.div>
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
    >
      <Card className="w-full max-w-md p-6 shadow-2xl border-2">
        <div className="text-center space-y-4">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10"
          >
            <Clock className="w-8 h-8 text-primary" />
          </motion.div>

          {/* Title */}
          <div>
            <h3 className="text-xl font-bold mb-2">Reprendre l'inscription ?</h3>
            <p className="text-muted-foreground text-sm">
              Vous avez commencé votre inscription. Voulez-vous continuer où vous
              en étiez ?
            </p>
          </div>

          {/* Current step info */}
          <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-secondary/50">
            <span className="text-xl">{config?.icon}</span>
            <span className="font-medium">{config?.label}</span>
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
              onClick={onContinue}
              className="flex-1 gap-2 bg-gradient-to-r from-primary to-purple-500 text-white"
            >
              Continuer
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
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

export function StepHeader({ icon, iconGradient, title, subtitle }: StepHeaderProps) {
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
        className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br ${iconGradient} mb-4`}
      >
        {icon}
      </motion.div>

      <h2 className="text-3xl sm:text-4xl font-black mb-3">{title}</h2>

      {subtitle && (
        <p className="text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
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
        onClick={onNext}
        disabled={!canGoNext || isLoading}
        className="gap-2 bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 text-white disabled:opacity-50"
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
