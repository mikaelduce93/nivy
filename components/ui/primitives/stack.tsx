'use client'

/* ==========================================================================
   STACK PRIMITIVE - Flexbox layout abstraction
   
   Provides consistent spacing for vertical and horizontal layouts.
   Uses design token spacing scale.
   ========================================================================== */

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Spacing scale from design tokens
 */
const gapStyles = {
  none: 'gap-0',
  xs: 'gap-1',       // 4px
  sm: 'gap-2',       // 8px
  md: 'gap-4',       // 16px
  lg: 'gap-6',       // 24px
  xl: 'gap-8',       // 32px
  '2xl': 'gap-12',   // 48px
  '3xl': 'gap-16',   // 64px
} as const

/**
 * Alignment options
 */
const alignStyles = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
} as const

const justifyStyles = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
} as const

export type StackGap = keyof typeof gapStyles
export type StackAlign = keyof typeof alignStyles
export type StackJustify = keyof typeof justifyStyles

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Stack direction */
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
  /** Gap between items using design token scale */
  gap?: StackGap
  /** Cross-axis alignment */
  align?: StackAlign
  /** Main-axis alignment */
  justify?: StackJustify
  /** Wrap items */
  wrap?: boolean | 'reverse'
  /** Fill available space */
  fill?: boolean
  /** Render as different element */
  as?: 'div' | 'section' | 'article' | 'aside' | 'main' | 'nav' | 'ul' | 'ol' | 'form'
  /** Enable responsive direction (column on mobile, row on desktop) */
  responsive?: boolean
}

/**
 * Stack - Flexbox layout primitive
 * 
 * @example
 * ```tsx
 * // Vertical stack
 * <Stack gap="md" align="center">
 *   <Item />
 *   <Item />
 * </Stack>
 * 
 * // Horizontal stack with space between
 * <Stack direction="row" justify="between" align="center">
 *   <Left />
 *   <Right />
 * </Stack>
 * ```
 */
export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  (
    {
      direction = 'column',
      gap = 'md',
      align,
      justify,
      wrap = false,
      fill = false,
      as: Component = 'div',
      responsive = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const directionStyles = {
      row: 'flex-row',
      column: 'flex-col',
      'row-reverse': 'flex-row-reverse',
      'column-reverse': 'flex-col-reverse',
    }
    
    return (
      // TODO(ts): widen type — see grid.tsx note about polymorphic `as` ref.
      /* eslint-disable @typescript-eslint/no-explicit-any */
      <Component
        ref={ref as any}
        className={cn(
          'flex',
          
          // Direction
          responsive 
            ? 'flex-col md:flex-row' 
            : directionStyles[direction],
          
          // Gap
          gapStyles[gap],
          
          // Alignment
          align && alignStyles[align],
          justify && justifyStyles[justify],
          
          // Wrap
          wrap === true && 'flex-wrap',
          wrap === 'reverse' && 'flex-wrap-reverse',
          
          // Fill
          fill && 'flex-1 min-w-0',
          
          className
        )}
        {...(props as any)}
      >
        {children}
      </Component>
      /* eslint-enable @typescript-eslint/no-explicit-any */
    )
  }
)
Stack.displayName = 'Stack'

/**
 * HStack - Horizontal stack (convenience component)
 */
export interface HStackProps extends Omit<StackProps, 'direction'> {}

export const HStack = React.forwardRef<HTMLDivElement, HStackProps>(
  (props, ref) => <Stack ref={ref} direction="row" {...props} />
)
HStack.displayName = 'HStack'

/**
 * VStack - Vertical stack (convenience component)
 */
export interface VStackProps extends Omit<StackProps, 'direction'> {}

export const VStack = React.forwardRef<HTMLDivElement, VStackProps>(
  (props, ref) => <Stack ref={ref} direction="column" {...props} />
)
VStack.displayName = 'VStack'

/**
 * Spacer - Flexible space that fills available area
 */
export interface SpacerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Minimum size */
  size?: 'sm' | 'md' | 'lg'
}

const spacerSizes = {
  sm: 'min-w-2 min-h-2',
  md: 'min-w-4 min-h-4',
  lg: 'min-w-8 min-h-8',
}

export const Spacer = React.forwardRef<HTMLDivElement, SpacerProps>(
  ({ size, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex-1',
        size && spacerSizes[size],
        className
      )}
      aria-hidden="true"
      {...props}
    />
  )
)
Spacer.displayName = 'Spacer'

/**
 * Divider - Visual separator between stack items
 */
export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Orientation */
  orientation?: 'horizontal' | 'vertical'
  /** Decorative or semantic */
  decorative?: boolean
}

export const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ orientation = 'horizontal', decorative = true, className, ...props }, ref) => (
    <div
      ref={ref}
      role={decorative ? 'none' : 'separator'}
      aria-orientation={!decorative ? orientation : undefined}
      className={cn(
        'shrink-0',
        orientation === 'horizontal' 
          ? 'h-px w-full bg-white/[0.08]'
          : 'w-px h-full bg-white/[0.08]',
        className
      )}
      {...props}
    />
  )
)
Divider.displayName = 'Divider'

export default Stack
