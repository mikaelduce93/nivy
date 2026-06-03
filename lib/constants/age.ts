/**
 * Single source of truth for the teen age window (#292).
 *
 * Before this constant the bounds diverged across the codebase: the teen
 * signup form + register-teen API accepted 11-17, the parent add-teen form +
 * parent create API accepted 10-18, while marketing announced "13-17 ans".
 * Minors-compliance (and UX) requires ONE window, enforced client + server.
 *
 * Canonical window: 13-17 inclusive (docs/refonte marketing + profile-type).
 */
export const TEEN_MIN_AGE = 13
export const TEEN_MAX_AGE = 17

/** Human-facing label, e.g. used in marketing copy ("J'ai 13-17 ans"). */
export const TEEN_AGE_RANGE_LABEL = `${TEEN_MIN_AGE}-${TEEN_MAX_AGE} ans`

/** Shared rejection message (client + server use the same wording). */
export const TEEN_AGE_ERROR = `Tu dois avoir entre ${TEEN_MIN_AGE} et ${TEEN_MAX_AGE} ans`

/** Whole-years age from a date of birth, relative to `now`. */
export function ageFromDateOfBirth(dateOfBirth: string | Date, now: Date = new Date()): number {
  const birth = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth)
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--
  }
  return age
}

/** True when `age` is within the canonical teen window (inclusive). */
export function isTeenAge(age: number): boolean {
  return age >= TEEN_MIN_AGE && age <= TEEN_MAX_AGE
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0]
}

/**
 * Min/max values for a date-of-birth `<input type="date">` so the picker is
 * itself bounded to the teen window — a DOB in [min, max] yields an age in
 * [TEEN_MIN_AGE, TEEN_MAX_AGE] inclusive.
 */
export function teenDateOfBirthBounds(now: Date = new Date()): { min: string; max: string } {
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  // Oldest allowed DOB: must still be <= TEEN_MAX_AGE today (born strictly
  // after now - (MAX + 1) years → the day after that boundary).
  const min = new Date(y - (TEEN_MAX_AGE + 1), m, d + 1)
  // Youngest allowed DOB: must already be >= TEEN_MIN_AGE today.
  const max = new Date(y - TEEN_MIN_AGE, m, d)
  return { min: toISODate(min), max: toISODate(max) }
}
