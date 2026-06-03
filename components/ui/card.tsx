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
    // Base — carte « sticker » néo-brutaliste (charte paper V1.5)
    'relative flex flex-col gap-6 py-6',
    'bg-card text-card-foreground',
    'rounded-2xl border-2 border-ink shadow-stkr-md',
    'transition-all duration-200 ease-out',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr',
        ].join(' '),
        // ── Surfaces teintées (soft tokens charte) + bordure encre + ombre sticker ──
        brand: [
          'bg-brand-soft text-foreground border-ink',
          'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr',
        ].join(' '),
        accent: [
          'bg-accent-soft text-foreground border-ink',
          'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr',
        ].join(' '),
        success: [
          'bg-success-soft text-foreground border-ink',
          'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr',
        ].join(' '),
        info: [
          'bg-info-soft text-foreground border-ink',
          'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr',
        ].join(' '),
        warning: [
          'bg-warning-soft text-foreground border-ink',
          'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr',
        ].join(' '),
        danger: [
          'bg-danger-soft text-foreground border-ink',
          'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr',
        ].join(' '),
        // ── Variants décoratifs : neutralisés en cartes paper (glass/glow
        // dépréciés — plus de backdrop-blur ni glow, cf. F4/F5) ──
        glass: [
          'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr',
        ].join(' '),
        glow: [
          'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink',
        ].join(' '),
        interactive: [
          'cursor-pointer',
          'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr',
          'active:translate-x-0 active:translate-y-0 active:shadow-stkr-sm',
        ].join(' '),
        flat: 'border-0 shadow-none bg-muted/50',
        gradient: [
          'bg-secondary',
          'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr',
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
      className={cn('font-display leading-tight font-bold text-lg tracking-tight', className)}
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
