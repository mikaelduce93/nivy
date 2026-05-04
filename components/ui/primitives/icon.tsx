'use client'

/* ==========================================================================
   ICON PRIMITIVE - Consistent icon wrapper
   
   Provides consistent sizing, colors, and accessibility for icons.
   Works with Lucide React icons or any SVG component.
   ========================================================================== */

import * as React from 'react'
import { cn } from '@/lib/utils'
import type { LucideIcon, LucideProps } from 'lucide-react'

/**
 * Icon size scale
 */
const sizeStyles = {
  xs: 'w-3 h-3',       // 12px
  sm: 'w-4 h-4',       // 16px
  md: 'w-5 h-5',       // 20px
  lg: 'w-6 h-6',       // 24px
  xl: 'w-8 h-8',       // 32px
  '2xl': 'w-10 h-10',  // 40px
  '3xl': 'w-12 h-12',  // 48px
  '4xl': 'w-16 h-16',  // 64px
} as const

/**
 * Icon color variants
 */
const colorStyles = {
  primary: 'text-white',
  secondary: 'text-[oklch(0.78_0.02_290)]',
  tertiary: 'text-[oklch(0.62_0.02_290)]',
  muted: 'text-[oklch(0.50_0.02_290)]',
  disabled: 'text-[oklch(0.42_0.01_290)]',
  
  // Semantic
  success: 'text-[oklch(0.78_0.16_160)]',
  warning: 'text-[oklch(0.85_0.18_95)]',
  danger: 'text-[oklch(0.60_0.20_25)]',
  info: 'text-[oklch(0.70_0.17_290)]',
  
  // Brand
  lavender: 'text-[oklch(0.75_0.15_290)]',
  coral: 'text-[oklch(0.70_0.20_25)]',
  mint: 'text-[oklch(0.85_0.15_160)]',
  yellow: 'text-[oklch(0.90_0.18_95)]',
  
  // Special
  inherit: 'text-inherit',
  current: 'text-current',
} as const

export type IconSize = keyof typeof sizeStyles
export type IconColor = keyof typeof colorStyles

export interface IconProps extends Omit<LucideProps, 'size' | 'color'> {
  /** Lucide icon component or custom SVG */
  icon: LucideIcon | React.FC<React.SVGProps<SVGSVGElement>>
  /** Icon size from scale */
  size?: IconSize
  /** Icon color */
  color?: IconColor
  /** Accessible label (required for non-decorative icons) */
  label?: string
  /** Is this icon purely decorative? */
  decorative?: boolean
  /** Spin animation (for loading states) */
  spin?: boolean
  /** Pulse animation (for attention) */
  pulse?: boolean
}

/**
 * Icon - Wrapper for consistent icon rendering
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <Icon icon={Home} size="md" color="primary" />
 * 
 * // With accessibility label
 * <Icon icon={Settings} label="Open settings" size="lg" />
 * 
 * // Decorative icon (no screen reader)
 * <Icon icon={Star} decorative size="sm" color="yellow" />
 * 
 * // Loading spinner
 * <Icon icon={Loader2} spin size="md" />
 * ```
 */
export const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  (
    {
      icon: IconComponent,
      size = 'md',
      color = 'current',
      label,
      decorative = false,
      spin = false,
      pulse = false,
      className,
      ...props
    },
    ref
  ) => {
    // Determine accessibility attributes
    const ariaProps = decorative
      ? { 'aria-hidden': true }
      : label
        ? { 'aria-label': label, role: 'img' }
        : { 'aria-hidden': true }
    
    return (
      <IconComponent
        ref={ref}
        className={cn(
          // Base styles
          'shrink-0',
          
          // Size
          sizeStyles[size],
          
          // Color
          colorStyles[color],
          
          // Animations
          spin && 'animate-spin',
          pulse && 'animate-pulse',
          
          className
        )}
        {...ariaProps}
        {...props}
      />
    )
  }
)
Icon.displayName = 'Icon'

/**
 * Icon Button Container - Wrapper for clickable icons
 */
export interface IconButtonContainerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Size matches icon sizes but adds padding */
  size?: 'sm' | 'md' | 'lg'
  /** Accessible label (required!) */
  'aria-label': string
}

const buttonSizeStyles = {
  sm: 'w-8 h-8 p-1.5',   // 32px with 16px icon
  md: 'w-10 h-10 p-2',   // 40px with 20px icon
  lg: 'w-12 h-12 p-2.5', // 48px with 24px icon
}

export const IconButtonContainer = React.forwardRef<HTMLButtonElement, IconButtonContainerProps>(
  ({ size = 'md', className, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        // Base
        'inline-flex items-center justify-center',
        'rounded-full',
        'transition-colors duration-150',
        
        // Size
        buttonSizeStyles[size],
        
        // Interactive states
        'hover:bg-white/10',
        'active:bg-white/15',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.75_0.15_290)]',
        'disabled:opacity-50 disabled:pointer-events-none',
        
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
)
IconButtonContainer.displayName = 'IconButtonContainer'

/**
 * Icon with Circle Background
 */
export interface CircleIconProps extends Omit<IconProps, 'size'> {
  /** Size of the circle container */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Background color */
  bg?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'lavender' | 'coral' | 'mint' | 'yellow'
}

const circleSizeStyles = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
}

const circleIconSizes: Record<string, IconSize> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
}

const circleBgStyles = {
  default: 'bg-white/10',
  primary: 'bg-[oklch(0.75_0.15_290/0.2)]',
  success: 'bg-[oklch(0.78_0.16_160/0.2)]',
  warning: 'bg-[oklch(0.85_0.18_95/0.2)]',
  danger: 'bg-[oklch(0.60_0.20_25/0.2)]',
  lavender: 'bg-[oklch(0.75_0.15_290/0.15)]',
  coral: 'bg-[oklch(0.70_0.20_25/0.15)]',
  mint: 'bg-[oklch(0.85_0.15_160/0.15)]',
  yellow: 'bg-[oklch(0.90_0.18_95/0.15)]',
}

export const CircleIcon = React.forwardRef<HTMLDivElement, CircleIconProps & { className?: string }>(
  ({ icon, size = 'md', bg = 'default', color, label, decorative, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-center rounded-full shrink-0',
        circleSizeStyles[size],
        circleBgStyles[bg],
        className
      )}
    >
      <Icon
        icon={icon}
        size={circleIconSizes[size]}
        color={color}
        label={label}
        decorative={decorative}
        {...props}
      />
    </div>
  )
)
CircleIcon.displayName = 'CircleIcon'

export default Icon
