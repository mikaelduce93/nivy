/**
 * TEENS PARTY MOROCCO - Page Error Component
 * ==========================================
 *
 * Composant wrapper pour les pages error.tsx
 * Utilise ErrorBlock avec configuration par défaut
 */

'use client'

import { useEffect } from 'react'
import { ErrorBlock } from './error-block'
import type { ErrorType } from './error-block'
import { captureError } from '@/lib/monitoring/sentry'

interface PageErrorProps {
  error: Error & { digest?: string }
  reset: () => void
  type?: ErrorType
  title?: string
  description?: string
  suggestion?: string
  showHome?: boolean
  homeHref?: string
  showBack?: boolean
  backHref?: string
}

export function PageError({
  error,
  reset,
  type = 'generic',
  title,
  description,
  suggestion,
  showHome = true,
  homeHref = '/',
  showBack = false,
  backHref,
}: PageErrorProps) {
  useEffect(() => {
    // Log error to monitoring service. captureError is a no-op when Sentry DSN
    // is not configured (NEXT_PUBLIC_SENTRY_DSN), so this is safe in dev.
    console.error('[PageError]', error.message, error.digest ? `digest=${error.digest}` : '')
    captureError(error, {
      tags: { feature: 'page-error', error_type: type },
      extra: { digest: error.digest },
      level: 'error',
    })
  }, [error, type])

  // Add error digest as custom content if available
  const customContent = error.digest ? (
    <div className="mt-4">
      <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-3 py-2 rounded">
        Code erreur: {error.digest}
      </p>
    </div>
  ) : undefined

  return (
    <ErrorBlock
      type={type}
      title={title}
      description={description}
      suggestion={suggestion}
      error={error}
      showRetry={true}
      onRetry={reset}
      showHome={showHome}
      showBack={showBack}
      backHref={backHref}
      size="fullpage"
    >
      {customContent}
    </ErrorBlock>
  )
}

