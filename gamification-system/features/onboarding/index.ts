/**
 * TEENS PARTY MOROCCO - Onboarding Gamification Module
 * ====================================================
 *
 * Export centralisé du module onboarding gamifié.
 */

// Schema & Types
export * from './schema'

// Server Actions
export {
  initOnboardingProgress,
  recordStepCompletion,
  getOnboardingProgress,
  syncOnboardingToUser,
} from './actions'
