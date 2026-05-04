'use client'

/**
 * TEENS PARTY MOROCCO - Lazy Loaded Client Components
 * ===================================================
 *
 * Composants client chargés dynamiquement pour réduire le bundle initial.
 * Utilisez ces exports au lieu d'importer directement les composants lourds.
 */

import dynamic from 'next/dynamic'
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
