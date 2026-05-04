/* ==========================================================================
   DESIGN TOKENS - Silicon Valley Grade Design System
   
   A professional token system inspired by Vercel's Geist Design.
   Use these tokens EVERYWHERE - never use arbitrary values.
   ========================================================================== */

/**
 * Spacing scale using 4px base unit
 * Based on 8-point grid system used by Apple, Google, Material Design
 */
export const spacing = {
  /** 4px - Micro spacing for icons, inline elements */
  xs: '0.25rem',
  /** 8px - Tight spacing for compact elements */
  sm: '0.5rem',
  /** 12px - Small gap spacing */
  '1.5': '0.75rem',
  /** 16px - Default spacing, form elements */
  md: '1rem',
  /** 20px - Medium-tight spacing */
  '1.25': '1.25rem',
  /** 24px - Section spacing */
  lg: '1.5rem',
  /** 32px - Large section spacing */
  xl: '2rem',
  /** 40px - Extra large spacing */
  '2.5xl': '2.5rem',
  /** 48px - Major section divisions */
  '2xl': '3rem',
  /** 64px - Page-level spacing */
  '3xl': '4rem',
  /** 80px - Hero sections */
  '4xl': '5rem',
  /** 96px - Maximum spacing */
  '5xl': '6rem',
} as const

/**
 * Typography scale using Major Third ratio (1.250)
 * Perfect for mobile-first designs with good readability
 */
export const fontSize = {
  /** 10px - Micro labels, badges */
  '2xs': '0.625rem',
  /** 11px - Small captions */
  xs: '0.6875rem',
  /** 13px - Secondary text, labels */
  sm: '0.8125rem',
  /** 16px - Body text (base) */
  base: '1rem',
  /** 18px - Lead paragraphs */
  lg: '1.125rem',
  /** 20px - Small headings */
  xl: '1.25rem',
  /** 24px - Section headings */
  '2xl': '1.5rem',
  /** 30px - Major headings */
  '3xl': '1.875rem',
  /** 36px - Page titles */
  '4xl': '2.25rem',
  /** 48px - Hero headings */
  '5xl': '3rem',
  /** 60px - Display headings */
  '6xl': '3.75rem',
  /** 72px - Giant display */
  '7xl': '4.5rem',
} as const

/**
 * Font weights following standard naming
 */
export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const

/**
 * Line heights for typography
 */
export const lineHeight = {
  /** Tight - Headings */
  none: '1',
  tight: '1.1',
  snug: '1.25',
  /** Normal - Body text */
  normal: '1.5',
  relaxed: '1.625',
  /** Loose - Long-form reading */
  loose: '1.75',
  /** Extra loose - Accessibility */
  '2': '2',
} as const

/**
 * Letter spacing for typography
 */
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
  /** All-caps tracking */
  caps: '0.15em',
} as const

/**
 * Animation duration scale
 * Based on Google Material Design timing guidelines
 */
export const duration = {
  /** 50ms - Immediate feedback (button press) */
  instant: 50,
  /** 100ms - Micro-interactions (hover states) */
  faster: 100,
  /** 150ms - Quick transitions (tooltips) */
  fast: 150,
  /** 200ms - Standard transitions (cards) */
  normal: 200,
  /** 300ms - Deliberate transitions (modals) */
  slow: 300,
  /** 400ms - Complex animations (page transitions) */
  slower: 400,
  /** 500ms - Dramatic animations (celebrations) */
  slowest: 500,
  /** 1000ms - Very slow (loading states) */
  glacial: 1000,
} as const

/**
 * Easing curves for natural motion
 * Follows CSS cubic-bezier specification
 */
export const easing = {
  /** Standard ease - Most transitions */
  ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  /** Ease in - Elements leaving */
  easeIn: 'cubic-bezier(0.42, 0, 1, 1)',
  /** Ease out - Elements entering */
  easeOut: 'cubic-bezier(0, 0, 0.58, 1)',
  /** Ease in-out - Symmetric transitions */
  easeInOut: 'cubic-bezier(0.42, 0, 0.58, 1)',
  /** Spring - Playful, bouncy feel (Gen-Z favorite) */
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  /** Smooth - Very smooth deceleration */
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Snappy - Quick response */
  snappy: 'cubic-bezier(0.2, 0, 0, 1)',
  /** Bounce - Overshoot and settle */
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  /** Linear - Constant speed (loading bars) */
  linear: 'linear',
} as const

/**
 * Framer Motion spring presets
 */
export const springPresets = {
  /** Gentle - Slow, smooth */
  gentle: { stiffness: 100, damping: 20, mass: 1 },
  /** Default - Balanced */
  default: { stiffness: 200, damping: 25, mass: 1 },
  /** Snappy - Quick response */
  snappy: { stiffness: 400, damping: 30, mass: 1 },
  /** Bouncy - Playful overshoot */
  bouncy: { stiffness: 300, damping: 15, mass: 1 },
  /** Stiff - Minimal movement */
  stiff: { stiffness: 500, damping: 35, mass: 1 },
} as const

/**
 * Z-index scale - Never use arbitrary numbers!
 * Each layer has clear purpose and relationships
 */
export const zIndex = {
  /** Below everything - Hidden/background layers */
  hide: -1,
  /** Default layer */
  base: 0,
  /** Slightly raised - Cards on hover */
  raised: 1,
  /** Dropdown menus */
  dropdown: 10,
  /** Sticky elements (headers) */
  sticky: 20,
  /** Fixed elements (floating buttons) */
  fixed: 30,
  /** Overlay backgrounds */
  overlay: 40,
  /** Modal dialogs */
  modal: 50,
  /** Popovers */
  popover: 60,
  /** Tooltips (highest common) */
  tooltip: 70,
  /** Toast notifications */
  toast: 80,
  /** Maximum - Debug overlays only */
  max: 9999,
} as const

/**
 * Border radius scale
 */
export const radius = {
  none: '0',
  sm: '0.25rem',    // 4px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.25rem', // 20px
  '3xl': '1.5rem',  // 24px
  '4xl': '2rem',    // 32px
  full: '9999px',   // Pill shape
} as const

/**
 * Shadow scale - Elevation system
 */
export const shadow = {
  none: 'none',
  /** Subtle - Resting cards */
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  /** Default - Interactive cards */
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  /** Raised - Hovered cards */
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  /** Elevated - Dropdowns, popovers */
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  /** Floating - Modals */
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  /** Glow effects */
  glow: {
    lavender: '0 0 40px oklch(0.75 0.15 290 / 0.3)',
    coral: '0 0 40px oklch(0.70 0.20 25 / 0.3)',
    mint: '0 0 40px oklch(0.85 0.15 160 / 0.3)',
    yellow: '0 0 40px oklch(0.90 0.18 95 / 0.3)',
  },
} as const

/**
 * Blur scale for backdrop effects
 */
export const blur = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  '3xl': '40px',
} as const

/**
 * Touch target sizes (WCAG 2.1 compliance)
 */
export const touchTarget = {
  /** Minimum touch target (WCAG AA) */
  min: '44px',
  /** Comfortable touch target */
  comfortable: '48px',
  /** Large touch target (elderly/accessibility) */
  large: '56px',
} as const

/**
 * Complete tokens export
 */
export const tokens = {
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
} as const

export type Spacing = keyof typeof spacing
export type FontSize = keyof typeof fontSize
export type FontWeight = keyof typeof fontWeight
export type Duration = keyof typeof duration
export type Easing = keyof typeof easing
export type ZIndex = keyof typeof zIndex
export type Radius = keyof typeof radius

export default tokens
