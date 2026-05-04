'use client'

/**
 * TEENS PARTY MOROCCO - Loading Component
 * =======================================
 *
 * Composant de chargement uniforme avec plusieurs variantes
 * et messages contextuels.
 */

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ==========================================================================
   LOADING MESSAGES
   ========================================================================== */

const loadingMessages = [
  'Chargement en cours...',
  'Un instant...',
  'Préparation...',
  'Récupération des données...',
]

const contextMessages: Record<string, string> = {
  events: 'Chargement des événements...',
  tickets: 'Récupération de vos réservations...',
  profile: 'Chargement du profil...',
  clubs: 'Chargement des clubs...',
  notifications: 'Chargement des notifications...',
  payment: 'Traitement du paiement...',
  submit: 'Envoi en cours...',
  save: 'Enregistrement...',
  delete: 'Suppression...',
  upload: 'Téléchargement...',
  download: 'Téléchargement...',
  search: 'Recherche...',
  auth: 'Authentification...',
}

/* ==========================================================================
   LOADING SPINNER VARIANTS
   ========================================================================== */

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  }

  return (
    <Loader2
      className={cn('animate-spin text-primary', sizeClasses[size], className)}
      role="status"
      aria-label="Chargement"
    />
  )
}

/* ==========================================================================
   LOADING DOTS
   ========================================================================== */

interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingDots({ size = 'md', className }: LoadingDotsProps) {
  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  }

  return (
    <div className={cn('flex items-center gap-1', className)} role="status" aria-label="Chargement">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-full bg-primary animate-bounce',
            sizeClasses[size]
          )}
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

/* ==========================================================================
   LOADING PULSE
   ========================================================================== */

interface LoadingPulseProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingPulse({ size = 'md', className }: LoadingPulseProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  return (
    <div className={cn('relative', sizeClasses[size], className)} role="status" aria-label="Chargement">
      <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
      <div className="absolute inset-2 rounded-full bg-primary/50 animate-pulse" />
      <div className="absolute inset-4 rounded-full bg-primary" />
    </div>
  )
}

/* ==========================================================================
   MAIN LOADING COMPONENT
   ========================================================================== */

interface LoadingProps {
  /** Context for automatic message */
  context?: keyof typeof contextMessages
  /** Custom message (overrides context) */
  message?: string
  /** Show message */
  showMessage?: boolean
  /** Size variant */
  size?: 'inline' | 'small' | 'default' | 'large' | 'fullscreen'
  /** Spinner variant */
  variant?: 'spinner' | 'dots' | 'pulse'
  /** Additional className */
  className?: string
}

export function Loading({
  context,
  message: customMessage,
  showMessage = true,
  size = 'default',
  variant = 'spinner',
  className,
}: LoadingProps) {
  // Resolve message
  const message = customMessage || (context ? contextMessages[context] : loadingMessages[0])

  // Inline variant (for buttons, small areas)
  if (size === 'inline') {
    return (
      <span className={cn('inline-flex items-center gap-2', className)}>
        <LoadingSpinner size="sm" />
        {showMessage && <span className="text-sm text-muted-foreground">{message}</span>}
      </span>
    )
  }

  // Small variant (for cards, small sections)
  if (size === 'small') {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8', className)}>
        {variant === 'spinner' && <LoadingSpinner size="md" />}
        {variant === 'dots' && <LoadingDots size="md" />}
        {variant === 'pulse' && <LoadingPulse size="sm" />}
        {showMessage && (
          <p className="mt-3 text-sm text-muted-foreground">{message}</p>
        )}
      </div>
    )
  }

  // Default variant
  if (size === 'default') {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16', className)}>
        {variant === 'spinner' && <LoadingSpinner size="lg" />}
        {variant === 'dots' && <LoadingDots size="lg" />}
        {variant === 'pulse' && <LoadingPulse size="md" />}
        {showMessage && (
          <p className="mt-4 text-muted-foreground">{message}</p>
        )}
      </div>
    )
  }

  // Large variant
  if (size === 'large') {
    return (
      <div className={cn('flex flex-col items-center justify-center py-24', className)}>
        {variant === 'spinner' && <LoadingSpinner size="xl" />}
        {variant === 'dots' && <LoadingDots size="lg" />}
        {variant === 'pulse' && <LoadingPulse size="lg" />}
        {showMessage && (
          <p className="mt-6 text-lg text-muted-foreground">{message}</p>
        )}
      </div>
    )
  }

  // Fullscreen variant
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm',
        className
      )}
    >
      {variant === 'spinner' && <LoadingSpinner size="xl" />}
      {variant === 'dots' && <LoadingDots size="lg" />}
      {variant === 'pulse' && <LoadingPulse size="lg" />}
      {showMessage && (
        <p className="mt-6 text-lg text-muted-foreground">{message}</p>
      )}
    </div>
  )
}

/* ==========================================================================
   LOADING OVERLAY (for wrapping content)
   ========================================================================== */

interface LoadingOverlayProps {
  isLoading: boolean
  message?: string
  variant?: 'spinner' | 'dots' | 'pulse'
  children: React.ReactNode
  className?: string
}

export function LoadingOverlay({
  isLoading,
  message,
  variant = 'spinner',
  children,
  className,
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-inherit z-10">
          {variant === 'spinner' && <LoadingSpinner size="lg" />}
          {variant === 'dots' && <LoadingDots size="md" />}
          {variant === 'pulse' && <LoadingPulse size="md" />}
          {message && (
            <p className="mt-4 text-sm text-muted-foreground">{message}</p>
          )}
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   BUTTON LOADING STATE
   ========================================================================== */

interface ButtonLoadingProps {
  isLoading: boolean
  loadingText?: string
  children: React.ReactNode
}

export function ButtonLoading({ isLoading, loadingText, children }: ButtonLoadingProps) {
  if (isLoading) {
    return (
      <>
        <LoadingSpinner size="sm" className="mr-2" />
        {loadingText || 'Chargement...'}
      </>
    )
  }
  return <>{children}</>
}
