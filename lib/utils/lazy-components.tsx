'use client'

/**
 * Re-export shim for backwards compatibility.
 *
 * Canonical source: `@/lib/client/lazy-components`.
 *
 * This file historically duplicated lazy-loaded third-party libraries
 * (recharts, framer-motion, qrcode, canvas-confetti, image-gallery, pdf-viewer, date-picker).
 * Those exports have been merged into `lib/client/lazy-components.tsx`.
 *
 * New code MUST import from `@/lib/client/lazy-components`.
 *
 * Note: this module intentionally keeps a default export for any legacy code
 * that imported the default object.
 */

export {
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
} from '@/lib/client/lazy-components'

import {
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
} from '@/lib/client/lazy-components'

const legacyDefault = {
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

export default legacyDefault
