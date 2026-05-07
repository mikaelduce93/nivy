/**
 * Computes the first `next_disbursement_at` for a freshly created allowance.
 *
 * Uses the cadence semantics defined in docs/vision/allowance-savings.md §SPEC.
 * Mirrors the SQL helper `_advance_next_disbursement` once an allowance is
 * already running. For the *initial* slot we want "soonest future moment that
 * matches the cadence config" — e.g. weekly day_of_week=5 (Friday) at 09:00.
 */

export interface CadenceConfig {
  // Weekly / biweekly: 0..6 Sunday..Saturday (default 5 = Friday).
  day_of_week?: number
  // Monthly: 1..28 (default 1).
  day_of_month?: number
  // 24-hour clock (default 9).
  hour?: number
  minute?: number
  // For custom_dates: ISO strings.
  dates?: string[]
}

export type Cadence = "weekly" | "biweekly" | "monthly" | "custom_dates"

export function computeFirstDisbursement(
  cadence: Cadence,
  config: CadenceConfig,
  now: Date = new Date()
): Date {
  const hour = config.hour ?? 9
  const minute = config.minute ?? 0

  if (cadence === "weekly" || cadence === "biweekly") {
    const targetDow = config.day_of_week ?? 5 // Friday default.
    const candidate = new Date(now)
    candidate.setHours(hour, minute, 0, 0)
    const currentDow = candidate.getDay()
    let delta = (targetDow - currentDow + 7) % 7
    if (delta === 0 && candidate.getTime() <= now.getTime()) {
      delta = 7
    }
    candidate.setDate(candidate.getDate() + delta)
    return candidate
  }

  if (cadence === "monthly") {
    const targetDom = config.day_of_month ?? 1
    const candidate = new Date(now)
    candidate.setHours(hour, minute, 0, 0)
    candidate.setDate(targetDom)
    if (candidate.getTime() <= now.getTime()) {
      candidate.setMonth(candidate.getMonth() + 1)
      candidate.setDate(targetDom)
    }
    return candidate
  }

  if (cadence === "custom_dates") {
    const dates = (config.dates ?? [])
      .map((d) => new Date(d))
      .filter((d) => !Number.isNaN(d.getTime()))
      .filter((d) => d.getTime() > now.getTime())
      .sort((a, b) => a.getTime() - b.getTime())
    if (dates.length > 0) return dates[0]
    // Fallback if no future dates configured.
    const fallback = new Date(now)
    fallback.setDate(fallback.getDate() + 30)
    fallback.setHours(hour, minute, 0, 0)
    return fallback
  }

  // Should be unreachable thanks to the type, but keep a sane default.
  const fallback = new Date(now)
  fallback.setDate(fallback.getDate() + 7)
  fallback.setHours(hour, minute, 0, 0)
  return fallback
}
