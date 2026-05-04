import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Base styles
        'flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs md:text-sm',
        // Border and background
        'border-input dark:bg-input/30',
        // Text and placeholder
        'text-foreground placeholder:text-muted-foreground',
        // Selection
        'selection:bg-primary selection:text-primary-foreground',
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
        // Resize
        'resize-y',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
