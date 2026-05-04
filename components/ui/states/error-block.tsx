'use client'

/**
 * TEENS PARTY MOROCCO - Error Block Component
 * ===========================================
 *
 * Composant pour afficher les erreurs de manière cohérente
 * avec options de retry et messages d'aide.
 */

import * as React from 'react'
import {
  AlertCircle,
  AlertTriangle,
  WifiOff,
  ServerCrash,
  ShieldX,
  RefreshCw,
  Home,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

/* ==========================================================================
   ERROR TYPES & PRESETS
   ========================================================================== */

type ErrorType = 'generic' | 'network' | 'server' | 'notFound' | 'forbidden' | 'validation'

const errorPresets: Record<ErrorType, {
  icon: LucideIcon
  title: string
  description: string
  suggestion: string
  actionLabel?: string
}> = {
  generic: {
    icon: AlertCircle,
    title: 'Oups, quelque chose s\'est mal passé',
    description: 'Une erreur inattendue s\'est produite. Pas de panique, on va résoudre ça !',
    suggestion: 'Essayez de rafraîchir la page. Si le problème persiste, notre équipe a été automatiquement notifiée.',
    actionLabel: 'Rafraîchir la page',
  },
  network: {
    icon: WifiOff,
    title: 'Problème de connexion',
    description: 'Nous n\'arrivons pas à nous connecter au serveur. Cela peut être dû à votre connexion internet.',
    suggestion: 'Vérifiez que vous êtes bien connecté à internet. Si vous êtes sur mobile, passez peut-être en WiFi.',
    actionLabel: 'Réessayer la connexion',
  },
  server: {
    icon: ServerCrash,
    title: 'Service temporairement indisponible',
    description: 'Notre serveur rencontre un problème technique. Nos équipes travaillent déjà sur la résolution.',
    suggestion: 'Réessayez dans quelques instants. Si le problème persiste après 5 minutes, contactez le support.',
    actionLabel: 'Réessayer',
  },
  notFound: {
    icon: AlertTriangle,
    title: 'Page introuvable',
    description: 'La page que vous recherchez n\'existe pas ou a été déplacée.',
    suggestion: 'Vérifiez l\'adresse dans la barre d\'adresse, ou retournez à l\'accueil pour continuer votre navigation.',
    actionLabel: 'Retour à l\'accueil',
  },
  forbidden: {
    icon: ShieldX,
    title: 'Accès non autorisé',
    description: 'Vous n\'avez pas les permissions nécessaires pour accéder à cette page.',
    suggestion: 'Si vous pensez que c\'est une erreur, vérifiez que vous êtes connecté avec le bon compte ou contactez le support.',
    actionLabel: 'Retour',
  },
  validation: {
    icon: AlertCircle,
    title: 'Données incorrectes',
    description: 'Certaines informations que vous avez saisies ne sont pas valides.',
    suggestion: 'Vérifiez les champs en rouge ci-dessous et corrigez les erreurs avant de réessayer.',
    actionLabel: 'Corriger',
  },
}

/* ==========================================================================
   ERROR BLOCK COMPONENT
   ========================================================================== */

interface ErrorBlockProps {
  /** Error type preset */
  type?: ErrorType
  /** Custom error title */
  title?: string
  /** Custom error description */
  description?: string
  /** Custom suggestion text */
  suggestion?: string
  /** Technical error message (shown in dev mode or expandable) */
  error?: Error | string | null
  /** Show retry button */
  showRetry?: boolean
  /** Retry callback */
  onRetry?: () => void
  /** Is currently retrying */
  isRetrying?: boolean
  /** Show home button */
  showHome?: boolean
  /** Show back button */
  showBack?: boolean
  /** Custom back href */
  backHref?: string
  /** Size variant */
  size?: 'inline' | 'card' | 'fullpage'
  /** Additional className */
  className?: string
  /** Children for custom content */
  children?: React.ReactNode
}

export function ErrorBlock({
  type = 'generic',
  title: customTitle,
  description: customDescription,
  suggestion: customSuggestion,
  error,
  showRetry = true,
  onRetry,
  isRetrying = false,
  showHome = false,
  showBack = false,
  backHref,
  size = 'card',
  className,
  children,
}: ErrorBlockProps) {
  const [showDetails, setShowDetails] = React.useState(false)
  const preset = errorPresets[type]
  const Icon = preset.icon

  const title = customTitle || preset.title
  const description = customDescription || preset.description
  const suggestion = customSuggestion || preset.suggestion

  // Get error message string
  const errorMessage = error instanceof Error ? error.message : error

  // Inline variant (for form errors, etc.)
  if (size === 'inline') {
    return (
      <Alert variant="destructive" className={cn('', className)}>
        <Icon className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="mt-1">
          {description}
          {showRetry && onRetry && (
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto ml-2 text-destructive-foreground underline"
              onClick={onRetry}
              disabled={isRetrying}
            >
              {isRetrying ? 'Réessai...' : 'Réessayer'}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  // Card variant (default)
  if (size === 'card') {
    return (
      <div
        className={cn(
          'rounded-xl border border-destructive/20 bg-destructive/5 p-6',
          className
        )}
        role="alert"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground mb-2">{description}</p>
            <p className="text-xs text-muted-foreground/70">{suggestion}</p>

            {/* Error details (expandable in dev) */}
            {errorMessage && process.env.NODE_ENV === 'development' && (
              <div className="mt-3">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  {showDetails ? 'Masquer les détails' : 'Afficher les détails'}
                </button>
                {showDetails && (
                  <pre className="mt-2 p-2 rounded bg-muted text-xs text-muted-foreground overflow-auto max-h-32">
                    {errorMessage}
                  </pre>
                )}
              </div>
            )}

            {/* Custom children */}
            {children}

            {/* Actions */}
            {(showRetry || showBack || showHome) && (
              <div className="flex items-center gap-2 mt-4">
                {showRetry && onRetry && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onRetry}
                    disabled={isRetrying}
                  >
                    <RefreshCw className={cn('w-4 h-4 mr-2', isRetrying && 'animate-spin')} />
                    {isRetrying ? 'Réessai...' : 'Réessayer'}
                  </Button>
                )}
                {showBack && (
                  backHref ? (
                    <Link href={backHref}>
                      <Button size="sm" variant="ghost">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Retour
                      </Button>
                    </Link>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => window.history.back()}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Retour
                    </Button>
                  )
                )}
                {showHome && (
                  <Link href="/">
                    <Button size="sm" variant="ghost">
                      <Home className="w-4 h-4 mr-2" />
                      Accueil
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Fullpage variant (for error pages)
  return (
    <div
      className={cn(
        'min-h-[60vh] flex flex-col items-center justify-center text-center px-4',
        className
      )}
      role="alert"
    >
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-destructive" />
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{title}</h1>
      <p className="text-muted-foreground max-w-md mb-2">{description}</p>
      <p className="text-sm text-muted-foreground/70 max-w-md mb-8">{suggestion}</p>

      {/* Error details */}
      {errorMessage && process.env.NODE_ENV === 'development' && (
        <div className="w-full max-w-md mb-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            {showDetails ? 'Masquer les détails' : 'Afficher les détails'}
          </button>
          {showDetails && (
            <pre className="mt-2 p-3 rounded-lg bg-muted text-xs text-muted-foreground overflow-auto max-h-40 text-left">
              {errorMessage}
            </pre>
          )}
        </div>
      )}

      {/* Custom children */}
      {children}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {showRetry && onRetry && (
          <Button onClick={onRetry} disabled={isRetrying}>
            <RefreshCw className={cn('w-4 h-4 mr-2', isRetrying && 'animate-spin')} />
            {isRetrying ? 'Réessai en cours...' : 'Réessayer'}
          </Button>
        )}
        {showHome && (
          <Link href="/">
            <Button variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </Link>
        )}
        {showBack && (
          backHref ? (
            <Link href={backHref}>
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </Link>
          ) : (
            <Button variant="ghost" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          )
        )}
      </div>
    </div>
  )
}
