'use client'

/**
 * TEENS PARTY MOROCCO - Query Error Fallback Component
 * ====================================================
 * 
 * Composant de fallback pour les erreurs de requêtes réseau
 * Utilisé avec React Query pour afficher un UI dégradé mais utilisable
 */

import { AlertCircle, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface QueryErrorFallbackProps {
  /** Message d'erreur */
  error: Error | string | null
  /** Fonction pour réessayer */
  onRetry?: () => void
  /** Titre personnalisé */
  title?: string
  /** Description personnalisée */
  description?: string
  /** Afficher le bouton retry */
  showRetry?: boolean
  /** Type d'erreur (network, server, unknown) */
  errorType?: 'network' | 'server' | 'unknown'
}

/**
 * Détecte le type d'erreur à partir de l'erreur
 */
function detectErrorType(error: Error | string | null): 'network' | 'server' | 'unknown' {
  if (!error) return 'unknown'
  
  const errorMessage = typeof error === 'string' ? error : error.message
  
  // Erreur réseau
  if (
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('NetworkError') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('AbortError')
  ) {
    return 'network'
  }
  
  // Erreur serveur (5xx)
  if (
    errorMessage.includes('500') ||
    errorMessage.includes('502') ||
    errorMessage.includes('503') ||
    errorMessage.includes('504')
  ) {
    return 'server'
  }
  
  return 'unknown'
}

/**
 * Composant de fallback pour les erreurs de requêtes
 * 
 * @example
 * ```tsx
 * const { data, error, refetch } = useEvents()
 * 
 * if (error) {
 *   return <QueryErrorFallback error={error} onRetry={() => refetch()} />
 * }
 * ```
 */
export function QueryErrorFallback({
  error,
  onRetry,
  title,
  description,
  showRetry = true,
  errorType,
}: QueryErrorFallbackProps) {
  const detectedType = errorType || detectErrorType(error)
  const errorMessage = typeof error === 'string' ? error : error?.message || 'Une erreur est survenue'
  
  const getErrorConfig = () => {
    switch (detectedType) {
      case 'network':
        return {
          icon: WifiOff,
          defaultTitle: 'Problème de connexion',
          defaultDescription: 'Vérifiez votre connexion internet et réessayez.',
          color: 'text-yellow-500',
        }
      case 'server':
        return {
          icon: AlertTriangle,
          defaultTitle: 'Erreur serveur',
          defaultDescription: 'Le serveur rencontre des difficultés. Veuillez réessayer dans quelques instants.',
          color: 'text-red-500',
        }
      default:
        return {
          icon: AlertCircle,
          defaultTitle: 'Erreur',
          defaultDescription: 'Une erreur inattendue s\'est produite.',
          color: 'text-orange-500',
        }
    }
  }
  
  const config = getErrorConfig()
  const Icon = config.icon
  
  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${config.color}`} />
          <CardTitle>{title || config.defaultTitle}</CardTitle>
        </div>
        <CardDescription>
          {description || config.defaultDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Message d'erreur détaillé (en développement) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="rounded-md bg-zinc-900 p-3 text-sm text-zinc-400">
            <strong>Détails:</strong> {errorMessage}
          </div>
        )}
        
        {/* Bouton retry */}
        {showRetry && onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
        )}
        
        {/* Suggestions selon le type d'erreur */}
        {detectedType === 'network' && (
          <div className="text-sm text-zinc-400">
            <p className="mb-2">Suggestions :</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Vérifiez votre connexion Wi-Fi ou mobile</li>
              <li>Désactivez temporairement votre VPN si vous en utilisez un</li>
              <li>Rafraîchissez la page</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Composant compact pour les erreurs inline
 */
export function QueryErrorInline({
  error,
  onRetry,
}: {
  error: Error | string | null
  onRetry?: () => void
}) {
  const errorMessage = typeof error === 'string' ? error : error?.message || 'Erreur'
  
  return (
    <div className="flex items-center gap-2 rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{errorMessage}</span>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="ghost"
          size="sm"
          className="h-auto p-1 text-red-400 hover:text-red-300"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}

