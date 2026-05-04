'use client'

/* ==========================================================================
   TEXT PRIMITIVE - Typography component with design token scale
   
   Consistent text styling across the application.
   Supports semantic HTML elements and accessibility.
   ========================================================================== */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Slot } from '@radix-ui/react-slot'

/**
 * Font size scale from design tokens
 */
const sizeStyles = {
  '2xs': 'text-[0.625rem]',      // 10px
  xs: 'text-[0.6875rem]',        // 11px
  sm: 'text-[0.8125rem]',        // 13px
  base: 'text-base',             // 16px
  lg: 'text-lg',                 // 18px
  xl: 'text-xl',                 // 20px
  '2xl': 'text-2xl',             // 24px
  '3xl': 'text-[1.875rem]',      // 30px
  '4xl': 'text-4xl',             // 36px
  '5xl': 'text-5xl',             // 48px
  '6xl': 'text-6xl',             // 60px
  '7xl': 'text-7xl',             // 72px
} as const

/**
 * Font weight options
 */
const weightStyles = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  extrabold: 'font-extrabold',
  black: 'font-black',
} as const

/**
 * Color variants based on semantic text colors
 */
const colorStyles = {
  primary: 'text-white',
  secondary: 'text-[oklch(0.78_0.02_290)]',
  tertiary: 'text-[oklch(0.62_0.02_290)]',
  muted: 'text-[oklch(0.50_0.02_290)]',
  disabled: 'text-[oklch(0.42_0.01_290)]',
  inverted: 'text-[oklch(0.15_0.02_290)]',
  
  // Semantic colors
  success: 'text-[oklch(0.78_0.16_160)]',
  warning: 'text-[oklch(0.85_0.18_95)]',
  danger: 'text-[oklch(0.60_0.20_25)]',
  info: 'text-[oklch(0.70_0.17_290)]',
  
  // Brand colors
  lavender: 'text-[oklch(0.75_0.15_290)]',
  coral: 'text-[oklch(0.70_0.20_25)]',
  mint: 'text-[oklch(0.85_0.15_160)]',
  yellow: 'text-[oklch(0.90_0.18_95)]',
  
  // Inherit from parent
  inherit: 'text-inherit',
  current: 'text-current',
} as const

/**
 * Line height options
 */
const leadingStyles = {
  none: 'leading-none',      // 1
  tight: 'leading-tight',    // 1.25
  snug: 'leading-snug',      // 1.375
  normal: 'leading-normal',  // 1.5
  relaxed: 'leading-relaxed',// 1.625
  loose: 'leading-loose',    // 2
} as const

/**
 * Letter spacing options
 */
const trackingStyles = {
  tighter: 'tracking-tighter',  // -0.05em
  tight: 'tracking-tight',      // -0.025em
  normal: 'tracking-normal',    // 0
  wide: 'tracking-wide',        // 0.025em
  wider: 'tracking-wider',      // 0.05em
  widest: 'tracking-widest',    // 0.1em
} as const

/**
 * Alignment options
 */
const alignStyles = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
} as const

/**
 * Transform options
 */
const transformStyles = {
  none: '',
  uppercase: 'uppercase',
  lowercase: 'lowercase',
  capitalize: 'capitalize',
} as const

export type TextSize = keyof typeof sizeStyles
export type TextWeight = keyof typeof weightStyles
export type TextColor = keyof typeof colorStyles
export type TextLeading = keyof typeof leadingStyles
export type TextTracking = keyof typeof trackingStyles
export type TextAlign = keyof typeof alignStyles
export type TextTransform = keyof typeof transformStyles

type TextElement = 
  | 'p' 
  | 'span' 
  | 'div' 
  | 'label'
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'h4' 
  | 'h5' 
  | 'h6'
  | 'strong'
  | 'em'
  | 'small'
  | 'mark'
  | 'del'
  | 'ins'
  | 'sub'
  | 'sup'
  | 'code'
  | 'kbd'
  | 'samp'
  | 'var'
  | 'time'
  | 'abbr'
  | 'cite'
  | 'q'

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  /** HTML element to render */
  as?: TextElement
  /** Font size from design token scale */
  size?: TextSize
  /** Font weight */
  weight?: TextWeight
  /** Text color */
  color?: TextColor
  /** Line height */
  leading?: TextLeading
  /** Letter spacing */
  tracking?: TextTracking
  /** Text alignment */
  align?: TextAlign
  /** Text transform */
  transform?: TextTransform
  /** Truncate with ellipsis */
  truncate?: boolean
  /** Clamp to N lines */
  lineClamp?: 1 | 2 | 3 | 4 | 5 | 6
  /** Wrap or nowrap */
  wrap?: boolean
  /** Balance text for better readability */
  balance?: boolean
  /** Use as slot (render as child) */
  asChild?: boolean
  /** Italic style */
  italic?: boolean
  /** Underline decoration */
  underline?: boolean
  /** Strikethrough decoration */
  strikethrough?: boolean
  /** Monospace font */
  mono?: boolean
}

