'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

/**
 * Client component to explicitly track Web Vitals
 * Note: Sentry Next.js automatically tracks Web Vitals, but this component
 * ensures explicit tracking and allows custom metrics
 */
export function SentryWebVitals() {
  useEffect(() => {
    // Web Vitals are automatically tracked by Sentry Next.js SDK
    // This component is here for explicit tracking if needed
    
    // Optional: Track custom performance metrics
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Track page load time
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navigation) {
          Sentry.metrics.distribution('page.load_time', navigation.loadEventEnd - navigation.fetchStart, {
            unit: 'millisecond',
            tags: {
              page: window.location.pathname,
            },
          })
        }
      })
    }
  }, [])

  return null // This component doesn't render anything
}

