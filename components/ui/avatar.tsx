'use client'

import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

// Gen-Z Avatar: Colorful rings, status indicators, playful
const avatarVariants = cva(
  'relative flex shrink-0 overflow-hidden rounded-full',
  {
    variants: {
      size: {
        xs: 'size-6',
        sm: 'size-8',
        default: 'size-10',
        lg: 'size-12',
        xl: 'size-16',
        '2xl': 'size-20',
        '3xl': 'size-24',
      },
      ring: {
        none: '',
        default: 'ring-2 ring-border ring-offset-2 ring-offset-background',
        primary: 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        gradient: 'ring-2 ring-gen-z-lavender ring-offset-2 ring-offset-background',
        // Neon rings for gamification
        party: 'ring-2 ring-neon-party ring-offset-2 ring-offset-background shadow-[0_0_10px_var(--neon-party)]',
        vitality: 'ring-2 ring-neon-vitality ring-offset-2 ring-offset-background shadow-[0_0_10px_var(--neon-vitality)]',
        intellect: 'ring-2 ring-neon-intellect ring-offset-2 ring-offset-background shadow-[0_0_10px_var(--neon-intellect)]',
        creativity: 'ring-2 ring-neon-creativity ring-offset-2 ring-offset-background shadow-[0_0_10px_var(--neon-creativity)]',
        prestige: 'ring-2 ring-neon-prestige ring-offset-2 ring-offset-background shadow-[0_0_10px_var(--neon-prestige)]',
      }
    },
    defaultVariants: {
      size: 'default',
      ring: 'none',
    },
  }
)

type PresenceStatus = "online" | "away" | "playing" | "busy" | "offline"

interface AvatarProps 
  extends React.ComponentProps<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  online?: boolean
  showStatus?: boolean
  presenceStatus?: PresenceStatus
}

// Map presence status to colors
const presenceColors: Record<PresenceStatus, string> = {
  online: 'bg-success',
  away: 'bg-yellow-500',
  playing: 'bg-gen-z-lavender',
  busy: 'bg-destructive',
  offline: 'bg-muted-foreground',
}

function Avatar({
  className,
  size,
  ring,
  online,
  showStatus = false,
  presenceStatus,
  children,
  ...props
}: AvatarProps) {
  // Determine actual status from props
  const status: PresenceStatus = presenceStatus || (online ? 'online' : 'offline')
  const isActive = status !== 'offline'
  
  return (
    <div className="relative inline-flex">
      <AvatarPrimitive.Root
        data-slot="avatar"
        className={cn(avatarVariants({ size, ring }), className)}
        {...props}
      >
        {children}
      </AvatarPrimitive.Root>
      
      {/* Presence status indicator */}
      {showStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-background',
            'transition-colors duration-200',
            size === 'xs' && 'size-1.5',
            size === 'sm' && 'size-2',
            size === 'default' && 'size-2.5',
            size === 'lg' && 'size-3',
            size === 'xl' && 'size-3.5',
            size === '2xl' && 'size-4',
            size === '3xl' && 'size-5',
            presenceColors[status],
            isActive && status === 'online' && 'animate-pulse'
          )}
          title={status.charAt(0).toUpperCase() + status.slice(1)}
        />
      )}
    </div>
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('aspect-square size-full object-cover', className)}
      {...props}
    />
  )
}

const fallbackVariants = cva(
  'flex size-full items-center justify-center rounded-full font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-muted text-muted-foreground',
        primary: 'bg-primary text-primary-foreground',
        gradient: 'bg-gradient-to-br from-gen-z-lavender to-gen-z-coral text-white',
        lavender: 'bg-gen-z-lavender text-white',
        coral: 'bg-gen-z-coral text-white',
        lime: 'bg-gen-z-lime text-on-bright',
        mint: 'bg-gen-z-mint text-on-bright',
        grape: 'bg-gen-z-grape text-white',
      }
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

interface AvatarFallbackProps 
  extends React.ComponentProps<typeof AvatarPrimitive.Fallback>,
    VariantProps<typeof fallbackVariants> {}

function AvatarFallback({
  className,
  variant,
  ...props
}: AvatarFallbackProps) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(fallbackVariants({ variant }), className)}
      {...props}
    />
  )
}

// Avatar group for showing multiple avatars stacked
interface AvatarGroupProps {
  children: React.ReactNode
  max?: number
  className?: string
}

function AvatarGroup({ children, max = 4, className }: AvatarGroupProps) {
  const childArray = React.Children.toArray(children)
  const visibleChildren = childArray.slice(0, max)
  const remainingCount = childArray.length - max

  return (
    <div className={cn('flex -space-x-3', className)}>
      {visibleChildren.map((child, index) => (
        <div 
          key={index} 
          className="ring-2 ring-background rounded-full"
          style={{ zIndex: visibleChildren.length - index }}
        >
          {child}
        </div>
      ))}
      {remainingCount > 0 && (
        <div 
          className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-semibold ring-2 ring-background"
          style={{ zIndex: 0 }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup, avatarVariants }
