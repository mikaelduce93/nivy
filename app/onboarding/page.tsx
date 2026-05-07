'use client'

/**
 * TEENS PARTY MOROCCO - Onboarding Page
 * =====================================
 *
 * Page d'onboarding complète avec:
 * - Transitions fluides entre étapes
 * - Persistance de l'état (reprise)
 * - Validation progressive
 * - Tracking UX analytics
 * - GAMIFICATION: XP, badges, tutoriel
 */

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ChevronRight, Loader2, SkipForward } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useJuice } from '@/lib/hooks/use-juice'

// Onboarding hook & components
import { useOnboarding } from '@/lib/hooks/use-onboarding'
import {
  StepTransition,
  ProgressIndicator,
  ResumePrompt,
} from '@/components/onboarding/onboarding-transition'

// Step components
import { WelcomeStep } from '@/components/onboarding/welcome-step'
import { ShowcaseStep } from '@/components/onboarding/showcase-step'
import { ProfileTypeStep } from '@/components/onboarding/profile-type-step'
import { ParentSetupStep } from '@/components/onboarding/parent-setup-step'
import { TeenSetupStep } from '@/components/onboarding/teen-setup-step'
import { FeaturesStep } from '@/components/onboarding/features-step'
import { CompletionStep } from '@/components/onboarding/completion-step'

// Gamification components
import {
  OnboardingXPDisplay,
  OnboardingXPCompact,
  OnboardingRewardPopup,
  OnboardingMissionsPreview,
} from '@/components/onboarding/gamification'

// Build full step list for "Étape X / N" labels (mirrors ProgressIndicator logic)
function buildStepList(userType: 'parent' | 'teen' | null): string[] {
  return [
    'welcome',
    'showcase',
    'profile-type',
    userType === 'teen' ? 'teen-setup' : 'parent-setup',
    'features',
    'completion',
  ]
}

