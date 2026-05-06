/**
 * SNAPCHAT-LEVEL SCORECARD
 * ========================
 *
 * Mesure les KPIs critiques pour atteindre le 10/10.
 * Targets: D1 > 45%, Social > 40%, Sessions > 2/day
 */

export interface ScorecardMetrics {
  retention: {
    d1: number
    d7: number
    d30: number
  }
  engagement: {
    dau: number
    mau: number
    stickyFactor: number // DAU/MAU
    avgSessionsPerDay: number
    avgSessionDuration: number
  }
  gamification: {
    questsCompletedPerWeek: number
    socialActionRate: number // % of users doing social actions
    educationalContentRate: number
  }
  monetization: {
    conversionRate: number
  }
  /** Set when the metrics could not be computed; consumer should display an "unavailable" state. */
  status?: 'ok' | 'unavailable'
  error?: string
}

/**
 * Fetch live scorecard from API (client-safe).
 * On error returns `null` (consumer should display an unavailable state)
 * rather than fabricated data.
 */
export async function getLiveScorecard(): Promise<ScorecardMetrics | null> {
  try {
    const res = await fetch('/api/admin/scorecard', {
      cache: 'no-store',
    })

    if (!res.ok) {
      console.error('Scorecard fetch failed:', res.status)
      return null
    }

    const json = (await res.json()) as ScorecardMetrics
    if (!json || !json.retention) {
      return null
    }
    return json
  } catch (error) {
    console.error('Scorecard fetch error:', error)
    return null
  }
}
