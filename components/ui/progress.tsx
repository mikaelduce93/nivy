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
        gradient: 'bg-gradient-to-r from-brand-soft via-accent-soft to-lime',
        lavender: 'bg-brand-soft',
        coral: 'bg-accent-soft',
        lime: 'bg-lime',
        mint: 'bg-success-soft',
        grape: 'bg-pink',
        // Gamification pillars
        party: 'bg-neon-party',
        vitality: 'bg-neon-vitality',
        intellect: 'bg-neon-intellect',
        creativity: 'bg-neon-creativity',
        prestige: 'bg-neon-prestige',
        // XP gradient
        xp: 'bg-gradient-to-r from-brand-soft to-pink',
      },
      glow: {
        none: '',
        subtle: '',
        strong: '',
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

// Segmented progress for multi-step flows (onboarding / quêtes / quiz)
interface SegmentedProgressProps {
  /** Nombre total de segments. */
  steps: number
  /** Index 0-based du segment **actif** (en cours). */
  current?: number
  /** @deprecated Alias 0-based de `current` (compat). */
  currentStep?: number
  /** Méta mono optionnelle façon handoff `01 / 12`. */
  label?: string
  showLabel?: boolean
  size?: 'sm' | 'md'
  className?: string
}

/**
 * SegmentedProgress — barre de progression segmentée charte (§3, handoff
 * `onboarding-ado.html`) : segments **ink** pour les étapes franchies, segment
 * **actif rose**, segments futurs vides. Remplace les barres pleines/dégradées
 * génériques. Aucune classe glass/néon/gradient/shimmer.
 */
function SegmentedProgress({
  steps,
  current,
  currentStep,
  label,
  showLabel = false,
  size = 'sm',
  className,
}: SegmentedProgressProps) {
  const active = current ?? currentStep ?? 0

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {showLabel && (
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-mute">
          {label ?? `${String(active + 1).padStart(2, '0')} / ${steps}`}
        </span>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={steps}
        aria-valuenow={Math.min(active + 1, steps)}
        aria-label={label ?? 'Progression'}
        className="flex w-full gap-1"
      >
        {Array.from({ length: steps }).map((_, index) => {
          const done = index < active
          const isActive = index === active
          return (
            <span
              key={index}
              className={cn(
                'flex-1 overflow-hidden rounded-full bg-ink/12',
                size === 'sm' ? 'h-[3px]' : 'h-1.5',
              )}
            >
              <span
                className={cn(
                  'block h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none',
                  done && 'w-full bg-ink',
                  isActive && 'w-full bg-pink',
                  !done && !isActive && 'w-0',
                )}
              />
            </span>
          )
        })}
      </div>
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
