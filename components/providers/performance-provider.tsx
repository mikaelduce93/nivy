"use client"

/**
 * TEENS PARTY MOROCCO - Performance Provider
 * ==========================================
 *
 * Client-side performance monitoring provider.
 * Tracks Web Vitals and reports to analytics.
 */

import { useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { reportWebVitals } from '@/lib/monitoring/analytics'
import type { WebVitalsMetric } from '@/lib/monitoring/analytics'

/* ==========================================================================
   WEB VITALS TYPES
   ========================================================================== */

interface PerformanceEntry {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
}

/* ==========================================================================
   THRESHOLDS
   ========================================================================== */

const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
} as const

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

function getRating(
  name: keyof typeof THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name]
  if (!threshold) return 'good'
  if (value <= threshold.good) return 'good'
  if (value <= threshold.poor) return 'needs-improvement'
  return 'poor'
}

function generateId(): string {
  return `v${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/* ==========================================================================
   PERFORMANCE PROVIDER COMPONENT
   ========================================================================== */

interface PerformanceProviderProps {
  children: React.ReactNode
}

export function PerformanceProvider({ children }: PerformanceProviderProps) {
  const pathname = usePathname()
  const previousPathname = useRef<string>(pathname)

  // Report a metric to analytics
  const reportMetric = useCallback((metric: WebVitalsMetric) => {
    reportWebVitals(metric)

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌'
      console.log(
        `${emoji} [Web Vital] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`
      )
    }
  }, [])

  // Track navigation timing
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      const startTime = performance.now()
      previousPathname.current = pathname

      // Track route change duration
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const duration = performance.now() - startTime
          if (process.env.NODE_ENV === 'development') {
            console.log(`[Navigation] ${pathname}: ${duration.toFixed(2)}ms`)
          }
        })
      })
    }
  }, [pathname])

  // Observe LCP (Largest Contentful Paint)
  useEffect(() => {
    if (typeof window === 'undefined') return

    let lcpValue = 0
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      lcpValue = lastEntry.startTime

      reportMetric({
        name: 'LCP',
        value: lcpValue,
        rating: getRating('LCP', lcpValue),
        delta: lcpValue,
        id: generateId(),
      })
    })

    try {
      observer.observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {
      // Browser doesn't support LCP
    }

    return () => observer.disconnect()
  }, [reportMetric])

  // Observe FID (First Input Delay)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        const value = entry.processingStart - entry.startTime

        reportMetric({
          name: 'FID',
          value,
          rating: getRating('FID', value),
          delta: value,
          id: generateId(),
        })
      })
    })

    try {
      observer.observe({ type: 'first-input', buffered: true })
    } catch {
      // Browser doesn't support FID
    }

    return () => observer.disconnect()
  }, [reportMetric])

  // Observe CLS (Cumulative Layout Shift)
  useEffect(() => {
    if (typeof window === 'undefined') return

    let clsValue = 0
    let clsEntries: PerformanceEntry[] = []

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      })
    })

    try {
      observer.observe({ type: 'layout-shift', buffered: true })
    } catch {
      // Browser doesn't support CLS
    }

    // Report final CLS value on page hide
    const reportCLS = () => {
      reportMetric({
        name: 'CLS',
        value: clsValue,
        rating: getRating('CLS', clsValue),
        delta: clsValue,
        id: generateId(),
      })
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        reportCLS()
      }
    })

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', reportCLS)
    }
  }, [reportMetric])

  // Observe FCP (First Contentful Paint)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          reportMetric({
            name: 'FCP',
            value: entry.startTime,
            rating: getRating('FCP', entry.startTime),
            delta: entry.startTime,
            id: generateId(),
          })
        }
      })
    })

    try {
      observer.observe({ type: 'paint', buffered: true })
    } catch {
      // Browser doesn't support paint timing
    }

    return () => observer.disconnect()
  }, [reportMetric])

  // Observe TTFB (Time to First Byte)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        const ttfb = entry.responseStart

        reportMetric({
          name: 'TTFB',
          value: ttfb,
          rating: getRating('TTFB', ttfb),
          delta: ttfb,
          id: generateId(),
        })
      })
    })

    try {
      observer.observe({ type: 'navigation', buffered: true })
    } catch {
      // Browser doesn't support navigation timing
    }

    return () => observer.disconnect()
  }, [reportMetric])

  // Observe INP (Interaction to Next Paint)
  useEffect(() => {
    if (typeof window === 'undefined') return

    let inpValue = 0
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        const value = entry.duration
        if (value > inpValue) {
          inpValue = value
        }
      })
    })

    try {
      observer.observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit)
    } catch {
      // Browser doesn't support INP
    }

    // Report INP on page hide
    const reportINP = () => {
      if (inpValue > 0) {
        reportMetric({
          name: 'INP',
          value: inpValue,
          rating: getRating('INP', inpValue),
          delta: inpValue,
          id: generateId(),
        })
      }
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        reportINP()
      }
    })

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', reportINP)
    }
  }, [reportMetric])

  return <>{children}</>
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export default PerformanceProvider
