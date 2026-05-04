'use client'

/* ==========================================================================
   SURFACE PRIMITIVE - Base container with elevation system
   
   The foundation for all card-like components.
   Provides consistent elevation, padding, and border radius.
   ========================================================================== */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cardMotion, cardVariants } from '@/lib/design-system/motion'

/**
 * Elevation levels matching semantic.surface in colors.ts
 */
const elevationStyles = {
  /** Page background level */
  base: 'bg-[oklch(0.08_0.015_290)]',
  /** Slightly raised - main content */
  subtle: 'bg-[oklch(0.10_0.018_290)]',
  /** Cards, containers */
  raised: 'bg-[oklch(0.13_0.020_290)] border border-white/[0.06]',
  /** Elevated - hovered cards */
  elevated: 'bg-[oklch(0.16_0.022_290)] border border-white/[0.08]',
  /** Overlay backgrounds */
  overlay: 'bg-[oklch(0.18_0.025_290)] border border-white/[0.10]',
  /** Glass effect */
  glass: 'bg-[oklch(0.15_0.020_290/0.8)] backdrop-blur-xl border border-white/[0.08]',
  /** Transparent with border only */
  ghost: 'bg-transparent border border-white/[0.06]',
} as const

/**
 * Padding scale using design tokens
 */
const paddingStyles = {
  none: '',
  xs: 'p-2',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
  '2xl': 'p-10',
  '3xl': 'p-12',
} as const

/**
 * Border radius scale
 */
const radiusStyles = {
  none: 'rounded-none',
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
  '2xl': 'rounded-3xl',
  '3xl': 'rounded-[2rem]',
  full: 'rounded-full',
} as const

export type SurfaceElevation = keyof typeof elevationStyles
export type SurfacePadding = keyof typeof paddingStyles
export type SurfaceRadius = keyof typeof radiusStyles

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Elevation level - affects background and border */
  elevation?: SurfaceElevation
  /** Padding using design token scale */
  padding?: SurfacePadding
  /** Border radius */
  radius?: SurfaceRadius
  /** Enable hover elevation transition */
  hoverable?: boolean
  /** Enable focus outline */
  focusable?: boolean
  /** Render as different element */
  as?: 'div' | 'section' | 'article' | 'aside' | 'main' | 'nav'
  /** Accessible label */
  'aria-label'?: string
}

/**
 * Surface - Base container primitive
 * 
 * @example
 * ```tsx
 * <Surface elevation="raised" padding="lg" radius="xl">
 *   Card content here
 * </Surface>
 * ```
 */
export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  (
    {
      elevation = 'raised',
      padding = 'md',
      radius = 'xl',
      hoverable = false,
      focusable = false,
      as: Component = 'div',
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Component
        ref={ref}
        className={cn(
          // Base styles
          'relative overflow-hidden',
          'transition-all duration-200',
          
          // Elevation
          elevationStyles[elevation],
          
          // Padding
          paddingStyles[padding],
          
          // Radius
          radiusStyles[radius],
          
          // Hoverable - subtle lift on hover
          hoverable && [
            'cursor-pointer',
            'hover:bg-[oklch(0.16_0.022_290)]',
            'hover:border-white/[0.10]',
            'hover:-translate-y-0.5',
            'hover:shadow-lg',
          ],
          
          // Focusable
          focusable && [
            'focus-visible:outline-none',
            'focus-visible:ring-2',
            'focus-visible:ring-[oklch(0.75_0.15_290)]',
            'focus-visible:ring-offset-2',
            'focus-visible:ring-offset-[oklch(0.08_0.015_290)]',
          ],
          
          className
        )}
        {...props}
      >
        {children}
      </Component>
    )
  }
)
Surface.displayName = 'Surface'

/**
 * Motion Surface - Animated version with Framer Motion
 */
export interface MotionSurfaceProps extends Omit<SurfaceProps, keyof HTMLMotionProps<'div'>> {
  /** Animation variant */
  animate?: boolean
  /** Custom variants */
  variants?: typeof cardVariants
  /** Hover animation */
  hoverLift?: boolean
  /** Tap animation */
  tapScale?: boolean
}

export const MotionSurface = React.forwardRef<HTMLDivElement, MotionSurfaceProps & HTMLMotionProps<'div'>>(
  (
    {
      elevation = 'raised',
      padding = 'md',
      radius = 'xl',
      hoverable = false,
      focusable = false,
      animate = true,
      variants,
      hoverLift = false,
      tapScale = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        variants={animate ? (variants || cardVariants) : undefined}
        initial={animate ? 'hidden' : undefined}
        animate={animate ? 'visible' : undefined}
        exit={animate ? 'exit' : undefined}
        whileHover={hoverLift ? cardMotion.hoverShadow.whileHover : undefined}
        whileTap={tapScale ? { scale: 0.98 } : undefined}
        className={cn(
          // Base styles
          'relative overflow-hidden',
          'transition-colors duration-200',
          
          // Elevation
          elevationStyles[elevation],
          
          // Padding
          paddingStyles[padding],
          
          // Radius
          radiusStyles[radius],
          
          // Hoverable
          hoverable && 'cursor-pointer',
          
          // Focusable
          focusable && [
            'focus-visible:outline-none',
            'focus-visible:ring-2',
            'focus-visible:ring-[oklch(0.75_0.15_290)]',
            'focus-visible:ring-offset-2',
            'focus-visible:ring-offset-[oklch(0.08_0.015_290)]',
          ],
          
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
MotionSurface.displayName = 'MotionSurface'

export default Surface
