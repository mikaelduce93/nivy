/**
 * TEENS PARTY MOROCCO - Custom Hooks
 * ==================================
 *
 * Export centralisé des hooks personnalisés.
 */

// Onboarding hooks
export {
  useOnboarding,
  getOnboardingAnalytics,
  type OnboardingStep,
  type UserType,
  type OnboardingState,
  type OnboardingData,
} from './use-onboarding'

// Notifications hooks
export {
  useNotifications,
  useServiceWorker,
  type Notification,
  type NotificationType,
  type NotificationPriority,
} from './use-notifications'

// Re-export online status hook from components
export { useOnlineStatus } from '@/components/ui/states/offline-indicator'

// Gamification hooks
export {
  useGamification,
  useXP,
  useStreak,
  useDailyChallenges,
  type XPData,
  type StreakData,
  type Achievement,
  type DailyChallenge,
  type XPGainEvent,
  type AchievementUnlockEvent,
  type GamificationState,
} from './use-gamification'

// Secure form hooks
export {
  useSecureForm,
  useContactForm,
  useSearchForm,
  useSubmitButton,
  type UseSecureFormOptions,
  type UseSecureFormReturn,
  type SecureFormState,
  type SecureFormProps,
} from './use-secure-form'

// Pillars hooks
export { usePillars } from './use-pillars'

// Presence hooks
export {
  usePresence,
  type PresenceStatus,
  type UserPresence,
  type FriendPresence,
  type PresenceState,
  type PresenceChangeEvent,
  type UsePresenceOptions,
} from './use-presence'

// Scroll reveal hooks
export {
  useScrollReveal,
  useScrollProgress,
  useParallax,
  useStaggeredReveal,
  useScrollDirection,
  useScrollPosition,
  getRevealStyles,
  REVEAL_PRESETS,
  type RevealPreset,
  type RevealStyles,
} from './use-scroll-reveal'

// Haptic hooks
export { useHaptic } from './use-haptic'

// Touch-optimized interactions
export {
  useTouchOptimized,
  useTapFeedback,
  type TouchState,
  type UseTouchOptimizedOptions,
  type UseTouchOptimizedReturn,
} from './use-touch-optimized'

// Reduced motion (accessibility)
export {
  useReducedMotion,
  usePrefersReducedMotion,
  ReducedMotionProvider,
  type ReducedMotionSettings,
  type ReducedMotionContextValue,
} from './use-reduced-motion'