export default function OnboardingPage() {
  const router = useRouter()
  const { play } = useJuice()

  const {
    // State
    currentStep,
    completedSteps,
    data,
    direction,
    progress,
    isLoading,
    isResuming,
    canGoNext,
    canGoBack,
    validations,

    // Actions
    goNext,
    goBack,
    selectUserType,
    validateStep,
    completeOnboarding,
    resetOnboarding,
    dismissResume,

    // Gamification
    gamification,
    claimStepReward,
    hideReward,
    showCompletionCelebration,
  } = useOnboarding()

  // Check if user is already authenticated
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // User is authenticated, redirect to dashboard
        router.push('/dashboard')
      }
    }

    checkAuth()
  }, [router])

  // Compute step index for "Étape X / N" label
  const stepList = useMemo(() => buildStepList(data.userType ?? null), [data.userType])
  const currentStepIndex = stepList.indexOf(currentStep)
  const stepNumber = currentStepIndex >= 0 ? currentStepIndex + 1 : 1
  const totalSteps = stepList.length

  // Handle step completion and navigation
  const handleStepComplete = async () => {
    // Claim XP reward for current step
    await claimStepReward(currentStep)

    if (currentStep === 'completion') {
      // Show completion celebration before redirecting
      showCompletionCelebration()
      // Final juice — confetti + sound + haptic
      play('level_up')
      completeOnboarding()
      // Wave 1.3: teens go through personalization steps before landing on dashboard.
      // Parents/partners and other roles continue to /dashboard as before.
      const personalizeNext = data.userType === 'teen'
        ? '/onboarding/interests'
        : '/dashboard'
      // Delay redirect to show celebration
      setTimeout(() => {
        router.push(personalizeNext)
      }, 3000)
    } else {
      // Subtle XP gain juice between steps (light haptic, sound only)
      play('xp_gain', { noConfetti: true })
      goNext()
    }
  }

  // Handle parent setup completion
  const handleParentSetupComplete = () => {
    validateStep('parent-setup', true)
    goNext()
  }

  // Handle teen setup completion
  const handleTeenSetupComplete = () => {
    validateStep('teen-setup', true)
    goNext()
  }

  // Handle profile type selection
  const handleProfileTypeSelect = (type: 'parent' | 'teen') => {
    selectUserType(type)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-purple-500/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-purple-500/5 flex flex-col">
      {/* Gamification Reward Popup */}
      <OnboardingRewardPopup
        reward={gamification.currentReward}
        onClose={hideReward}
        autoClose={gamification.currentReward?.type === 'xp'}
      />

      {/* Resume Prompt */}
      <AnimatePresence>
        {isResuming && (
          <ResumePrompt
            currentStep={currentStep}
            onContinue={dismissResume}
            onStartOver={resetOnboarding}
          />
        )}
      </AnimatePresence>

      {/* Progress Bar - Fixed at top */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* "Étape X / N" label - explicit progression visible from step 1 */}
          <div className="flex items-center justify-between mb-2">
            <p
              className="text-xs sm:text-sm font-bold tracking-wide text-foreground"
              aria-live="polite"
              aria-atomic="true"
            >
              Étape <span className="text-primary">{stepNumber}</span>
              <span className="text-muted-foreground"> / {totalSteps}</span>
            </p>
            {/* XP Display - Compact for header */}
            <div className="hidden sm:block">
              <OnboardingXPCompact currentXP={gamification.totalXP} />
            </div>
          </div>
          <div className="flex-1">
            <ProgressIndicator
              currentStep={currentStep}
              completedSteps={completedSteps}
              userType={data.userType}
              progress={progress}
            />
          </div>
        </div>
      </div>

      {/* Skip Button - explicit label */}
      {currentStep !== 'completion' && (
        <div className="fixed top-24 right-4 sm:right-6 z-40">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/auth/login')}
            className="text-muted-foreground hover:text-foreground gap-1"
            aria-label="Passer l'onboarding et aller à la connexion"
          >
            <SkipForward className="w-4 h-4" />
            <span className="hidden sm:inline">Passer cette étape</span>
            <span className="sm:hidden">Passer</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 pt-32">
        <div className="w-full max-w-6xl flex gap-6">
          {/* Main step content */}
          <div className="flex-1 max-w-4xl">
          <StepTransition direction={direction} stepKey={currentStep}>
            {/* Welcome Step */}
            {currentStep === 'welcome' && <WelcomeStep onNext={handleStepComplete} />}

            {/* Showcase Step */}
            {currentStep === 'showcase' && (
              <ShowcaseStep onNext={handleStepComplete} onBack={goBack} />
            )}

            {/* Profile Type Step */}
            {currentStep === 'profile-type' && (
              <ProfileTypeStep
                selectedType={data.userType}
                onSelect={handleProfileTypeSelect}
                onNext={handleStepComplete}
                onBack={goBack}
              />
            )}

            {/* Parent Setup Step */}
            {currentStep === 'parent-setup' && (
              <ParentSetupStep
                onNext={handleParentSetupComplete}
                onBack={goBack}
              />
            )}

            {/* Teen Setup Step */}
            {currentStep === 'teen-setup' && (
              <TeenSetupStep onNext={handleTeenSetupComplete} onBack={goBack} />
            )}

            {/* Features Step */}
            {currentStep === 'features' && (
              <FeaturesStep
                userType={data.userType}
                onNext={handleStepComplete}
                onBack={goBack}
              />
            )}

            {/* Completion Step */}
            {currentStep === 'completion' && (
              <CompletionStep
                userType={data.userType}
                onNext={handleStepComplete}
                gamificationData={{
                  totalXP: gamification.totalXP,
                  earnedBadges: gamification.earnedBadges,
                  bonusCoins: gamification.bonusCoins,
                }}
              />
            )}
          </StepTransition>
          </div>

          {/* Gamification Sidebar - Desktop only */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <OnboardingMissionsPreview
              currentStep={currentStep}
              completedSteps={completedSteps}
              earnedXP={gamification.totalXP}
            />
          </div>
        </div>
      </div>

      {/* Keyboard Navigation Hint */}
      <div className="hidden sm:block fixed bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/50">
        <kbd className="px-2 py-1 rounded bg-muted">←</kbd> Retour
        <span className="mx-2">|</span>
        <kbd className="px-2 py-1 rounded bg-muted">→</kbd> Suivant
        <span className="mx-2">|</span>
        <kbd className="px-2 py-1 rounded bg-muted">Esc</kbd> Passer
      </div>
    </div>
  )
}
