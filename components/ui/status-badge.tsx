import * as React from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Info,
  Loader2,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * StatusBadge — TICKET-007 (design-system architect).
 *
 * A pill primitive used by Wave-3 surfaces (food order timeline, ride status,
 * internship application, mentor session, KYC) to communicate state with a
 * consistent color + icon + label combo.
 *
 * - variants: success / warning / danger / info / neutral / pending
 * - sizes: sm / md
 * - icon: optional Lucide component or arbitrary ReactNode
 *         (falls back to a sensible default per variant)
 * - pulse: optional animated dot for active/pending states
 * - semantic tokens only (success-soft, accent-soft, info-soft, etc.)
 * - focus-visible + aria-label support (rendered as <span role="status">)
 */

// ---------------------------------------------------------------------------
// CVA — base shape + variants/sizes
// ---------------------------------------------------------------------------
const statusBadgeVariants = cva(
  cn(
    'relative inline-flex items-center gap-1.5 whitespace-nowrap',
    'rounded-full border font-medium leading-none',
    'transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    '[&>svg]:shrink-0 [&>svg]:pointer-events-none',
  ),
  {
    variants: {
      variant: {
        success:
          'border-success/30 bg-success-soft/15 text-success [&>svg]:text-success',
        warning:
          'border-warning/40 bg-warning/15 text-warning-foreground [&>svg]:text-warning',
        danger:
          'border-destructive/40 bg-destructive/12 text-destructive [&>svg]:text-destructive',
        info:
          'border-info/30 bg-info-soft/15 text-info [&>svg]:text-info',
        neutral:
          'border-border bg-muted text-muted-foreground [&>svg]:text-muted-foreground',
        pending:
          'border-brand-soft/40 bg-brand-soft/15 text-primary [&>svg]:text-primary',
      },
      size: {
        sm: 'h-5 px-2 text-[11px] [&>svg]:size-3',
        md: 'h-6 px-2.5 text-xs [&>svg]:size-3.5',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'md',
    },
  },
)

// ---------------------------------------------------------------------------
// Variant → default icon + pulse-color mapping
// ---------------------------------------------------------------------------
type StatusVariant = NonNullable<
  VariantProps<typeof statusBadgeVariants>['variant']
>
type StatusSize = NonNullable<VariantProps<typeof statusBadgeVariants>['size']>

const defaultIconByVariant: Record<StatusVariant, LucideIcon> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
  neutral: Circle,
  pending: Loader2,
}

const pulseDotByVariant: Record<StatusVariant, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-info',
  neutral: 'bg-muted-foreground',
  pending: 'bg-primary',
}

// Variants where the default icon should spin (loader-like).
const spinningVariants = new Set<StatusVariant>(['pending'])

// ---------------------------------------------------------------------------
// Public props
// ---------------------------------------------------------------------------
export interface StatusBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>,
    VariantProps<typeof statusBadgeVariants> {
  /** Visible label (string) or fully-custom children. */
  label?: React.ReactNode
  /** Override the leading icon. Pass `false` to suppress. */
  icon?: LucideIcon | React.ReactNode | false
  /** Render an animated pulse dot to the left of the label. */
  pulse?: boolean
  /** Convenience pass-through for screen-reader label when no visible text. */
  'aria-label'?: string
  /** Optional children (overrides `label`). */
  children?: React.ReactNode
}

// Helper — distinguish a Lucide component (function) from a ReactNode.
function isIconComponent(
  candidate: unknown,
): candidate is LucideIcon {
  return typeof candidate === 'function'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  function StatusBadge(
    {
      className,
      variant,
      size,
      label,
      icon,
      pulse = false,
      children,
      ...rest
    },
    ref,
  ) {
    const resolvedVariant: StatusVariant = variant ?? 'neutral'
    const resolvedSize: StatusSize = size ?? 'md'

    // Resolve icon
    let renderedIcon: React.ReactNode = null
    if (icon !== false) {
      if (icon === undefined) {
        const DefaultIcon = defaultIconByVariant[resolvedVariant]
        renderedIcon = (
          <DefaultIcon
            aria-hidden="true"
            className={cn(
              spinningVariants.has(resolvedVariant) &&
                'motion-safe:animate-spin',
            )}
          />
        )
      } else if (isIconComponent(icon)) {
        const IconComp = icon
        renderedIcon = <IconComp aria-hidden="true" />
      } else {
        // Arbitrary ReactNode (e.g. emoji, custom svg).
        renderedIcon = (
          <span aria-hidden="true" className="inline-flex">
            {icon}
          </span>
        )
      }
    }

    const content = children ?? label

    return (
      <span
        ref={ref}
        role="status"
        data-slot="status-badge"
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        className={cn(
          statusBadgeVariants({
            variant: resolvedVariant,
            size: resolvedSize,
          }),
          className,
        )}
        {...rest}
      >
        {pulse ? (
          <span
            aria-hidden="true"
            className="relative inline-flex size-2 items-center justify-center"
          >
            <span
              className={cn(
                'absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping',
                pulseDotByVariant[resolvedVariant],
              )}
            />
            <span
              className={cn(
                'relative inline-flex size-2 rounded-full',
                pulseDotByVariant[resolvedVariant],
              )}
            />
          </span>
        ) : null}
        {renderedIcon}
        {content !== undefined && content !== null ? (
          <span className="truncate">{content}</span>
        ) : null}
      </span>
    )
  },
)

StatusBadge.displayName = 'StatusBadge'

export { statusBadgeVariants }
export type { StatusVariant, StatusSize }
