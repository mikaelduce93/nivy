import { describe, expect, it } from "vitest"

import {
  enrichWithMoroccanContext,
  moroccanCoverage,
} from "../../../lib/ai/moroccan-context"

describe("enrichWithMoroccanContext", () => {
  it("detects city names like 'Casablanca'", () => {
    const result = enrichWithMoroccanContext(
      "Quelle est la population de Casablanca ?",
    )
    expect(result.detectedEntities.length).toBeGreaterThan(0)
    expect(
      result.detectedEntities.some((e) => e.entity === "Casablanca"),
    ).toBe(true)
    expect(result.suggestion).toBeDefined()
  })

  it("detects geographic features like 'Atlas'", () => {
    const result = enrichWithMoroccanContext(
      "Quel est le plus haut sommet de l'Atlas ?",
    )
    expect(result.detectedEntities.some((e) => e.entity === "Atlas")).toBe(true)
  })

  it("detects historical entities like a dynasty", () => {
    const result = enrichWithMoroccanContext(
      "La dynastie Alaouite regne depuis quand ?",
    )
    expect(
      result.detectedEntities.some((e) => e.entity === "Alaouite"),
    ).toBe(true)
  })

  it("detects iconic dishes like 'Tagine'", () => {
    const result = enrichWithMoroccanContext(
      "Comment prepare-t-on un Tagine traditionnel ?",
    )
    expect(result.detectedEntities.some((e) => e.entity === "Tagine")).toBe(true)
  })

  it("returns empty when no Moroccan entity is mentioned", () => {
    const result = enrichWithMoroccanContext(
      "Combien font deux plus deux ?",
    )
    expect(result.detectedEntities).toHaveLength(0)
    expect(result.suggestion).toBeUndefined()
  })

  it("handles invalid input gracefully", () => {
    const result = enrichWithMoroccanContext("")
    expect(result.detectedEntities).toHaveLength(0)
  })
})

describe("moroccanCoverage", () => {
  it("computes coverage ratio across questions", () => {
    const cov = moroccanCoverage([
      { question: "Quelle est la capitale du Maroc ? Indice: Rabat" },
      { question: "Combien font 2 + 2 ?" },
      { question: "Le Toubkal est dans quelle chaine de montagnes ?" },
    ])
    expect(cov.total).toBe(3)
    expect(cov.covered).toBeGreaterThanOrEqual(2)
    expect(cov.ratio).toBeGreaterThan(0)
    expect(cov.ratio).toBeLessThanOrEqual(1)
  })

  it("returns zero for empty input", () => {
    const cov = moroccanCoverage([])
    expect(cov.total).toBe(0)
    expect(cov.ratio).toBe(0)
  })
})
