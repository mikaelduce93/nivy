/* ==========================================================================
   DESIGN SYSTEM - Silicon Valley Grade
   
   Central export for all design system utilities.
   Import from '@/lib/design-system' in components.
   ========================================================================== */

// Tokens
export {
  tokens,
  spacing,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  duration,
  easing,
  springPresets,
  zIndex,
  radius,
  shadow,
  blur,
  touchTarget,
  type Spacing,
  type FontSize,
  type FontWeight,
  type Duration,
  type Easing,
  type ZIndex,
  type Radius,
} from './tokens'

// Colors
export {
  palette,
  semantic,
  gradients,
  cssVariables as colorCssVariables,
  type ColorPalette,
  type SemanticColors,
  type Gradients,
} from './colors'

// Motion
export {
  transitions,
  cardMotion,
  cardVariants,
  staggerContainer,
  staggerItem,
  fadeVariants,
  slideUp,
  slideDown,
  slideLeft,
  slideRight,
  scaleIn,
  microInteractions,
  pageTransition,
  modalOverlay,
  modalContent,
  counterConfig,
  skeletonShimmer,
  getReducedMotionVariants,
  cssAnimations,
} from './motion'

// Breakpoints
export {
  breakpointValues,
  breakpoints,
  mediaQueries,
  containerWidths,
  contentWidths,
  sidebarWidths,
  isMobile,
  isTablet,
  isDesktop,
  isTouchDevice,
  prefersReducedMotion,
  getCurrentBreakpoint,
  matchesBreakpoint,
  cssVariables as breakpointCssVariables,
  type Breakpoint,
} from './breakpoints'

// Performance utilities
export {
  useDebouncedHover,
  useThrottledMousePosition,
  useInView,
  usePrefersReducedMotion,
  useDevicePerformance,
  useParticlePositions,
  useWillChange,
  useFPSMonitor,
} from './performance'

// Default export with all modules
import tokens from './tokens'
import colors from './colors'
import motion from './motion'
import breakpoints from './breakpoints'
import performance from './performance'

export const designSystem = {
  tokens,
  colors,
  motion,
  breakpoints,
  performance,
} as const

export default designSystem
