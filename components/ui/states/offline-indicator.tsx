'use client'

/**
 * TEENS PARTY MOROCCO - Offline Indicator Component
 * =================================================
 *
 * Composant pour afficher l'état de connexion et gérer
 * le mode hors-ligne pour PWA.
 */

import * as React from 'react'
import { Wifi, WifiOff, RefreshCw, CloudOff, Signal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/* ==========================================================================
   HOOK: useOnlineStatus
   ========================================================================== */

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState(true)
  const [wasOffline, setWasOffline] = React.useState(false)

  React.useEffect(() => {
    // Initial check
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      // Keep wasOffline true for a moment to show "back online" message
      setTimeout(() => setWasOffline(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, wasOffline }
}

/* ==========================================================================
   OFFLINE BANNER (fixed top banner)
   ========================================================================== */

interface OfflineBannerProps {
  className?: string
}

export function OfflineBanner({ className }: OfflineBannerProps) {
  const { isOnline, wasOffline } = useOnlineStatus()
  const [dismissed, setDismissed] = React.useState(false)

  // Reset dismissed state when going offline again
  React.useEffect(() => {
    if (!isOnline) setDismissed(false)
  }, [isOnline])

  // Don't show if online and not recently offline, or if dismissed
  if ((isOnline && !wasOffline) || dismissed) return null

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-[100] px-4 py-2 text-center text-sm font-medium transition-all duration-300',
        isOnline
          ? 'bg-success text-success-foreground'
          : 'bg-warning text-warning-foreground',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>Connexion rétablie</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>Vous êtes hors ligne. Certaines fonctionnalités peuvent être limitées.</span>
          </>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="ml-4 text-xs underline hover:no-underline"
        >
          Fermer
        </button>
      </div>
    </div>
  )
}

/* ==========================================================================
   OFFLINE INDICATOR (small badge/icon)
   ========================================================================== */

interface OfflineIndicatorProps {
  /** Show only when offline */
  showOnlyOffline?: boolean
  /** Size variant */
  size?: 'sm' | 'md'
  className?: string
}

export function OfflineIndicator({
  showOnlyOffline = true,
  size = 'md',
  className,
}: OfflineIndicatorProps) {
  const { isOnline } = useOnlineStatus()

  if (showOnlyOffline && isOnline) return null

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-2',
  }

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        isOnline
          ? 'bg-success/10 text-success border border-success/20'
          : 'bg-warning/10 text-warning border border-warning/20',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label={isOnline ? 'En ligne' : 'Hors ligne'}
    >
      {isOnline ? (
        <>
          <Signal className={iconSize} />
          <span>En ligne</span>
        </>
      ) : (
        <>
          <CloudOff className={iconSize} />
          <span>Hors ligne</span>
        </>
      )}
    </div>
  )
}

/* ==========================================================================
   OFFLINE PAGE (full page for offline state)
   ========================================================================== */

interface OfflinePageProps {
  /** Custom title */
  title?: string
  /** Custom description */
  description?: string
  /** Show retry button */
  showRetry?: boolean
  /** Retry callback */
  onRetry?: () => void
  className?: string
}

export function OfflinePage({
  title = 'Vous êtes hors ligne',
  description = 'Vérifiez votre connexion internet pour accéder à toutes les fonctionnalités.',
  showRetry = true,
  onRetry,
  className,
}: OfflinePageProps) {
  const { isOnline } = useOnlineStatus()
  const [isRetrying, setIsRetrying] = React.useState(false)

  const handleRetry = async () => {
    setIsRetrying(true)
    if (onRetry) {
      await onRetry()
    } else {
      // Default: refresh page
      window.location.reload()
    }
    setIsRetrying(false)
  }

  // If back online, don't show this page
  if (isOnline) return null

  return (
    <div
      className={cn(
        'min-h-[60vh] flex flex-col items-center justify-center text-center px-4',
        className
      )}
    >
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mb-6">
        <WifiOff className="w-10 h-10 text-warning" />
      </div>

      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{title}</h1>

      {/* Description */}
      <p className="text-muted-foreground max-w-md mb-8">{description}</p>

      {/* Tips */}
      <div className="max-w-md mb-8 text-sm text-muted-foreground">
        <p className="font-medium mb-2">Conseils :</p>
        <ul className="text-left space-y-1">
          <li>• Vérifiez que le Wi-Fi ou les données mobiles sont activés</li>
          <li>• Essayez de vous rapprocher de votre routeur</li>
          <li>• Désactivez puis réactivez le mode avion</li>
        </ul>
      </div>

      {/* Actions */}
      {showRetry && (
        <Button onClick={handleRetry} disabled={isRetrying}>
          <RefreshCw className={cn('w-4 h-4 mr-2', isRetrying && 'animate-spin')} />
          {isRetrying ? 'Vérification...' : 'Réessayer'}
        </Button>
      )}
    </div>
  )
}

/* ==========================================================================
   OFFLINE WRAPPER (wraps content with offline state)
   ========================================================================== */

interface OfflineWrapperProps {
  /** Content to show when online */
  children: React.ReactNode
  /** Fallback content when offline (defaults to OfflinePage) */
  fallback?: React.ReactNode
  /** Custom retry handler */
  onRetry?: () => void
  className?: string
}

export function OfflineWrapper({
  children,
  fallback,
  onRetry,
  className,
}: OfflineWrapperProps) {
  const { isOnline } = useOnlineStatus()

  if (!isOnline) {
    return (
      <div className={className}>
        {fallback || <OfflinePage onRetry={onRetry} />}
      </div>
    )
  }

  return <>{children}</>
}
