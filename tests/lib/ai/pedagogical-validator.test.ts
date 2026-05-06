import { describe, expect, it } from "vitest"

import {
  validatePedagogicalQuality,
  validatePedagogicalQuiz,
} from "../../../lib/ai/pedagogical-validator"

describe("validatePedagogicalQuality", () => {
  it("accepts a well-formed MCQ as valid", () => {
    const result = validatePedagogicalQuality({
      type: "mcq",
      question: "Quelle est la capitale administrative du Maroc ?",
      options: ["Rabat", "Casablanca", "Marrakech", "Tanger"],
      correct: 0,
      explanation: "Rabat est la capitale administrative depuis 1912.",
    })
    expect(result.valid).toBe(true)
    expect(result.score).toBeGreaterThanOrEqual(70)
    expect(result.issues).toHaveLength(0)
  })

  it("flags a question that is too short", () => {
    const result = validatePedagogicalQuality({
      type: "mcq",
      question: "Maroc?",
      options: ["Rabat", "Casablanca", "Marrakech", "Fes"],
      correct: 0,
    })
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.toLowerCase().includes("courte"))).toBe(true)
  })

  it("flags too many options (>5)", () => {
    const result = validatePedagogicalQuality({
      type: "mcq",
      question: "Quelle est la plus grande ville du Maroc en population ?",
      options: ["Rabat", "Casablanca", "Marrakech", "Fes", "Tanger", "Agadir"],
      correct: 1,
      explanation: "Casablanca est la plus peuplee.",
    })
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.toLowerCase().includes("trop"))).toBe(true)
  })

  it("flags forbidden 'toutes les reponses sont correctes'", () => {
    const result = validatePedagogicalQuality({
      type: "mcq",
      question: "Quels plats sont d'origine marocaine et tres populaires ?",
      options: [
        "Tagine",
        "Couscous",
        "Pastilla",
        "Toutes les reponses sont correctes",
      ],
      correct: 3,
      explanation: "Tous ces plats sont marocains.",
    })
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.toLowerCase().includes("proscrite"))).toBe(true)
  })

  it("flags out-of-range correct index", () => {
    const result = validatePedagogicalQuality({
      type: "mcq",
      question: "Combien y a-t-il de regions administratives au Maroc ?",
      options: ["10", "11", "12", "13"],
      correct: 9,
      explanation: "Il y a 12 regions depuis 2015.",
    })
    expect(result.valid).toBe(false)
    expect(
      result.issues.some((i) => i.toLowerCase().includes("hors bornes")),
    ).toBe(true)
  })
})

describe("validatePedagogicalQuiz", () => {
  it("aggregates per-question results", () => {
    const result = validatePedagogicalQuiz([
      {
        type: "mcq",
        question: "Quelle est la capitale administrative du Maroc ?",
        options: ["Rabat", "Casablanca", "Marrakech", "Fes"],
        correct: 0,
        explanation: "Rabat est la capitale.",
      },
      {
        type: "mcq",
        question: "Trop?",
        options: ["a", "b"],
        correct: 0,
      },
    ])
    expect(result.perQuestion).toHaveLength(2)
    expect(result.invalidCount).toBeGreaterThanOrEqual(1)
    expect(result.averageScore).toBeGreaterThan(0)
    expect(result.averageScore).toBeLessThanOrEqual(100)
  })
})
