export type OnboardingStep =
  | 'welcome'
  | 'showcase'
  | 'profile-type'
  | 'parent-setup'
  | 'teen-setup'
  | 'features'
  | 'completion'

export type UserType = 'parent' | 'teen' | null

export type StepValidation = {
  isValid: boolean
  errors: string[]
  completedAt?: string
}

export type OnboardingData = {
  userType: UserType
  parentData?: { firstName: string; lastName: string; email: string; phone: string }
  teenData?: { pseudo: string; parentEmail: string }
  analytics: {
    startedAt: string
    lastActiveAt: string
    timeSpentPerStep: Record<OnboardingStep, number>
    backNavigations: number
    stepAttempts: Record<OnboardingStep, number>
  }
}

export type OnboardingState = {
  currentStep: OnboardingStep
  completedSteps: OnboardingStep[]
  validations: Record<OnboardingStep, StepValidation>
  data: OnboardingData
  direction: 1 | -1
  isLoading: boolean
  isResuming: boolean
}

export type Reward =
  | { type: 'xp'; amount: number; reason?: string }
  | { type: 'badge'; badgeCode: string }
  | { type: 'coins'; amount: number }
  | { type: 'completion'; totalXP: number; badges: string[]; coins: number }

export type GamificationState = {
  tempUserId: string
  totalXP: number
  earnedBadges: string[]
  bonusCoins: number
  showReward: boolean
  currentReward: Reward | null
  isInitialized: boolean
  startedAt: number
}
