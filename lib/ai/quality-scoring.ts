/**
 * Quality Scoring (Phase 7 - Audit Quiz)
 *
 * Combine plusieurs signaux pour produire un score qualite global d'un quiz:
 * - Score pedagogique moyen (heuristiques sans LLM)
 * - Variete des types de questions
 * - Couverture du contexte marocain
 * - Coherence (absence de doublons)
 */

import {
  validatePedagogicalQuiz,
  type PedagogicalQuestion,
} from "./pedagogical-validator"
import {
  questionTypeVariety,
  type QuestionType,
} from "./question-type-generator"
import { moroccanCoverage } from "./moroccan-context"

export interface ScoreableQuiz {
  questions: Array<
    PedagogicalQuestion & {
      type?: string
    }
  >
}

export interface QuizQualityBreakdown {
  pedagogical: number // 0-100
  variety: number // 0-100
  moroccanCoverage: number // 0-100 (ratio * 100)
  coherence: number // 0-100 (penalise les doublons)
}

export interface QuizQualityResult {
  score: number // 0-100
  breakdown: QuizQualityBreakdown
  recommendations: string[]
}

const WEIGHTS = {
  pedagogical: 0.5,
  variety: 0.2,
  moroccan: 0.15,
  coherence: 0.15,
}

function computeCoherence(questions: Array<{ question?: string }>): {
  score: number
  duplicates: number
} {
  if (!questions.length) return { score: 100, duplicates: 0 }
  const seen = new Map<string, number>()
  let duplicates = 0
  for (const q of questions) {
    const key = (q.question || "").trim().toLowerCase()
    if (!key) continue
    const count = seen.get(key) || 0
    if (count >= 1) duplicates++
    seen.set(key, count + 1)
  }
  const ratio = duplicates / questions.length
  const score = Math.max(0, Math.round(100 * (1 - ratio * 2)))
  return { score, duplicates }
}

/**
 * Score un quiz sur plusieurs dimensions et propose des recommandations.
 */
export function scoreQuiz(quiz: ScoreableQuiz): QuizQualityResult {
  const recommendations: string[] = []
  const questions = quiz?.questions || []

  // 1) Pedagogical
  const ped = validatePedagogicalQuiz(questions)
  const pedScore = ped.averageScore
  if (pedScore < 70) {
    recommendations.push(
      `Score pedagogique faible (${pedScore}/100): revoir longueurs, distracteurs et reponses correctes.`,
    )
  }
  if (ped.invalidCount > 0) {
    recommendations.push(
      `${ped.invalidCount} question(s) invalide(s) sur ${questions.length}.`,
    )
  }

  // 2) Variety
  const types: QuestionType[] = questions.map(
    (q) => ((q.type as QuestionType) || "mcq") as QuestionType,
  )
  const varietyRatio = questionTypeVariety(types)
  const varietyScore = Math.round(varietyRatio * 100)
  if (varietyScore < 50) {
    recommendations.push(
      "Variete des types de questions insuffisante: ajouter true_false, fill_blank ou matching.",
    )
  }

  // 3) Moroccan coverage
  const cov = moroccanCoverage(
    questions.map((q) => ({ question: q.question })),
  )
  const coverageScore = Math.round(cov.ratio * 100)
  if (coverageScore < 30) {
    recommendations.push(
      "Couverture marocaine faible: integrer plus de references locales (villes, histoire, culture).",
    )
  }

  // 4) Coherence
  const coh = computeCoherence(questions)
  if (coh.duplicates > 0) {
    recommendations.push(`${coh.duplicates} doublon(s) detecte(s) entre questions.`)
  }

  const breakdown: QuizQualityBreakdown = {
    pedagogical: pedScore,
    variety: varietyScore,
    moroccanCoverage: coverageScore,
    coherence: coh.score,
  }

  const weighted =
    breakdown.pedagogical * WEIGHTS.pedagogical +
    breakdown.variety * WEIGHTS.variety +
    breakdown.moroccanCoverage * WEIGHTS.moroccan +
    breakdown.coherence * WEIGHTS.coherence

  return {
    score: Math.round(weighted),
    breakdown,
    recommendations,
  }
}
