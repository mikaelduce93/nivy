import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles
        'flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs md:text-sm',
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
        // Focus states
        'outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
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
