/**
 * Jour « produit » — Africa/Casablanca (SPEC-G4 §6.2-3, red-team #18)
 * ===================================================================
 *
 * Les plafonds quotidiens des mini-jeux sont définis sur le jour LOCAL
 * marocain, pas UTC (sinon reset à 01:00 heure locale). L'autorité reste la
 * RPC serveur ; ce helper ne sert qu'à AFFICHER les compteurs du jour
 * (sessions créditées) avec la même définition du jour que la DB.
 */

const CASABLANCA_TZ = "Africa/Casablanca"

/** Offset (ms) entre l'heure locale de `tz` et UTC à l'instant `date`. */
function tzOffsetMs(tz: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  const parts: Record<string, string> = {}
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  )
  return asUtc - date.getTime()
}

/**
 * Instant UTC du minuit courant à Casablanca (début du « jour » des plafonds).
 * Double passe pour absorber un éventuel changement d'offset (Ramadan / DST).
 */
export function casablancaDayStartUtc(now: Date = new Date()): Date {
  let offset = tzOffsetMs(CASABLANCA_TZ, now)
  const local = new Date(now.getTime() + offset)
  const midnightAsUtc = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    0,
    0,
    0,
  )
  let dayStart = new Date(midnightAsUtc - offset)
  // Re-calcule l'offset AU moment du minuit estimé (bord de changement d'heure).
  offset = tzOffsetMs(CASABLANCA_TZ, dayStart)
  dayStart = new Date(midnightAsUtc - offset)
  return dayStart
}
