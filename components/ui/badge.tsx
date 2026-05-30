import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

// Badge néo-brutaliste (charte paper V1.5) : pill, bordure encre fine, couleurs charte.
const badgeVariants = cva(
  [
    'inline-flex items-center justify-center',
    'rounded-full border px-3 py-1',
    'text-xs font-semibold',
    'w-fit whitespace-nowrap shrink-0',
    '[&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none',
    'transition-all duration-150',
    'focus-visible:ring-[3px] focus-visible:ring-ring/50',
    'overflow-hidden',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'border-ink bg-primary text-primary-foreground [a&]:hover:opacity-90',
        secondary:
          'border-ink bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80',
        destructive:
          'border-ink bg-destructive text-destructive-foreground [a&]:hover:opacity-90',
        success:
          'border-ink bg-success text-success-foreground [a&]:hover:opacity-90',
        warning:
          'border-ink bg-warning text-warning-foreground [a&]:hover:opacity-90',
        info:
          'border-ink bg-info text-info-foreground [a&]:hover:opacity-90',
        outline:
          'border-ink text-foreground bg-transparent [a&]:hover:bg-accent',
        // Outline variants — bordure colorée + fond soft charte
        'outline-success':
          'border-success text-foreground bg-success-soft [a&]:hover:bg-success/20',
        'outline-warning':
          'border-warning text-foreground bg-warning-soft [a&]:hover:bg-warning/20',
        'outline-destructive':
          'border-destructive text-destructive bg-danger-soft [a&]:hover:bg-destructive/20',
        // Variants couleur (noms conservés) → charte paper
        lavender:
          'border-ink bg-pink text-ink [a&]:hover:opacity-90',
        coral:
          'border-ink bg-coral text-ink [a&]:hover:opacity-90',
        lime:
          'border-ink bg-lime text-on-bright [a&]:hover:opacity-90',
        mint:
          'border-ink bg-teal text-paper [a&]:hover:opacity-90',
        grape:
          'border-ink bg-ink-2 text-paper [a&]:hover:opacity-90',
        peach:
          'border-ink bg-gold text-ink [a&]:hover:opacity-90',
        sky:
          'border-ink bg-info-soft text-foreground [a&]:hover:opacity-90',
        gradient:
          'border-ink bg-pink text-ink [a&]:hover:opacity-90',
        // Glass — neutralisé en pill paper (plus de backdrop-blur)
        glass:
          'border-ink bg-card text-foreground [a&]:hover:bg-accent',
        // Anciens « neon pillars » → accents charte
        party:
          'border-ink bg-pink text-ink',
        vitality:
          'border-ink bg-lime text-on-bright',
        intellect:
          'border-ink bg-teal text-paper',
        creativity:
          'border-ink bg-coral text-ink',
        prestige:
          'border-ink bg-gold text-ink',
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
