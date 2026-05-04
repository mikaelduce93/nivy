'use client'

import { useEffect, useCallback, useRef, useReducer, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  initOnboardingProgress,
  recordStepCompletion,
  syncOnboardingToUser,
} from '@/gamification-system/features/onboarding/actions'
import { STEP_XP_REWARDS } from '@/gamification-system/features/onboarding/schema'
import { OnboardingStep, UserType, OnboardingData, OnboardingState, Reward, GamificationState } from './onboarding/types'
import { onboardingReducer, INITIAL_STATE, INITIAL_ANALYTICS } from './onboarding/reducer'
import { STORAGE_KEY, GAMIFICATION_KEY, getPreviousStep, calculateProgress, trackEvent, getStepRewardReason } from './onboarding/utils'

export * from './onboarding/types'

const INITIAL_GAMIFICATION: GamificationState = {
  tempUserId: '', totalXP: 0, earnedBadges: [], bonusCoins: 0,
  showReward: false, currentReward: null, isInitialized: false, startedAt: Date.now()
}

export function useOnboarding() {
  const [state, dispatch] = useReducer(onboardingReducer, INITIAL_STATE)
  const [stepStartTime, setStepStartTime] = useState<number>(Date.now())
  const [gamification, setGamification] = useState<GamificationState>(INITIAL_GAMIFICATION)
  const rewardQueueRef = useRef<Reward[]>([])
  const isProcessingRewardRef = useRef(false)

  // Initialization
  useEffect(() => {
    const load = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        const savedGamification = localStorage.getItem(GAMIFICATION_KEY)

        let tempUserId = ''
        if (savedGamification) {
          const parsed = JSON.parse(savedGamification)
          tempUserId = parsed.tempUserId
          setGamification({ ...parsed, showReward: false, currentReward: null })
        } else {
          tempUserId = uuidv4()
          const newGamification = { ...INITIAL_GAMIFICATION, tempUserId, startedAt: Date.now() }
          setGamification(newGamification)
          localStorage.setItem(GAMIFICATION_KEY, JSON.stringify(newGamification))
        }

        if (tempUserId) {
          const result = await initOnboardingProgress({ tempUserId })
          if (result.success) {
            setGamification(prev => ({ ...prev, isInitialized: true }))
            if (result.data?.progress) {
              const db = result.data.progress
              setGamification(prev => ({ ...prev, totalXP: db.accumulatedXp || prev.totalXP, earnedBadges: db.earnedBadges || prev.earnedBadges, bonusCoins: db.bonusCoins || prev.bonusCoins }))
            }
          }
        }

        if (saved) {
          const parsed = JSON.parse(saved) as OnboardingState
          const hoursAgo = (Date.now() - new Date(parsed.data.analytics.lastActiveAt).getTime()) / (1000 * 60 * 60)
          if (hoursAgo < 24 && parsed.currentStep !== 'completion') {
            dispatch({ type: 'LOAD_STATE', state: parsed })
            trackEvent('onboarding_resumed', { step: parsed.currentStep, hoursAgo: Math.round(hoursAgo) })
            return
          }
        }
      } catch (e) { console.warn('[useOnboarding] Error loading state:', e) }
      
      dispatch({ type: 'SET_LOADING', isLoading: false })
      trackEvent('onboarding_started', {})
    }
    load()
  }, [])

  // Persistence
  useEffect(() => {
    if (!state.isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, data: { ...state.data, analytics: { ...state.data.analytics, lastActiveAt: new Date().toISOString() } } }))
    }
  }, [state])

  useEffect(() => {
    if (gamification.tempUserId) {
      localStorage.setItem(GAMIFICATION_KEY, JSON.stringify({ ...gamification, showReward: false, currentReward: null }))
    }
  }, [gamification.totalXP, gamification.earnedBadges, gamification.bonusCoins, gamification.tempUserId])

  // Reward Processing
  const processNextReward = useCallback(() => {
    if (isProcessingRewardRef.current || rewardQueueRef.current.length === 0) return
    isProcessingRewardRef.current = true
    const nextReward = rewardQueueRef.current.shift()
    if (nextReward) setGamification(prev => ({ ...prev, showReward: true, currentReward: nextReward }))
  }, [])

  const queueReward = useCallback((reward: Reward) => {
    rewardQueueRef.current.push(reward)
    if (!isProcessingRewardRef.current) processNextReward()
  }, [processNextReward])

  const hideReward = useCallback(() => {
    setGamification(prev => ({ ...prev, showReward: false, currentReward: null }))
    isProcessingRewardRef.current = false
    setTimeout(processNextReward, 300)
  }, [processNextReward])

  // Actions
  const claimStepReward = useCallback(async (step: OnboardingStep) => {
    if (!gamification.tempUserId || !gamification.isInitialized) return
    const xpReward = STEP_XP_REWARDS[step] || 0
    if (xpReward === 0) return
    try {
      const result = await recordStepCompletion({ tempUserId: gamification.tempUserId, step, userType: state.data.userType || undefined })
      if (result.success && result.data) {
        const { xpGained, totalXp, earnedBadges, bonusCoins } = result.data
        setGamification(prev => ({ ...prev, totalXP: totalXp, earnedBadges, bonusCoins }))
        queueReward({ type: 'xp', amount: xpGained, reason: getStepRewardReason(step) })
        earnedBadges.filter(b => !gamification.earnedBadges.includes(b)).forEach(badge => {
          setTimeout(() => queueReward({ type: 'badge', badgeCode: badge }), 2500)
        })
        trackEvent('onboarding_xp_gained', { step, xp: xpGained, total: totalXp })
      }
    } catch (e) { console.error('[useOnboarding] Error claiming reward:', e) }
  }, [gamification.tempUserId, gamification.isInitialized, gamification.earnedBadges, state.data.userType, queueReward])

  const syncGamificationToUser = useCallback(async (teenId: string) => {
    if (!gamification.tempUserId) return { success: false }
    try {
      const result = await syncOnboardingToUser({ tempUserId: gamification.tempUserId, teenId })
      if (result.success) {
        localStorage.removeItem(GAMIFICATION_KEY)
        trackEvent('onboarding_gamification_synced', { teenId, xp: result.data?.xpSynced, badges: result.data?.badgesSynced })
      }
      return result
    } catch (e) { return { success: false, error: 'Sync failed' } }
  }, [gamification.tempUserId])

  const showCompletionCelebration = useCallback(() => {
    queueReward({ type: 'completion', totalXP: gamification.totalXP, badges: gamification.earnedBadges, coins: gamification.bonusCoins })
  }, [gamification.totalXP, gamification.earnedBadges, gamification.bonusCoins, queueReward])

  // Tracking
  useEffect(() => {
    if (!state.isLoading) {
      const elapsed = Date.now() - stepStartTime
      setStepStartTime(Date.now())
      if (elapsed > 0 && elapsed < 300000) dispatch({ type: 'UPDATE_ANALYTICS', elapsed })
    }
  }, [state.currentStep])

  // Navigation
  const goNext = useCallback(() => {
    if (!state.validations[state.currentStep].isValid) {
      trackEvent('onboarding_validation_failed', { step: state.currentStep, errors: state.validations[state.currentStep].errors })
      return
    }
    const nextStep = getPreviousStep(state.currentStep, state.data.userType) // Fixed in reducer GO_NEXT
    dispatch({ type: 'GO_NEXT' })
    trackEvent('onboarding_step_completed', { step: state.currentStep })
  }, [state.currentStep, state.data.userType, state.validations])

  const goBack = useCallback(() => {
    dispatch({ type: 'GO_BACK' })
    trackEvent('onboarding_back_navigation', { from: state.currentStep })
  }, [state.currentStep])

  return {
    ...state,
    progress: calculateProgress(state.currentStep, state.data.userType),
    canGoNext: state.validations[state.currentStep].isValid,
    canGoBack: !!getPreviousStep(state.currentStep, state.data.userType),
    goNext,
    goBack,
    selectUserType: (userType: UserType) => {
      dispatch({ type: 'SELECT_USER_TYPE', userType })
      trackEvent('onboarding_user_type_selected', { type: userType })
    },
    updateParentData: (data: Partial<OnboardingData['parentData']>) => dispatch({ type: 'UPDATE_PARENT_DATA', data }),
    updateTeenData: (data: Partial<OnboardingData['teenData']>) => dispatch({ type: 'UPDATE_TEEN_DATA', data }),
    validateStep: (step: OnboardingStep, isValid: boolean, errors: string[] = []) => dispatch({ type: 'VALIDATE_STEP', step, isValid, errors }),
    completeOnboarding: () => {
      localStorage.removeItem(STORAGE_KEY)
      trackEvent('onboarding_completed', { userType: state.data.userType })
    },
    resetOnboarding: () => {
      localStorage.removeItem(STORAGE_KEY)
      dispatch({ type: 'RESET' })
      trackEvent('onboarding_reset', {})
    },
    dismissResume: () => dispatch({ type: 'DISMISS_RESUME' }),
    gamification,
    claimStepReward,
    hideReward,
    syncGamificationToUser,
    showCompletionCelebration,
  }
}

export function getOnboardingAnalytics(state: OnboardingState) {
  const totalTime = Object.values(state.data.analytics.timeSpentPerStep).reduce((a, b) => a + b, 0)
  return {
    sessionId: state.data.analytics.startedAt,
    startedAt: state.data.analytics.startedAt,
    stepsVisited: Object.entries(state.data.analytics.stepAttempts).filter(([_, count]) => count > 0).map(([step]) => step as OnboardingStep),
    stepsCompleted: state.completedSteps,
    dropOffStep: state.currentStep === 'completion' ? null : state.currentStep,
    totalTimeMs: totalTime,
    timePerStep: state.data.analytics.timeSpentPerStep,
    backNavigations: state.data.analytics.backNavigations,
    completed: state.currentStep === 'completion',
    userType: state.data.userType,
    convertedAt: state.completedSteps.includes('completion') ? state.validations.completion.completedAt || null : null,
  }
}
