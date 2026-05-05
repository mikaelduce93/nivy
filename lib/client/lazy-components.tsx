'use client'

/**
 * TEENS PARTY MOROCCO - Lazy Loaded Client Components
 * ===================================================
 *
 * Composants client chargés dynamiquement pour réduire le bundle initial.
 * Utilisez ces exports au lieu d'importer directement les composants lourds.
 *
 * SOURCE OF TRUTH for app-wide lazy loading.
 *
 * Canonicalisation Agent 7 (Phase 2):
 * - Ce fichier est la source canonique pour les composants lazy globaux.
 * - `lib/utils/lazy-components.tsx` re-exporte d'ici (rétro-compatibilité).
 * - `components/teen/dashboard/lazy-components.tsx` reste séparé car spécifique
 *   au dashboard teen (imports relatifs ./map-preview, ./ai-companion).
 */

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import { Loader2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/states'

/* ==========================================================================
   LOADING FALLBACKS
   ========================================================================== */

const DefaultLoading = () => (
  <div className="flex items-center justify-center py-8">
    <LoadingSpinner size="lg" />
  </div>
)

const CardLoading = () => (
  <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
    <div className="h-40 bg-muted rounded-lg mb-4" />
    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
    <div className="h-4 bg-muted rounded w-1/2" />
  </div>
)

const FormLoading = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-10 bg-muted rounded-lg" />
    <div className="h-10 bg-muted rounded-lg" />
    <div className="h-10 bg-muted rounded-lg" />
    <div className="h-10 bg-muted rounded-lg w-1/3" />
  </div>
)

/* ==========================================================================
   HEAVY FORM COMPONENTS (lazy loaded)
   ========================================================================== */

/**
 * Authorization form - Heavy with signature pad
 */
export const LazyAuthorizationForm = dynamic(
  () => import('@/components/authorization-form').then(mod => ({ default: mod.AuthorizationForm })),
  {
    loading: () => <FormLoading />,
    ssr: false, // Requires browser APIs
  }
)

/**
 * E-Signature form - Heavy with canvas
 */
export const LazyESignatureForm = dynamic(
  () => import('@/components/e-signature-form').then(mod => ({ default: mod.ESignatureForm })),
  {
    loading: () => <FormLoading />,
    ssr: false,
  }
)

/**
 * Photo upload component - Heavy with image processing
 */
export const LazyPhotoUpload = dynamic(
  () => import('@/components/photo-upload').then(mod => ({ default: mod.PhotoUpload })),
  {
    loading: () => <DefaultLoading />,
    ssr: false,
  }
)

/**
 * Signature pad component
 */
export const LazySignaturePad = dynamic(
  () => import('@/components/signature-pad').then(mod => ({ default: mod.SignaturePad })),
  {
    loading: () => <div className="h-40 bg-muted rounded-lg animate-pulse" />,
    ssr: false,
  }
)

/* ==========================================================================
   HEAVY INTERACTIVE COMPONENTS (lazy loaded)
   ========================================================================== */

/**
 * Check-in interface - Heavy with QR scanner
 */
export const LazyCheckInInterface = dynamic(
  () => import('@/components/check-in-interface').then(mod => ({ default: mod.CheckInInterface })),
  {
    loading: () => <DefaultLoading />,
    ssr: false,
  }
)

/**
 * Events carousel - Heavy with Embla
 */
export const LazyEventsCarousel = dynamic(
  () => import('@/components/events-carousel').then(mod => ({ default: mod.EventsCarousel })),
  {
    loading: () => <CardLoading />,
  }
)

/**
 * Club calendar - Heavy with date picker
 */
export const LazyClubCalendar = dynamic(
  () => import('@/components/club-calendar').then(mod => ({ default: mod.ClubCalendar })),
  {
    loading: () => <DefaultLoading />,
  }
)

/**
 * Analytics chart - Heavy with Recharts
 */
export const LazyAnalyticsChart = dynamic(
  () => import('@/components/analytics-chart').then(mod => ({ default: mod.AnalyticsChart })),
  {
    loading: () => <div className="h-64 bg-muted rounded-lg animate-pulse" />,
    ssr: false,
  }
)

/* ==========================================================================
   ADMIN COMPONENTS (lazy loaded)
   ========================================================================== */

/**
 * Admin analytics filters
 */
export const LazyAdminAnalyticsFilters = dynamic(
  () => import('@/components/admin-analytics-filters').then(mod => ({ default: mod.AdminAnalyticsFilters })),
  {
    loading: () => <FormLoading />,
  }
)

