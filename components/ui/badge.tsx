import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

// Gen-Z Badge: Pill shape, vibrant colors, playful
const badgeVariants = cva(
  [
    'inline-flex items-center justify-center',
    'rounded-full border px-3 py-1',
    'text-xs font-semibold',
    'w-fit whitespace-nowrap shrink-0',
    '[&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none',
    'transition-all duration-200',
    'focus-visible:ring-[3px] focus-visible:ring-ring/50',
    'overflow-hidden',
  ].join(' '),
  {
    variants: {
      variant: {
        // Primary
        default:
          'border-transparent bg-primary text-primary-foreground shadow-sm [a&]:hover:bg-primary/90 [a&]:hover:shadow-md',
        // Secondary
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80',
        // Destructive
        destructive:
          'border-transparent bg-destructive text-white shadow-sm [a&]:hover:bg-destructive/90',
        // Success
        success:
          'border-transparent bg-success text-success-foreground shadow-sm [a&]:hover:bg-success/90',
        // Warning
        warning:
          'border-transparent bg-warning text-warning-foreground shadow-sm [a&]:hover:bg-warning/90',
        // Info
        info:
          'border-transparent bg-info text-info-foreground shadow-sm [a&]:hover:bg-info/90',
        // Outline
        outline:
          'border-border text-foreground bg-background [a&]:hover:bg-muted',
        // Outline variants
        'outline-success':
          'border-success/50 text-success bg-success/10 [a&]:hover:bg-success/20',
        'outline-warning':
          'border-warning/50 text-warning-foreground bg-warning/10 [a&]:hover:bg-warning/20',
        'outline-destructive':
          'border-destructive/50 text-destructive bg-destructive/10 [a&]:hover:bg-destructive/20',
        // Gen-Z Vibrant Colors
        lavender:
          'border-transparent bg-gen-z-lavender text-white shadow-sm [a&]:hover:shadow-md',
        coral:
          'border-transparent bg-gen-z-coral text-white shadow-sm [a&]:hover:shadow-md',
        lime:
          'border-transparent bg-gen-z-lime text-gray-900 shadow-sm [a&]:hover:shadow-md',
        mint:
          'border-transparent bg-gen-z-mint text-gray-900 shadow-sm [a&]:hover:shadow-md',
        grape:
          'border-transparent bg-gen-z-grape text-white shadow-sm [a&]:hover:shadow-md',
        peach:
          'border-transparent bg-gen-z-peach text-gray-900 shadow-sm [a&]:hover:shadow-md',
        sky:
          'border-transparent bg-gen-z-sky text-gray-900 shadow-sm [a&]:hover:shadow-md',
        // Gradient
        gradient:
          'border-transparent bg-gradient-to-r from-gen-z-lavender to-gen-z-coral text-white shadow-sm',
        // Glass
        glass:
          'border-white/20 bg-white/10 backdrop-blur-md text-foreground [a&]:hover:bg-white/20',
        // Neon Pillars
        party:
          'border-transparent bg-neon-party text-white shadow-sm shadow-neon-party/30',
        vitality:
          'border-transparent bg-neon-vitality text-gray-900 shadow-sm shadow-neon-vitality/30',
        intellect:
          'border-transparent bg-neon-intellect text-white shadow-sm shadow-neon-intellect/30',
        creativity:
          'border-transparent bg-neon-creativity text-white shadow-sm shadow-neon-creativity/30',
        prestige:
          'border-transparent bg-neon-prestige text-gray-900 shadow-sm shadow-neon-prestige/30',
      },
      size: {
        default: 'px-3 py-1 text-xs',
        sm: 'px-2 py-0.5 text-[10px]',
        lg: 'px-4 py-1.5 text-sm',
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
