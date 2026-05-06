/**
 * Pedagogical Validator (Phase 2.2 - Audit Quiz)
 *
 * Heuristiques sans LLM pour valider la qualite pedagogique d'une question
 * de quiz avant insertion en base. Retourne un score 0-100 et la liste des
 * problemes detectes pour permettre soit une regeneration soit un marquage.
 */

export interface PedagogicalQuestion {
  type?: string
  question: string
  options?: string[]
  correct?: number | boolean | number[]
  explanation?: string
}

export interface PedagogicalValidationResult {
  valid: boolean
  score: number
  issues: string[]
}

const MIN_QUESTION_LEN = 20
const MAX_QUESTION_LEN = 250
const MIN_OPTIONS = 3
const MAX_OPTIONS = 5
const MIN_DISTRACTOR_LEN = 5

// Mots / formules a eviter dans une question pedagogique de qualite
const FORBIDDEN_OPTION_PATTERNS: RegExp[] = [
  /toutes\s+(les\s+)?(reponses|propositions)\s+sont\s+(correctes|justes|vraies)/i,
  /aucune\s+(des\s+)?(reponses|propositions)/i,
  /tout\s+ce\s+qui\s+precede/i,
  /n['’]importe\s+laquelle/i,
]

// Jargon non explique a flagger (liste basique extensible)
const JARGON_BLACKLIST: string[] = [
  "tldr",
  "fyi",
  "asap",
  "lol",
  "wtf",
]

/**
 * Valide la qualite pedagogique d'une question.
 */
export function validatePedagogicalQuality(
  question: PedagogicalQuestion,
): PedagogicalValidationResult {
  const issues: string[] = []
  let score = 100

  // 1) Question presente
  if (!question || typeof question.question !== "string" || !question.question.trim()) {
    return { valid: false, score: 0, issues: ["Question manquante"] }
  }

  const qText = question.question.trim()
  const qLen = qText.length

  // 2) Longueur question
  if (qLen < MIN_QUESTION_LEN) {
    issues.push(`Question trop courte (${qLen} < ${MIN_QUESTION_LEN})`)
    score -= 25
  } else if (qLen > MAX_QUESTION_LEN) {
    issues.push(`Question trop longue (${qLen} > ${MAX_QUESTION_LEN})`)
    score -= 15
  }

  // 3) Type
  const type = question.type || "mcq"

  // 4) Options et reponses correctes (specifique aux QCM)
  if (type === "mcq" || type === "multiple_choice" || !question.type) {
    const options = Array.isArray(question.options) ? question.options : []

    if (options.length < MIN_OPTIONS) {
      issues.push(`Pas assez d'options (${options.length} < ${MIN_OPTIONS})`)
      score -= 30
    } else if (options.length > MAX_OPTIONS) {
      issues.push(`Trop d'options (${options.length} > ${MAX_OPTIONS})`)
      score -= 20
    }

    // Distracteurs trop courts
    const tooShort = options.filter(
      (opt) => typeof opt === "string" && opt.trim().length < MIN_DISTRACTOR_LEN,
    )
    if (tooShort.length > 0) {
      issues.push(`${tooShort.length} option(s) trop courte(s) (< ${MIN_DISTRACTOR_LEN} car.)`)
      score -= 15
    }

    // Doublons
    const seen = new Set<string>()
    let dupCount = 0
    for (const opt of options) {
      if (typeof opt !== "string") continue
      const norm = opt.trim().toLowerCase()
      if (norm && seen.has(norm)) dupCount++
      seen.add(norm)
    }
    if (dupCount > 0) {
      issues.push(`${dupCount} option(s) dupliquee(s)`)
      score -= 15
    }

    // Pattern interdits ("toutes les reponses", "aucune des reponses")
    for (const opt of options) {
      if (typeof opt !== "string") continue
      for (const pattern of FORBIDDEN_OPTION_PATTERNS) {
        if (pattern.test(opt)) {
          issues.push(`Option proscrite detectee: "${opt}"`)
          score -= 20
          break
        }
      }
    }

    // Une seule reponse correcte (pour mcq classique)
    if (Array.isArray(question.correct)) {
      if (question.correct.length !== 1) {
        issues.push("Plus d'une reponse correcte pour un QCM standard")
        score -= 25
      }
    } else if (typeof question.correct === "number") {
      if (
        question.correct < 0 ||
        (options.length > 0 && question.correct >= options.length)
      ) {
        issues.push("Index de reponse correcte hors bornes")
        score -= 30
      }
    } else if (question.correct === undefined || question.correct === null) {
      issues.push("Reponse correcte manquante")
      score -= 30
    }
  } else if (type === "true_false") {
    if (typeof question.correct !== "boolean") {
      issues.push("Reponse true/false attendue")
      score -= 25
    }
  }

  // 5) Niveau de langage / jargon
  const lower = qText.toLowerCase()
  for (const jargon of JARGON_BLACKLIST) {
    if (new RegExp(`\\b${jargon}\\b`, "i").test(lower)) {
      issues.push(`Jargon non explique: "${jargon}"`)
      score -= 10
      break
    }
  }

  // 6) Cri (tout en majuscules)
  if (qText === qText.toUpperCase() && qLen > 20 && /[A-Z]/.test(qText)) {
    issues.push("Question entierement en majuscules")
    score -= 10
  }

  const finalScore = Math.max(0, Math.min(100, score))
  // valid si score >= 70 ET pas d'issue critique majeure
  const valid = finalScore >= 70 && issues.length === 0

  return {
    valid,
    score: Math.round(finalScore),
    issues,
  }
}

/**
 * Helper pour valider un quiz complet.
 */
export function validatePedagogicalQuiz(questions: PedagogicalQuestion[]): {
  averageScore: number
  perQuestion: PedagogicalValidationResult[]
  invalidCount: number
} {
  const perQuestion = questions.map((q) => validatePedagogicalQuality(q))
  const sum = perQuestion.reduce((acc, r) => acc + r.score, 0)
  const averageScore = perQuestion.length
    ? Math.round(sum / perQuestion.length)
    : 0
  const invalidCount = perQuestion.filter((r) => !r.valid).length
  return { averageScore, perQuestion, invalidCount }
}
