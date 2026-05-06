'use client'

import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

// Gen-Z Progress: Gradient fills, glow effects, animated shine
const progressVariants = cva(
  'relative w-full overflow-hidden rounded-full',
  {
    variants: {
      size: {
        sm: 'h-1.5',
        default: 'h-2.5',
        lg: 'h-4',
        xl: 'h-6',
      },
      variant: {
        default: 'bg-muted',
        glass: 'bg-white/10 backdrop-blur-sm',
      }
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
)

const indicatorVariants = cva(
  'h-full w-full flex-1 transition-all duration-500 ease-out rounded-full',
  {
    variants: {
      color: {
        default: 'bg-primary',
        gradient: 'bg-gradient-to-r from-gen-z-lavender via-gen-z-coral to-gen-z-lime',
        lavender: 'bg-gen-z-lavender',
        coral: 'bg-gen-z-coral',
        lime: 'bg-gen-z-lime',
        mint: 'bg-gen-z-mint',
        grape: 'bg-gen-z-grape',
        // Gamification pillars
        party: 'bg-neon-party',
        vitality: 'bg-neon-vitality',
        intellect: 'bg-neon-intellect',
        creativity: 'bg-neon-creativity',
        prestige: 'bg-neon-prestige',
        // XP gradient
        xp: 'bg-gradient-to-r from-gen-z-lavender to-gen-z-grape',
      },
      glow: {
        none: '',
        subtle: 'shadow-[0_0_8px_var(--primary)]',
        strong: 'shadow-[0_0_16px_var(--primary)]',
      }
    },
    defaultVariants: {
      color: 'default',
      glow: 'none',
    },
  }
)

// Note: ProgressPrimitive.Root inherits the HTML `color` attribute, which
// collides with our CVA-driven `color` variant. Omit the HTML one in favour
// of the variant typing.
interface ProgressProps
  extends Omit<React.ComponentProps<typeof ProgressPrimitive.Root>, 'color'>,
    VariantProps<typeof progressVariants>,
    VariantProps<typeof indicatorVariants> {
  showValue?: boolean
  animate?: boolean
}

function Progress({
  className,
  value,
  size,
  variant,
  color,
  glow,
  showValue = false,
  animate = true,
  ...props
}: ProgressProps) {
  const percentage = value || 0

  return (
    <div className="relative w-full">
      <ProgressPrimitive.Root
        data-slot="progress"
        className={cn(progressVariants({ size, variant }), className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className={cn(
            indicatorVariants({ color, glow }),
            animate && 'relative overflow-hidden'
          )}
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        >
          {/* Animated shine effect */}
          {animate && percentage > 0 && (
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
              style={{ backgroundSize: '200% 100%' }}
            />
          )}
        </ProgressPrimitive.Indicator>
      </ProgressPrimitive.Root>
      
      {/* Value display */}
      {showValue && (
        <span 
          className={cn(
            'absolute right-0 top-1/2 -translate-y-1/2 text-xs font-semibold',
            size === 'xl' ? 'text-sm pr-2 text-foreground' : '-top-5 text-muted-foreground'
          )}
        >
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}

// Segmented progress for multi-step flows
interface SegmentedProgressProps {
  steps: number
  currentStep: number
  className?: string
  color?: VariantProps<typeof indicatorVariants>['color']
}

function SegmentedProgress({ 
  steps, 
  currentStep, 
  className,
  color = 'default'
}: SegmentedProgressProps) {
  return (
    <div className={cn('flex gap-1.5 w-full', className)}>
      {Array.from({ length: steps }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-all duration-300',
            index < currentStep 
              ? indicatorVariants({ color }) 
              : 'bg-muted'
          )}
        />
      ))}
    </div>
  )
}

// Circular progress for XP/levels
interface CircularProgressProps {
  value: number
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  className?: string
  children?: React.ReactNode
}

function CircularProgress({
  value,
  size = 80,
  strokeWidth = 6,
  color = 'var(--primary)',
  trackColor = 'var(--muted)',
  className,
  children
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <div className={cn('relative inline-flex', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
          style={{
            filter: `drop-shadow(0 0 6px ${color})`
          }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

export { Progress, SegmentedProgress, CircularProgress, progressVariants }
