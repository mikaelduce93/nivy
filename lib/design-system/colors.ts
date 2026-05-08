/* ==========================================================================
   COLOR SYSTEM - Gen-Z Palette with Semantic Meaning
   
   Uses OKLCH color space for perceptually uniform colors.
   All colors are WCAG AA compliant for their intended use.
   ========================================================================== */

/**
 * Base Gen-Z Palette - Muted neon aesthetic
 * These are the raw colors - use semantic tokens in components
 */
export const palette = {
  // Primary accent colors
  lavender: {
    50: 'oklch(0.95 0.03 290)',
    100: 'oklch(0.90 0.06 290)',
    200: 'oklch(0.85 0.10 290)',
    300: 'oklch(0.80 0.12 290)',
    400: 'oklch(0.75 0.15 290)',  // Primary
    500: 'oklch(0.70 0.17 290)',
    600: 'oklch(0.60 0.18 290)',
    700: 'oklch(0.50 0.16 290)',
    800: 'oklch(0.40 0.12 290)',
    900: 'oklch(0.30 0.08 290)',
  },
  
  coral: {
    50: 'oklch(0.95 0.04 25)',
    100: 'oklch(0.90 0.08 25)',
    200: 'oklch(0.85 0.12 25)',
    300: 'oklch(0.80 0.16 25)',
    400: 'oklch(0.75 0.18 25)',
    500: 'oklch(0.70 0.20 25)',   // Primary
    600: 'oklch(0.60 0.20 25)',
    700: 'oklch(0.50 0.18 25)',
    800: 'oklch(0.40 0.14 25)',
    900: 'oklch(0.30 0.10 25)',
  },
  
  mint: {
    50: 'oklch(0.97 0.03 160)',
    100: 'oklch(0.95 0.06 160)',
    200: 'oklch(0.92 0.10 160)',
    300: 'oklch(0.88 0.13 160)',
    400: 'oklch(0.85 0.15 160)',  // Primary
    500: 'oklch(0.78 0.16 160)',
    600: 'oklch(0.65 0.15 160)',
    700: 'oklch(0.52 0.12 160)',
    800: 'oklch(0.40 0.10 160)',
    900: 'oklch(0.28 0.06 160)',
  },
  
  yellow: {
    50: 'oklch(0.98 0.04 95)',
    100: 'oklch(0.96 0.08 95)',
    200: 'oklch(0.94 0.12 95)',
    300: 'oklch(0.92 0.15 95)',
    400: 'oklch(0.90 0.18 95)',   // Primary
    500: 'oklch(0.85 0.18 95)',
    600: 'oklch(0.75 0.16 95)',
    700: 'oklch(0.60 0.14 95)',
    800: 'oklch(0.45 0.10 95)',
    900: 'oklch(0.30 0.06 95)',
  },
  
  grape: {
    50: 'oklch(0.95 0.04 300)',
    100: 'oklch(0.88 0.08 300)',
    200: 'oklch(0.78 0.12 300)',
    300: 'oklch(0.68 0.16 300)',
    400: 'oklch(0.60 0.18 300)',
    500: 'oklch(0.55 0.20 300)',  // Primary
    600: 'oklch(0.48 0.18 300)',
    700: 'oklch(0.40 0.15 300)',
    800: 'oklch(0.32 0.12 300)',
    900: 'oklch(0.24 0.08 300)',
  },
  
  lime: {
    50: 'oklch(0.97 0.04 130)',
    100: 'oklch(0.94 0.08 130)',
    200: 'oklch(0.90 0.12 130)',
    300: 'oklch(0.85 0.15 130)',
    400: 'oklch(0.82 0.18 130)',  // Primary
    500: 'oklch(0.75 0.18 130)',
    600: 'oklch(0.65 0.16 130)',
    700: 'oklch(0.52 0.14 130)',
    800: 'oklch(0.40 0.10 130)',
    900: 'oklch(0.28 0.06 130)',
  },
  
  // Neutral grays (slightly purple-tinted for Gen-Z aesthetic)
  zinc: {
    50: 'oklch(0.98 0.005 290)',
    100: 'oklch(0.95 0.008 290)',
    200: 'oklch(0.90 0.010 290)',
    300: 'oklch(0.80 0.012 290)',
    400: 'oklch(0.65 0.015 290)',
    500: 'oklch(0.50 0.015 290)',
    600: 'oklch(0.40 0.012 290)',
    700: 'oklch(0.30 0.010 290)',
    800: 'oklch(0.20 0.015 290)',
    850: 'oklch(0.16 0.018 290)',
    900: 'oklch(0.13 0.020 290)',
    925: 'oklch(0.10 0.018 290)',
    950: 'oklch(0.08 0.015 290)',
  },
} as const