/**
 * Text - Typography primitive
 * 
 * @example
 * ```tsx
 * // Heading
 * <Text as="h1" size="4xl" weight="bold" color="primary">
 *   Page Title
 * </Text>
 * 
 * // Body text
 * <Text size="base" color="secondary" leading="relaxed">
 *   Lorem ipsum dolor sit amet...
 * </Text>
 * 
 * // Small muted text
 * <Text size="sm" color="tertiary" transform="uppercase" tracking="wider">
 *   Label text
 * </Text>
 * ```
 */
export const Text = React.forwardRef<HTMLElement, TextProps>(
  (
    {
      as: Component = 'p',
      size = 'base',
      weight,
      color = 'primary',
      leading = 'normal',
      tracking = 'normal',
      align,
      transform = 'none',
      truncate = false,
      lineClamp,
      wrap = true,
      balance = false,
      asChild = false,
      italic = false,
      underline = false,
      strikethrough = false,
      mono = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : Component
    
    return (
      <Comp
        ref={ref as React.Ref<HTMLElement>}
        className={cn(
          // Size
          sizeStyles[size],
          
          // Weight
          weight && weightStyles[weight],
          
          // Color
          colorStyles[color],
          
          // Line height
          leadingStyles[leading],
          
          // Letter spacing
          trackingStyles[tracking],
          
          // Alignment
          align && alignStyles[align],
          
          // Transform
          transform !== 'none' && transformStyles[transform],
          
          // Truncation
          truncate && 'truncate',
          lineClamp === 1 && 'line-clamp-1',
          lineClamp === 2 && 'line-clamp-2',
          lineClamp === 3 && 'line-clamp-3',
          lineClamp === 4 && 'line-clamp-4',
          lineClamp === 5 && 'line-clamp-5',
          lineClamp === 6 && 'line-clamp-6',
          
          // Wrap
          !wrap && 'whitespace-nowrap',
          
          // Balance
          balance && 'text-balance',
          
          // Style modifiers
          italic && 'italic',
          underline && 'underline underline-offset-2',
          strikethrough && 'line-through',
          mono && 'font-mono',
          
          className
        )}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
Text.displayName = 'Text'

/**
 * Heading - Semantic heading component
 */
export interface HeadingProps extends Omit<TextProps, 'as'> {
  level?: 1 | 2 | 3 | 4 | 5 | 6
}

const headingDefaults: Record<number, { size: TextSize; weight: TextWeight }> = {
  1: { size: '5xl', weight: 'bold' },
  2: { size: '4xl', weight: 'bold' },
  3: { size: '3xl', weight: 'semibold' },
  4: { size: '2xl', weight: 'semibold' },
  5: { size: 'xl', weight: 'medium' },
  6: { size: 'lg', weight: 'medium' },
}

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ level = 2, size, weight, leading = 'tight', tracking = 'tight', ...props }, ref) => {
    const defaults = headingDefaults[level]
    
    return (
      <Text
        ref={ref}
        as={`h${level}` as TextElement}
        size={size ?? defaults.size}
        weight={weight ?? defaults.weight}
        leading={leading}
        tracking={tracking}
        {...props}
      />
    )
  }
)
Heading.displayName = 'Heading'

/**
 * Label - Form label text
 */
export interface LabelProps extends Omit<TextProps, 'as'> {
  htmlFor?: string
  required?: boolean
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ size = 'sm', weight = 'medium', color = 'secondary', required, children, ...props }, ref) => (
    <Text
      ref={ref}
      as="label"
      size={size}
      weight={weight}
      color={color}
      {...props}
    >
      {children}
      {required && <span className="text-[oklch(0.60_0.20_25)] ml-1" aria-hidden="true">*</span>}
    </Text>
  )
)
Label.displayName = 'Label'

/**
 * Code - Inline code text
 */
export const Code = React.forwardRef<HTMLElement, Omit<TextProps, 'as' | 'mono'>>(
  ({ size = 'sm', color = 'lavender', className, ...props }, ref) => (
    <Text
      ref={ref}
      as="code"
      size={size}
      color={color}
      mono
      className={cn('px-1.5 py-0.5 rounded bg-white/5', className)}
      {...props}
    />
  )
)
Code.displayName = 'Code'

export default Text
