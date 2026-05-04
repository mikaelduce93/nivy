/* ==========================================================================
   BREAKPOINT SYSTEM - Consistent Responsive Design
   
   Mobile-first breakpoints aligned with Tailwind CSS defaults.
   Use these EVERYWHERE instead of arbitrary values.
   ========================================================================== */

/**
 * Breakpoint values in pixels
 */
export const breakpointValues = {
  /** Small phones (portrait) */
  xs: 375,
  /** Large phones (landscape) */
  sm: 640,
  /** Tablets (portrait) */
  md: 768,
  /** Tablets (landscape) / Small laptops */
  lg: 1024,
  /** Desktops */
  xl: 1280,
  /** Large desktops / Wide screens */
  '2xl': 1536,
} as const

/**
 * Breakpoint strings for CSS media queries
 */
export const breakpoints = {
  xs: `${breakpointValues.xs}px`,
  sm: `${breakpointValues.sm}px`,
  md: `${breakpointValues.md}px`,
  lg: `${breakpointValues.lg}px`,
  xl: `${breakpointValues.xl}px`,
  '2xl': `${breakpointValues['2xl']}px`,
} as const

/**
 * Media query strings (min-width, mobile-first)
 */
export const mediaQueries = {
  xs: `(min-width: ${breakpoints.xs})`,
  sm: `(min-width: ${breakpoints.sm})`,
  md: `(min-width: ${breakpoints.md})`,
  lg: `(min-width: ${breakpoints.lg})`,
  xl: `(min-width: ${breakpoints.xl})`,
  '2xl': `(min-width: ${breakpoints['2xl']})`,
  
  // Max-width queries (for edge cases)
  maxSm: `(max-width: ${breakpointValues.sm - 1}px)`,
  maxMd: `(max-width: ${breakpointValues.md - 1}px)`,
  maxLg: `(max-width: ${breakpointValues.lg - 1}px)`,
  maxXl: `(max-width: ${breakpointValues.xl - 1}px)`,
  
  // Range queries
  smOnly: `(min-width: ${breakpoints.sm}) and (max-width: ${breakpointValues.md - 1}px)`,
  mdOnly: `(min-width: ${breakpoints.md}) and (max-width: ${breakpointValues.lg - 1}px)`,
  lgOnly: `(min-width: ${breakpoints.lg}) and (max-width: ${breakpointValues.xl - 1}px)`,
  
  // Special queries
  mobile: `(max-width: ${breakpointValues.md - 1}px)`,
  tablet: `(min-width: ${breakpoints.md}) and (max-width: ${breakpointValues.lg - 1}px)`,
  desktop: `(min-width: ${breakpoints.lg})`,
  
  // Device capabilities
  touch: '(hover: none) and (pointer: coarse)',
  mouse: '(hover: hover) and (pointer: fine)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  highContrast: '(prefers-contrast: more)',
  darkMode: '(prefers-color-scheme: dark)',
  lightMode: '(prefers-color-scheme: light)',
  
  // Orientation
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
} as const

/**
 * Device type detection utilities (client-side only)
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < breakpointValues.md
}

export function isTablet(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= breakpointValues.md && window.innerWidth < breakpointValues.lg
}

export function isDesktop(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= breakpointValues.lg
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(mediaQueries.reducedMotion).matches
}

/**
 * Get current breakpoint name
 */
export function getCurrentBreakpoint(): keyof typeof breakpointValues {
  if (typeof window === 'undefined') return 'md'
  
  const width = window.innerWidth
  
  if (width >= breakpointValues['2xl']) return '2xl'
  if (width >= breakpointValues.xl) return 'xl'
  if (width >= breakpointValues.lg) return 'lg'
  if (width >= breakpointValues.md) return 'md'
  if (width >= breakpointValues.sm) return 'sm'
  return 'xs'
}

/**
 * Check if current viewport matches a breakpoint (min-width)
 */
export function matchesBreakpoint(breakpoint: keyof typeof breakpointValues): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= breakpointValues[breakpoint]
}

/**
 * Container max-widths for centered layouts
 */
export const containerWidths = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1400px', // Slightly narrower than viewport for breathing room
} as const

/**
 * Recommended content widths for readability
 */
export const contentWidths = {
  /** Narrow text content (65-75 chars) */
  prose: '65ch',
  /** Standard content width */
  content: '720px',
  /** Wide content */
  wide: '1024px',
  /** Full container */
  full: '100%',
} as const

/**
 * Sidebar widths
 */
export const sidebarWidths = {
  collapsed: '64px',
  compact: '240px',
  default: '280px',
  wide: '320px',
} as const

/**
 * CSS custom properties for breakpoints
 */
export const cssVariables = `
  --breakpoint-xs: ${breakpoints.xs};
  --breakpoint-sm: ${breakpoints.sm};
  --breakpoint-md: ${breakpoints.md};
  --breakpoint-lg: ${breakpoints.lg};
  --breakpoint-xl: ${breakpoints.xl};
  --breakpoint-2xl: ${breakpoints['2xl']};
  
  --container-sm: ${containerWidths.sm};
  --container-md: ${containerWidths.md};
  --container-lg: ${containerWidths.lg};
  --container-xl: ${containerWidths.xl};
  --container-2xl: ${containerWidths['2xl']};
`

export type Breakpoint = keyof typeof breakpointValues

export default {
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
  cssVariables,
}