/**
 * Semantic color tokens - Use these in components!
 * Names describe PURPOSE, not appearance
 */
export const semantic = {
  // Brand colors
  primary: palette.lavender[400],
  secondary: palette.coral[500],
  accent: palette.mint[400],
  
  // Status colors
  success: palette.mint[500],
  warning: palette.yellow[500],
  danger: palette.coral[600],
  info: palette.lavender[500],
  
  // Interactive states (for primary color)
  interactive: {
    default: palette.lavender[400],
    hover: palette.lavender[300],
    active: palette.lavender[500],
    focus: palette.lavender[400],
    disabled: palette.zinc[600],
  },
  
  // Surface hierarchy (dark theme)
  surface: {
    /** Page background */
    base: 'oklch(0.08 0.015 290)',
    /** Slightly raised - main content area */
    subtle: 'oklch(0.10 0.018 290)',
    /** Cards, containers */
    raised: 'oklch(0.13 0.020 290)',
    /** Elevated - hovered cards */
    elevated: 'oklch(0.16 0.022 290)',
    /** Overlay backgrounds */
    overlay: 'oklch(0.18 0.025 290)',
    /** Glass effect base */
    glass: 'oklch(0.15 0.020 290 / 0.8)',
    /** High contrast surface */
    highlight: 'oklch(0.20 0.025 290)',
  },
  
  // Text hierarchy (WCAG AA compliant on dark backgrounds)
  text: {
    /** Primary text - headings, important content (contrast 15.5:1) */
    primary: 'oklch(0.98 0 0)',
    /** Secondary text - body, descriptions (contrast 7.2:1) */
    secondary: 'oklch(0.78 0.02 290)',
    /** Tertiary text - labels, metadata (contrast 4.6:1) */
    tertiary: 'oklch(0.62 0.02 290)',
    /** Muted text - placeholders, hints (contrast 3.1:1) */
    muted: 'oklch(0.50 0.02 290)',
    /** Disabled text (contrast 2.5:1 - intentionally low) */
    disabled: 'oklch(0.42 0.01 290)',
    /** Inverted text for light backgrounds */
    inverted: 'oklch(0.15 0.02 290)',
  },
  
  // Border colors
  border: {
    /** Subtle borders - dividers */
    subtle: 'oklch(0.25 0.02 290 / 0.5)',
    /** Default borders - inputs, cards */
    default: 'oklch(0.30 0.02 290 / 0.6)',
    /** Stronger borders - focus states */
    strong: 'oklch(0.40 0.03 290 / 0.8)',
    /** Interactive borders */
    interactive: palette.lavender[400],
    /** Error borders */
    error: palette.coral[500],
    /** Success borders */
    success: palette.mint[500],
  },
  
  // XP and gamification pillar colors
  pillars: {
    social: {
      primary: palette.coral[500],
      secondary: palette.coral[300],
      background: 'oklch(0.70 0.20 25 / 0.15)',
      glow: 'oklch(0.70 0.20 25 / 0.4)',
    },
    education: {
      primary: palette.lavender[400],
      secondary: palette.lavender[300],
      background: 'oklch(0.75 0.15 290 / 0.15)',
      glow: 'oklch(0.75 0.15 290 / 0.4)',
    },
    sports: {
      primary: palette.mint[400],
      secondary: palette.mint[300],
      background: 'oklch(0.85 0.15 160 / 0.15)',
      glow: 'oklch(0.85 0.15 160 / 0.4)',
    },
    culture: {
      primary: palette.yellow[400],
      secondary: palette.yellow[300],
      background: 'oklch(0.90 0.18 95 / 0.15)',
      glow: 'oklch(0.90 0.18 95 / 0.4)',
    },
    community: {
      primary: palette.grape[500],
      secondary: palette.grape[300],
      background: 'oklch(0.55 0.20 300 / 0.15)',
      glow: 'oklch(0.55 0.20 300 / 0.4)',
    },
  },
  
  // Tier colors for gamification
  tiers: {
    bronze: {
      primary: 'oklch(0.65 0.12 55)',
      glow: 'oklch(0.65 0.12 55 / 0.4)',
    },
    silver: {
      primary: 'oklch(0.75 0.02 290)',
      glow: 'oklch(0.75 0.02 290 / 0.4)',
    },
    gold: {
      primary: 'oklch(0.80 0.15 85)',
      glow: 'oklch(0.80 0.15 85 / 0.4)',
    },
    platinum: {
      primary: 'oklch(0.85 0.08 210)',
      glow: 'oklch(0.85 0.08 210 / 0.4)',
    },
    diamond: {
      primary: 'oklch(0.88 0.12 220)',
      glow: 'oklch(0.88 0.12 220 / 0.4)',
    },
  },
} as const

