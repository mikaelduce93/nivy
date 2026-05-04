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

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ChevronRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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

export default function OnboardingPage() {
  const router = useRouter()
  const [lastXPGain, setLastXPGain] = useState(0)
  const [showXPAnimation, setShowXPAnimation] = useState(false)

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

  // Handle step completion and navigation
  const handleStepComplete = async () => {
    // Claim XP reward for current step
    await claimStepReward(currentStep)

    if (currentStep === 'completion') {
      // Show completion celebration before redirecting
      showCompletionCelebration()
      completeOnboarding()
      // Delay redirect to show celebration
      setTimeout(() => {
        router.push('/dashboard')
      }, 3000)
    } else {
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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className="flex-1">
            <ProgressIndicator
              currentStep={currentStep}
              completedSteps={completedSteps}
              userType={data.userType}
              progress={progress}
            />
          </div>
          {/* XP Display - Compact for header */}
          <div className="hidden sm:block">
            <OnboardingXPCompact
              currentXP={gamification.totalXP}
            />
          </div>
        </div>
      </div>

      {/* Skip Button */}
      {currentStep !== 'completion' && (
        <div className="fixed top-24 right-4 sm:right-6 z-40">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/auth/login')}
            className="text-muted-foreground hover:text-foreground"
          >
            Passer
            <ChevronRight className="w-4 h-4 ml-1" />
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
