/**
 * V11 #304 — teen goal structuring (tag/deadline) + dedup.
 */
import { describe, expect, it } from "vitest"
import {
  dedupeGoals,
  deriveGoalDeadline,
  deriveGoalTag,
  normalizeText,
  type TaxonomyRow,
} from "@/lib/teens/goal-structuring"

const TAXONOMY: TaxonomyRow[] = [
  { tag: "sport_running", category: "sport", display_fr: "Course à pied" },
  { tag: "tech_gaming", category: "tech", display_fr: "Jeux vidéo" },
  { tag: "art_drawing", category: "art", display_fr: "Dessin" },
  { tag: "academic_math", category: "academic", display_fr: "Mathématiques" },
]

describe("dedupeGoals", () => {
  it("removes case/accent/space-equivalent duplicates, keeps order", () => {
    const out = dedupeGoals(["Faire du Sport", "faire  du sport", "Dessiner"])
    expect(out).toEqual(["Faire du Sport", "Dessiner"])
  })
})

describe("deriveGoalTag", () => {
  it("matches a tag by keyword overlap", () => {
    expect(deriveGoalTag("Je veux progresser en dessin", TAXONOMY)).toBe("art_drawing")
    expect(deriveGoalTag("M'améliorer en maths cette année", TAXONOMY)).toBe("academic_math")
  })
  it("returns null when nothing matches", () => {
    expect(deriveGoalTag("blablabla xyz", TAXONOMY)).toBeNull()
  })
  it("prefers a mission-template tag on ties", () => {
    const tax: TaxonomyRow[] = [
      { tag: "music_pop", category: "music", display_fr: "Musique" },
      { tag: "music_traditional", category: "music", display_fr: "Musique" },
    ]
    const out = deriveGoalTag("faire de la musique", tax, new Set(["music_traditional"]))
    expect(out).toBe("music_traditional")
  })
})

describe("deriveGoalDeadline", () => {
  const now = new Date("2026-06-04T00:00:00Z")
  it("extracts explicit cues", () => {
    expect(deriveGoalDeadline("réviser cette semaine", now)).toBe("2026-06-11")
    expect(deriveGoalDeadline("objectif 2027", now)).toBe("2027-12-31")
  })
  it("returns null without a cue", () => {
    expect(deriveGoalDeadline("devenir meilleur en sport", now)).toBeNull()
  })
})

describe("normalizeText", () => {
  it("lowercases and strips accents", () => {
    expect(normalizeText("Été À Côté")).toBe("ete a cote")
  })
})