/**
 * Gradient presets
 */
export const gradients = {
  // Primary gradients
  lavender: 'linear-gradient(135deg, oklch(0.75 0.15 290) 0%, oklch(0.65 0.18 310) 100%)',
  coral: 'linear-gradient(135deg, oklch(0.70 0.20 25) 0%, oklch(0.65 0.22 15) 100%)',
  mint: 'linear-gradient(135deg, oklch(0.85 0.15 160) 0%, oklch(0.78 0.16 145) 100%)',
  yellow: 'linear-gradient(135deg, oklch(0.90 0.18 95) 0%, oklch(0.85 0.20 80) 100%)',
  
  // Special gradients
  holographic: 'linear-gradient(135deg, oklch(0.75 0.15 290) 0%, oklch(0.85 0.15 160) 50%, oklch(0.90 0.18 95) 100%)',
  sunset: 'linear-gradient(135deg, oklch(0.70 0.20 25) 0%, oklch(0.75 0.15 290) 100%)',
  aurora: 'linear-gradient(135deg, oklch(0.55 0.20 300) 0%, oklch(0.75 0.15 290) 50%, oklch(0.85 0.15 160) 100%)',
  
  // Background gradients
  subtle: 'radial-gradient(ellipse at 50% 0%, oklch(0.15 0.03 290) 0%, oklch(0.08 0.015 290) 100%)',
  mesh: 'radial-gradient(at 40% 20%, oklch(0.20 0.04 290 / 0.4) 0px, transparent 50%), radial-gradient(at 80% 0%, oklch(0.18 0.03 160 / 0.3) 0px, transparent 50%), radial-gradient(at 0% 50%, oklch(0.16 0.04 25 / 0.3) 0px, transparent 50%)',
} as const

/**
 * Semantic soft aliases (V1.3 design-system reconciliation — TICKET-048).
 * Same OKLCH values as the four most-used gen-z-* decorative tokens, exposed
 * under role-based names so feature code can drop the "gen-z" vocabulary.
 *
 * NOTE: The canonical runtime values come from `app/globals.css` (which is
 * theme-aware: light/dark variants). The constants below are a TS mirror for
 * TS consumers (charts, server-rendered SVGs, fixtures). Keep in sync with
 * globals.css if either side changes.
 */
export const semanticSoft = {
  brandSoft: palette.lavender[300],   // ≈ oklch(0.75 0.12 290) — gen-z-lavender
  accentSoft: 'oklch(0.72 0.14 25)',  // gen-z-coral
  successSoft: 'oklch(0.80 0.12 165)', // gen-z-mint
  infoSoft: 'oklch(0.78 0.12 230)',    // gen-z-sky
} as const

/**
 * CSS custom properties for use in stylesheets
 */
export const cssVariables = `
  /* Gen-Z Palette (legacy — prefer semantic soft aliases below) */
  --gen-z-lavender: ${palette.lavender[400]};
  --gen-z-coral: ${palette.coral[500]};
  --gen-z-mint: ${palette.mint[400]};
  --gen-z-yellow: ${palette.yellow[400]};
  --gen-z-grape: ${palette.grape[500]};
  --gen-z-lime: ${palette.lime[400]};

  /* Semantic Soft Aliases (V1.3 reconciliation — TICKET-048) */
  --brand-soft: ${semanticSoft.brandSoft};
  --accent-soft: ${semanticSoft.accentSoft};
  --success-soft: ${semanticSoft.successSoft};
  --info-soft: ${semanticSoft.infoSoft};
  
  /* Semantic Colors */
  --color-primary: ${semantic.primary};
  --color-secondary: ${semantic.secondary};
  --color-accent: ${semantic.accent};
  --color-success: ${semantic.success};
  --color-warning: ${semantic.warning};
  --color-danger: ${semantic.danger};
  
  /* Surfaces */
  --surface-base: ${semantic.surface.base};
  --surface-raised: ${semantic.surface.raised};
  --surface-overlay: ${semantic.surface.overlay};
  
  /* Text */
  --text-primary: ${semantic.text.primary};
  --text-secondary: ${semantic.text.secondary};
  --text-tertiary: ${semantic.text.tertiary};
  --text-muted: ${semantic.text.muted};
  
  /* Borders */
  --border-subtle: ${semantic.border.subtle};
  --border-default: ${semantic.border.default};
  --border-strong: ${semantic.border.strong};
`

export type ColorPalette = typeof palette
export type SemanticColors = typeof semantic
export type SemanticSoftColors = typeof semanticSoft
export type Gradients = typeof gradients

export default { palette, semantic, semanticSoft, gradients, cssVariables }
