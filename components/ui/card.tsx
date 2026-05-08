import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

// Gen-Z Card Styles: Rounded, glassmorphism, hover lift.
// TICKET-011 — extended with semantic-tinted variants (brand/accent/success/
// info/warning/danger) backed by the color-mix()-derived *-soft tokens added
// in TICKET-012. Existing variants (default/glass/glow/interactive/flat/
// gradient) are preserved verbatim for backwards compatibility.
//
// NOTE: the base style intentionally sets `bg-card` and `border-border/50`.
// Tinted variants override `bg-*`, `border-*`, and `text-card-foreground` to
// `text-foreground` so the foreground adapts to the surrounding background
// instead of staying locked to the card neutral.
const cardVariants = cva(
  [
    // Base styles
    'relative flex flex-col gap-6 py-6',
    'bg-card text-card-foreground',
    'rounded-[2.5rem] border border-border/50',
    // Transitions
    'transition-all duration-300 ease-out',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'shadow-sm',
          'hover:shadow-lg hover:shadow-primary/5',
          'hover:-translate-y-1 hover:border-primary/20',
        ].join(' '),
        // ── Semantic tinted surfaces (TICKET-011) ─────────────────────────
        // Each uses the corresponding `--color-*-soft` token (mathematically
        // derived from its semantic source via color-mix in OKLCH) plus a
        // 1px border in the source color at reduced opacity for definition.
        brand: [
          'bg-brand-soft text-foreground',
          'border-primary/30',
          'shadow-sm',
          'hover:shadow-lg hover:shadow-primary/10',
          'hover:-translate-y-1 hover:border-primary/50',
        ].join(' '),
        accent: [
          'bg-accent-soft text-foreground',
          'border-accent/30',
          'shadow-sm',
          'hover:shadow-lg hover:shadow-accent/10',
          'hover:-translate-y-1 hover:border-accent/50',
        ].join(' '),
        success: [
          'bg-success-soft text-foreground',
          'border-success/30',
          'shadow-sm',
          'hover:shadow-lg hover:shadow-success/10',
          'hover:-translate-y-1 hover:border-success/50',
        ].join(' '),
        info: [
          'bg-info-soft text-foreground',
          'border-info/30',
          'shadow-sm',
          'hover:shadow-lg hover:shadow-info/10',
          'hover:-translate-y-1 hover:border-info/50',
        ].join(' '),
        warning: [
          'bg-warning-soft text-foreground',
          'border-warning/30',
          'shadow-sm',
          'hover:shadow-lg hover:shadow-warning/10',
          'hover:-translate-y-1 hover:border-warning/50',
        ].join(' '),
        danger: [
          'bg-danger-soft text-foreground',
          'border-destructive/30',
          'shadow-sm',
          'hover:shadow-lg hover:shadow-destructive/10',
          'hover:-translate-y-1 hover:border-destructive/50',
        ].join(' '),
        // ── Existing decorative variants ──────────────────────────────────
        // glass: TICKET-011 spec — over-image translucent surface. Note this
        // changes from the prior `bg-card/60 backdrop-blur-xl` look; existing
        // call sites that relied on the heavier card-tint look should switch
        // to the new `gradient` or `flat` variants if needed.
        glass: [
          'bg-white/10 backdrop-blur-md',
          'border-white/20',
          'shadow-xl shadow-black/5',
          'hover:bg-white/15 hover:border-white/30',
        ].join(' '),
        glow: [
          'bg-card/80 backdrop-blur-md',
          'shadow-[0_0_0_1px_oklch(from_var(--primary)_l_c_h_/_0.1),0_8px_32px_-8px_oklch(from_var(--primary)_l_c_h_/_0.15)]',
          'hover:shadow-[0_0_0_1px_oklch(from_var(--primary)_l_c_h_/_0.2),0_16px_48px_-12px_oklch(from_var(--primary)_l_c_h_/_0.25)]',
          'hover:-translate-y-1',
        ].join(' '),
        interactive: [
          'cursor-pointer',
          'shadow-sm',
          'hover:shadow-xl hover:shadow-primary/10',
          'hover:-translate-y-2 hover:border-primary/30',
          'active:translate-y-0 active:shadow-md',
        ].join(' '),
        flat: 'border-0 shadow-none bg-muted/50',
        gradient: [
          'bg-gradient-to-br from-card via-card to-muted/50',
          'border-0',
          'shadow-lg shadow-primary/5',
        ].join(' '),
      },
      padding: {
        default: '',
        none: 'py-0',
        sm: 'py-4',
        lg: 'py-8',
      }
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default',
    },
  }
)

interface CardProps extends React.ComponentProps<'div'>, VariantProps<typeof cardVariants> {}

function Card({ className, variant, padding, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ variant, padding }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-tight font-bold text-lg tracking-tight', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-6', className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center px-6 [.border-t]:pt-6', className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