/**
 * Ambassador dashboard
 */
export const LazyAmbassadorDashboard = dynamic(
  () => import('@/components/ambassador-dashboard-client').then(mod => ({ default: mod.AmbassadorDashboardClient })),
  {
    loading: () => <DefaultLoading />,
  }
)

/* ==========================================================================
   PARTNER FORMS (lazy loaded)
   ========================================================================== */

export const LazyVenuePartnerForm = dynamic(
  () => import('@/components/partners/VenuePartnerForm'),
  {
    loading: () => <FormLoading />,
  }
)

export const LazyRetailPartnerForm = dynamic(
  () => import('@/components/partners/RetailPartnerForm'),
  {
    loading: () => <FormLoading />,
  }
)

export const LazyEducationPartnerForm = dynamic(
  () => import('@/components/partners/EducationPartnerForm'),
  {
    loading: () => <FormLoading />,
  }
)

export const LazyClubPartnerForm = dynamic(
  () => import('@/components/partners/ClubPartnerForm'),
  {
    loading: () => <FormLoading />,
  }
)

/* ==========================================================================
   MOTION COMPONENTS (lazy loaded - for pages that need animations)
   ========================================================================== */

export const LazyFadeIn = dynamic(
  () => import('@/components/ui/motion').then(mod => ({ default: mod.FadeIn })),
  { loading: () => null }
)

export const LazyFadeInUp = dynamic(
  () => import('@/components/ui/motion').then(mod => ({ default: mod.FadeInUp })),
  { loading: () => null }
)

export const LazyScaleIn = dynamic(
  () => import('@/components/ui/motion').then(mod => ({ default: mod.ScaleIn })),
  { loading: () => null }
)

/* ==========================================================================
   GAMIFICATION COMPONENTS (lazy loaded)
   ========================================================================== */

export const LazyAchievements = dynamic(
  () => import('@/components/gamification/achievements').then(mod => ({ default: mod.Achievements })),
  {
    loading: () => <DefaultLoading />,
  }
)

/* ==========================================================================
   THIRD-PARTY HEAVY LIBRARIES (lazy loaded)
   Merged from former lib/utils/lazy-components.tsx
   ========================================================================== */

const LoadingCard = () => (
  <div className="animate-pulse bg-zinc-800/50 rounded-xl p-6">
    <div className="h-4 bg-zinc-700 rounded w-3/4 mb-4" />
    <div className="h-4 bg-zinc-700 rounded w-1/2" />
  </div>
)

const SmallLoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
  </div>
)

/**
 * Lazy-loaded motion.div for animations.
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

/**
 * Lazy-loaded chart components from recharts.
 */
export const LazyLineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart),
  { ssr: false, loading: () => <LoadingCard /> }
)

export const LazyBarChart = dynamic(
  () => import('recharts').then((mod) => mod.BarChart),
  { ssr: false, loading: () => <LoadingCard /> }
)

export const LazyPieChart = dynamic(
  () => import('recharts').then((mod) => mod.PieChart),
  { ssr: false, loading: () => <LoadingCard /> }
)

export const LazyAreaChart = dynamic(
  () => import('recharts').then((mod) => mod.AreaChart),
  { ssr: false, loading: () => <LoadingCard /> }
)

/**
 * Lazy-loaded QR code generator.
 */
export const LazyQRCode = dynamic(
  () => import('qrcode.react').then((mod) => mod.QRCodeCanvas),
  {
    ssr: false,
    loading: () => <div className="w-32 h-32 bg-zinc-800 animate-pulse rounded" />,
  }
)

/**
 * Lazy-loaded confetti for celebrations.
 */
export const useConfetti = () => {
  return async (options?: any) => {
    const confetti = (await import('canvas-confetti')).default
    return confetti(options)
  }
}

/**
 * Lazy-loaded image gallery/lightbox.
 */
export const LazyImageGallery = dynamic(
  () => import('@/components/ui/image-gallery').catch(() => {
    return () => <div>Gallery not available</div>
  }),
  {
    ssr: false,
    loading: () => <SmallLoadingSpinner />,
  }
)

/**
 * Lazy-loaded PDF viewer for tickets.
 */
export const LazyPDFViewer = dynamic(
  () => import('@/components/pdf-viewer').catch(() => {
    return () => <div>PDF Viewer not available</div>
  }),
  {
    ssr: false,
    loading: () => <SmallLoadingSpinner />,
  }
)

/**
 * Lazy-loaded date picker with calendar.
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
