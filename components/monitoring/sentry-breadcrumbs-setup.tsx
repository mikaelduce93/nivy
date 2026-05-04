'use client'

import { useEffect } from 'react'
import { setupSentryBreadcrumbs } from '@/lib/monitoring/sentry-enhanced'

/**
 * Client component to setup Sentry breadcrumbs
 * Should be included in the root layout
 */
export function SentryBreadcrumbsSetup() {
  useEffect(() => {
    setupSentryBreadcrumbs()
  }, [])

  return null // This component doesn't render anything
}

