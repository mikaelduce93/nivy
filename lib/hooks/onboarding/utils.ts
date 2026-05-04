import { OnboardingStep, UserType, OnboardingState, OnboardingAnalytics } from "./types"

export const STORAGE_KEY = 'teen_club_onboarding'
export const GAMIFICATION_KEY = 'teen_club_onboarding_gamification'

export const getNextStep = (current: OnboardingStep, userType: UserType): OnboardingStep | null => {
  switch (current) {
    case 'welcome':
    case 'showcase': return 'profile-type'
    case 'profile-type': return userType === 'parent' ? 'parent-setup' : 'teen-setup'
    case 'parent-setup':
    case 'teen-setup':
    case 'features': return 'completion'
    default: return null
  }
}

export const getPreviousStep = (current: OnboardingStep, userType: UserType): OnboardingStep | null => {
  switch (current) {
    case 'showcase': return 'welcome'
    case 'parent-setup':
    case 'teen-setup': return 'profile-type'
    case 'features':
    case 'completion': return userType === 'parent' ? 'parent-setup' : 'teen-setup'
    default: return null
  }
}

export const calculateProgress = (step: OnboardingStep, userType: UserType): number => {
  const steps: OnboardingStep[] = ['profile-type', userType === 'parent' ? 'parent-setup' : 'teen-setup', 'completion']
  const index = steps.indexOf(step)
  return index === -1 ? 0 : ((index + 1) / steps.length) * 100
}

export function trackEvent(event: string, data: Record<string, any>) {
  if (process.env.NODE_ENV === 'development') console.log(`[Onboarding Track] ${event}`, data)
  if (typeof window !== 'undefined') {
    if ((window as any).gtag) (window as any).gtag('event', event, { event_category: 'onboarding', ...data })
    if ((window as any).posthog) (window as any).posthog.capture(event, data)
    window.dispatchEvent(new CustomEvent('onboarding_event', { detail: { event, data, timestamp: new Date().toISOString() } }))
  }
}

export function getStepRewardReason(step: OnboardingStep): string {
  const reasons: Record<string, string> = {
    welcome: 'Bienvenue!',
    showcase: 'Découverte des activités',
    'profile-type': 'Choix de profil',
    'parent-setup': 'Profil configuré',
    'teen-setup': 'Profil configuré',
    features: 'Fonctionnalités explorées',
    completion: 'Onboarding terminé!',
  }
  return reasons[step] || 'Étape complétée'
}
