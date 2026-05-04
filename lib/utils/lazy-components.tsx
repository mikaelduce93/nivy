"use client"

/**
 * TEENS PARTY MOROCCO - Lazy Loading Components
 * ==============================================
 *
 * Dynamic imports for heavy components to reduce initial bundle size.
 * These components are loaded on demand when needed.
 */

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { ComponentType, ReactNode } from 'react'

/* ==========================================================================
   LOADING PLACEHOLDER
   ========================================================================== */

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
    </div>
  )
}

function LoadingCard() {
  return (
    <div className="animate-pulse bg-zinc-800/50 rounded-xl p-6">
      <div className="h-4 bg-zinc-700 rounded w-3/4 mb-4" />
      <div className="h-4 bg-zinc-700 rounded w-1/2" />
    </div>
  )
}

/* ==========================================================================
   FRAMER MOTION COMPONENTS
   ========================================================================== */

/**
 * Lazy-loaded motion.div for animations
 * Use this for non-critical animations that can load after initial render
 */
export const LazyMotionDiv = dynamic(
  () => import('framer-motion').then((mod) => {
    const MotionDiv = mod.motion.div as ComponentType<any>
    return MotionDiv
  }),
  {
    ssr: false,
    loading: () => <div />,
  }
)

/* ==========================================================================
   CHART COMPONENTS
   ========================================================================== */

/**
 * Lazy-loaded chart components from recharts
 */
export const LazyLineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart),
  {
    ssr: false,
    loading: () => <LoadingCard />,
  }
)

export const LazyBarChart = dynamic(
  () => import('recharts').then((mod) => mod.BarChart),
  {
    ssr: false,
    loading: () => <LoadingCard />,
  }
)

export const LazyPieChart = dynamic(
  () => import('recharts').then((mod) => mod.PieChart),
  {
    ssr: false,
    loading: () => <LoadingCard />,
  }
)

export const LazyAreaChart = dynamic(
  () => import('recharts').then((mod) => mod.AreaChart),
  {
    ssr: false,
    loading: () => <LoadingCard />,
  }
)

/* ==========================================================================
   QR CODE COMPONENT
   ========================================================================== */

/**
 * Lazy-loaded QR code generator
 */
export const LazyQRCode = dynamic(
  () => import('qrcode.react').then((mod) => mod.QRCodeCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-32 h-32 bg-zinc-800 animate-pulse rounded" />
    ),
  }
)

/* ==========================================================================
   CONFETTI COMPONENT
   ========================================================================== */

/**
 * Lazy-loaded confetti for celebrations
 */
export const useConfetti = () => {
  return async (options?: any) => {
    const confetti = (await import('canvas-confetti')).default
    return confetti(options)
  }
}

/* ==========================================================================
   HEAVY MODAL COMPONENTS
   ========================================================================== */

/**
 * Lazy-loaded image gallery/lightbox
 */
export const LazyImageGallery = dynamic(
  () => import('@/components/ui/image-gallery').catch(() => {
    // Fallback if component doesn't exist
    return () => <div>Gallery not available</div>
  }),
  {
    ssr: false,
    loading: () => <LoadingSpinner />,
  }
)

/* ==========================================================================
   PDF VIEWER
   ========================================================================== */

/**
 * Lazy-loaded PDF viewer for tickets
 */
export const LazyPDFViewer = dynamic(
  () => import('@/components/pdf-viewer').catch(() => {
    return () => <div>PDF Viewer not available</div>
  }),
  {
    ssr: false,
    loading: () => <LoadingSpinner />,
  }
)

/* ==========================================================================
   DATE PICKER
   ========================================================================== */

/**
 * Lazy-loaded date picker with calendar
 */
export const LazyDatePicker = dynamic(
  () => import('@/components/ui/date-picker').then((mod) => mod.DatePicker).catch(() => {
    return ({ onChange, value }: any) => (
      <input
        type="date"
        value={value}
        onChange={(e) => onChange?.(new Date(e.target.value))}
        className="border rounded px-3 py-2"
      />
    )
  }),
  {
    ssr: false,
    loading: () => <div className="h-10 bg-zinc-800 animate-pulse rounded" />,
  }
)

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export default {
  LazyMotionDiv,
  LazyLineChart,
  LazyBarChart,
  LazyPieChart,
  LazyAreaChart,
  LazyQRCode,
  useConfetti,
  LazyImageGallery,
  LazyPDFViewer,
  LazyDatePicker,
}
