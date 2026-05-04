import { OnboardingState, OnboardingStep, UserType, OnboardingData } from "./types"
import { getNextStep, getPreviousStep, trackEvent } from "./utils"

export type OnboardingAction =
  | { type: 'LOAD_STATE'; state: OnboardingState }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'GO_NEXT' }
  | { type: 'GO_BACK' }
  | { type: 'SELECT_USER_TYPE'; userType: UserType }
  | { type: 'UPDATE_PARENT_DATA'; data: Partial<OnboardingData['parentData']> }
  | { type: 'UPDATE_TEEN_DATA'; data: Partial<OnboardingData['teenData']> }
  | { type: 'VALIDATE_STEP'; step: OnboardingStep; isValid: boolean; errors: string[] }
  | { type: 'RESET' }
  | { type: 'DISMISS_RESUME' }
  | { type: 'UPDATE_ANALYTICS'; elapsed: number }

export const INITIAL_ANALYTICS: OnboardingData['analytics'] = {
  startedAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  timeSpentPerStep: { welcome: 0, showcase: 0, 'profile-type': 0, 'parent-setup': 0, 'teen-setup': 0, features: 0, completion: 0 },
  backNavigations: 0,
  stepAttempts: { welcome: 0, showcase: 0, 'profile-type': 0, 'parent-setup': 0, 'teen-setup': 0, features: 0, completion: 0 },
}

export const INITIAL_STATE: OnboardingState = {
  currentStep: 'profile-type',
  completedSteps: [],
  validations: {
    welcome: { isValid: true, errors: [] },
    showcase: { isValid: true, errors: [] },
    'profile-type': { isValid: false, errors: ['Sélectionnez un type de profil'] },
    'parent-setup': { isValid: false, errors: [] },
    'teen-setup': { isValid: false, errors: [] },
    features: { isValid: true, errors: [] },
    completion: { isValid: true, errors: [] },
  },
  data: { userType: null, analytics: INITIAL_ANALYTICS },
  direction: 1,
  isLoading: true,
  isResuming: false,
}

export function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...action.state, isLoading: false, isResuming: true }
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading }
    case 'GO_NEXT': {
      const nextStep = getNextStep(state.currentStep, state.data.userType)
      if (!nextStep || !state.validations[state.currentStep].isValid) return state
      return {
        ...state,
        currentStep: nextStep,
        completedSteps: state.completedSteps.includes(state.currentStep) ? state.completedSteps : [...state.completedSteps, state.currentStep],
        direction: 1,
        data: {
          ...state.data,
          analytics: { ...state.data.analytics, stepAttempts: { ...state.data.analytics.stepAttempts, [nextStep]: (state.data.analytics.stepAttempts[nextStep] || 0) + 1 } }
        }
      }
    }
    case 'GO_BACK': {
      const prevStep = getPreviousStep(state.currentStep, state.data.userType)
      if (!prevStep) return state
      return {
        ...state,
        currentStep: prevStep,
        direction: -1,
        data: { ...state.data, analytics: { ...state.data.analytics, backNavigations: state.data.analytics.backNavigations + 1 } }
      }
    }
    case 'SELECT_USER_TYPE':
      return {
        ...state,
        data: { ...state.data, userType: action.userType },
        validations: { ...state.validations, 'profile-type': { isValid: !!action.userType, errors: action.userType ? [] : ['Sélectionnez un type de profil'] } }
      }
    case 'UPDATE_PARENT_DATA':
      return {
        ...state,
        data: { ...state.data, parentData: { ...(state.data.parentData || { firstName: '', lastName: '', email: '', phone: '' }), ...action.data } }
      }
    case 'UPDATE_TEEN_DATA':
      return {
        ...state,
        data: { ...state.data, teenData: { ...(state.data.teenData || { pseudo: '', parentEmail: '' }), ...action.data } }
      }
    case 'VALIDATE_STEP':
      return {
        ...state,
        validations: { ...state.validations, [action.step]: { isValid: action.isValid, errors: action.errors, completedAt: action.isValid ? new Date().toISOString() : undefined } }
      }
    case 'RESET':
      return { ...INITIAL_STATE, isLoading: false, data: { ...INITIAL_STATE.data, analytics: { ...INITIAL_ANALYTICS, startedAt: new Date().toISOString() } } }
    case 'DISMISS_RESUME':
      return { ...state, isResuming: false }
    case 'UPDATE_ANALYTICS':
      return {
        ...state,
        data: {
          ...state.data,
          analytics: {
            ...state.data.analytics,
            timeSpentPerStep: { ...state.data.analytics.timeSpentPerStep, [state.currentStep]: (state.data.analytics.timeSpentPerStep[state.currentStep] || 0) + action.elapsed }
          }
        }
      }
    default:
      return state
  }
}
