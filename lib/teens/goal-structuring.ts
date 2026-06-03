/**
 * V11 #304 — structure free-text teen goals into {goal_tag, target_date} and
 * dedupe equivalent entries, so they can drive the mission engine
 * (affinity_scores → assign_missions_for_teen).
 *
 * Pure functions, no server-only imports — unit-testable.
 */

/** Lowercase + strip diacritics for robust matching. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
}

/** Dedupe goals by normalized text (keeps first occurrence, preserves order). */
export function dedupeGoals(goals: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const g of goals) {
    const key = normalizeText(g).replace(/\s+/g, " ")
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(g)
  }
  return out
}

export interface TaxonomyRow {
  tag: string
  category: string | null
  display_fr: string | null
}

/**
 * Derive a single interest_taxonomy tag from a free-text goal by keyword
 * overlap (tag tokens + display_fr words + category). Returns the best match or
 * null. `preferredTags` (e.g. mission-template tags) breaks ties so the goal
 * biases missions that actually exist.
 */
export function deriveGoalTag(
  goalText: string,
  taxonomy: TaxonomyRow[],
  preferredTags: ReadonlySet<string> = new Set(),
): string | null {
  const text = normalizeText(goalText)
  const textTokens = new Set(text.split(/[^a-z0-9]+/).filter((t) => t.length >= 3))
  if (textTokens.size === 0) return null

  let best: { tag: string; hits: number; preferred: boolean } | null = null
  for (const row of taxonomy) {
    const keywords = new Set<string>()
    for (const part of row.tag.split(/[_-]/)) if (part.length >= 3) keywords.add(normalizeText(part))
    if (row.display_fr) {
      for (const w of normalizeText(row.display_fr).split(/[^a-z0-9]+/)) if (w.length >= 3) keywords.add(w)
    }
    if (row.category) {
      const c = normalizeText(row.category)
      if (c.length >= 3) keywords.add(c)
    }

    let hits = 0
    for (const kw of keywords) {
      if (textTokens.has(kw)) {
        hits++
        continue
      }
      // Prefix-tolerant match (maths↔math, dessins↔dessin) when both ≥4 chars.
      for (const tt of textTokens) {
        if (tt.length >= 4 && kw.length >= 4 && (tt.startsWith(kw) || kw.startsWith(tt))) {
          hits++
          break
        }
      }
    }
    if (hits === 0) continue

    const preferred = preferredTags.has(row.tag)
    if (
      !best ||
      hits > best.hits ||
      (hits === best.hits && preferred && !best.preferred)
    ) {
      best = { tag: row.tag, hits, preferred }
    }
  }
  return best?.tag ?? null
}

/**
 * Coarse deadline extraction from explicit French time cues. Conservative:
 * returns null when there is no clear cue (no fabricated dates). ISO date.
 */
export function deriveGoalDeadline(goalText: string, now: Date = new Date()): string | null {
  const t = normalizeText(goalText)
  const addDays = (d: number) => {
    const dt = new Date(now)
    dt.setDate(dt.getDate() + d)
    return dt.toISOString().split("T")[0]
  }
  if (/\b(aujourd hui|aujourdhui|ce soir|maintenant)\b/.test(t)) return addDays(0)
  if (/\bdemain\b/.test(t)) return addDays(1)
  if (/\b(cette semaine|7 jours|sept jours)\b/.test(t)) return addDays(7)
  if (/\b(ce mois|30 jours|le mois prochain)\b/.test(t)) return addDays(30)
  if (/\b(cet ete|vacances)\b/.test(t)) return addDays(90)
  if (/\b(cette annee|cette annee|un an|l annee|annee scolaire)\b/.test(t)) return addDays(365)
  const yearMatch = t.match(/\b(20[2-9]\d)\b/)
  if (yearMatch) {
    const y = Number(yearMatch[1])
    if (y >= now.getFullYear() && y <= now.getFullYear() + 5) return `${y}-12-31`
  }
  return null
}
