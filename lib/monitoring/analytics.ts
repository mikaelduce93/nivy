/**
 * TEENS PARTY MOROCCO - Analytics Integration
 * ============================================
 *
 * Intégration Vercel Analytics et events tracking:
 * - Web Vitals automatiques
 * - Custom events
 * - Conversion tracking
 */

/* ==========================================================================
   TYPES
   ========================================================================== */

export type AnalyticsEvent =
  | 'page_view'
  | 'sign_up'
  | 'login'
  | 'booking_started'
  | 'booking_completed'
  | 'payment_initiated'
  | 'payment_completed'
  | 'payment_failed'
  | 'teen_added'
  | 'pass_subscribed'
  | 'challenge_completed'
  | 'achievement_unlocked'
  | 'search'
  | 'filter_applied'
  | 'share'
  | 'contact_form_submitted'
  | 'newsletter_subscribed'

export interface AnalyticsEventData {
  [key: string]: string | number | boolean | undefined
}

/* ==========================================================================
   VERCEL ANALYTICS
   ========================================================================== */

/**
 * Track a custom event with Vercel Analytics
 */
export function trackEvent(
  event: AnalyticsEvent | string,
  data?: AnalyticsEventData
) {
  // Vercel Analytics is automatically integrated via @vercel/analytics
  // This function provides a typed wrapper

  if (typeof window !== 'undefined' && (window as any).va) {
    (window as any).va('event', {
      name: event,
      data,
    })
  }

  // Also log for debugging
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[Analytics] Event: ${event}`, data)
  }
}

/* ==========================================================================
   CONVERSION TRACKING
   ========================================================================== */

/**
 * Track a sign up conversion
 */
export function trackSignUp(method: 'email' | 'google' | 'apple') {
  trackEvent('sign_up', {
    method,
  })
}

/**
 * Track a login
 */
export function trackLogin(method: 'email' | 'google' | 'apple') {
  trackEvent('login', {
    method,
  })
}

/**
 * Track booking started
 */
export function trackBookingStarted(
  eventId: string,
  eventType: 'event' | 'club' | 'anniv'
) {
  trackEvent('booking_started', {
    event_id: eventId,
    event_type: eventType,
  })
}

/**
 * Track booking completed
 */
export function trackBookingCompleted(
  bookingId: string,
  eventType: 'event' | 'club' | 'anniv',
  amount: number,
  paymentMethod: string
) {
  trackEvent('booking_completed', {
    booking_id: bookingId,
    event_type: eventType,
    amount,
    payment_method: paymentMethod,
  })
}

/**
 * Track payment initiated
 */
export function trackPaymentInitiated(
  provider: 'stripe' | 'cmi' | 'mobile_money' | 'xp',
  amount: number
) {
  trackEvent('payment_initiated', {
    provider,
    amount,
  })
}

/**
 * Track payment completed
 */
export function trackPaymentCompleted(
  provider: 'stripe' | 'cmi' | 'mobile_money' | 'xp',
  amount: number
) {
  trackEvent('payment_completed', {
    provider,
    amount,
  })
}

/**
 * Track payment failed
 */
export function trackPaymentFailed(
  provider: 'stripe' | 'cmi' | 'mobile_money' | 'xp',
  error: string
) {
  trackEvent('payment_failed', {
    provider,
    error,
  })
}

/**
 * Track teen profile added
 */
export function trackTeenAdded() {
  trackEvent('teen_added')
}

/**
 * Track VIP pass subscription
 */
export function trackPassSubscribed(tier: 'standard' | 'gold' | 'platinum') {
  trackEvent('pass_subscribed', {
    tier,
  })
}

/**
 * Track challenge completed
 */
export function trackChallengeCompleted(
  category: 'school' | 'sport' | 'crea',
  xpEarned: number
) {
  trackEvent('challenge_completed', {
    category,
    xp_earned: xpEarned,
  })
}

/**
 * Track achievement unlocked
 */
export function trackAchievementUnlocked(
  achievementId: string,
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
) {
  trackEvent('achievement_unlocked', {
    achievement_id: achievementId,
    rarity,
  })
}

/**
 * Track search
 */
export function trackSearch(query: string, resultsCount: number) {
  trackEvent('search', {
    query,
    results_count: resultsCount,
  })
}

/**
 * Track filter applied
 */
export function trackFilterApplied(filterType: string, filterValue: string) {
  trackEvent('filter_applied', {
    filter_type: filterType,
    filter_value: filterValue,
  })
}

/**
 * Track social share
 */
export function trackShare(
  contentType: 'event' | 'profile' | 'achievement',
  platform: 'whatsapp' | 'facebook' | 'twitter' | 'copy_link'
) {
  trackEvent('share', {
    content_type: contentType,
    platform,
  })
}

/**
 * Track contact form submission
 */
export function trackContactFormSubmitted(subject: string) {
  trackEvent('contact_form_submitted', {
    subject,
  })
}

/**
 * Track newsletter subscription
 */
export function trackNewsletterSubscribed() {
  trackEvent('newsletter_subscribed')
}

/* ==========================================================================
   WEB VITALS
   ========================================================================== */

export interface WebVitalsMetric {
  id: string
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
}

/**
 * Report Web Vitals to analytics
 * This is called automatically by Next.js
 */
export function reportWebVitals(metric: WebVitalsMetric) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[Web Vitals] ${metric.name}: ${metric.value} (${metric.rating})`)
  }

  // Vercel Analytics automatically captures Web Vitals
  // This function can be used for additional processing

  // Track poor metrics as events for alerting
  if (metric.rating === 'poor') {
    trackEvent(`webvital_poor_${metric.name.toLowerCase()}`, {
      value: metric.value,
      id: metric.id,
    })
  }
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export default {
  trackEvent,
  trackSignUp,
  trackLogin,
  trackBookingStarted,
  trackBookingCompleted,
  trackPaymentInitiated,
  trackPaymentCompleted,
  trackPaymentFailed,
  trackTeenAdded,
  trackPassSubscribed,
  trackChallengeCompleted,
  trackAchievementUnlocked,
  trackSearch,
  trackFilterApplied,
  trackShare,
  trackContactFormSubmitted,
  trackNewsletterSubscribed,
  reportWebVitals,
}
