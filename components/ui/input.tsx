import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles — h-11 (44px) for mobile touch target compliance (TICKET-004)
        'flex h-11 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs md:text-sm',
        // Border and background
        'border-input dark:bg-input/30',
        // Text and placeholder
        'text-foreground placeholder:text-muted-foreground',
        // Selection
        'selection:bg-primary selection:text-primary-foreground',
        // File input
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
        // Transitions
        'transition-colors duration-200',
        // Focus states — surface-aware ring (TICKET-018).
        // Falls back to --ring on surfaces that do not override --focus-ring-color.
        // Keeps 3px ring + border highlight — WCAG 2.4.7.
        'outline-none focus-visible:border-[color:var(--focus-ring-color,var(--ring))]',
        'focus-visible:ring-[3px] focus-visible:ring-[color:var(--focus-ring-color,var(--ring))]/50',
        // Invalid states
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        // Disabled states
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
        // Read-only states
        'read-only:bg-muted/50 read-only:cursor-default',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
