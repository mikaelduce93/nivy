/**
 * Question Type Generator (Phase 4.1 - Audit Quiz)
 *
 * Permet de varier les types de questions generees pour eviter le 100% QCM.
 * Selectionne un type pondere et adapte la structure d'une question existante
 * au type cible.
 */

export type QuestionType =
  | "mcq"
  | "true_false"
  | "fill_blank"
  | "image"
  | "audio"
  | "matching"

export interface SelectQuestionTypeOptions {
  weights?: Partial<Record<QuestionType, number>>
  rng?: () => number
}

const DEFAULT_WEIGHTS: Record<QuestionType, number> = {
  mcq: 0.55,
  true_false: 0.2,
  fill_blank: 0.1,
  matching: 0.08,
  image: 0.05,
  audio: 0.02,
}

/**
 * Selectionne un type aleatoire pondere selon les options.
 */
export function selectQuestionType(
  options: SelectQuestionTypeOptions = {},
): QuestionType {
  const weights: Record<QuestionType, number> = {
    ...DEFAULT_WEIGHTS,
    ...(options.weights || {}),
  } as Record<QuestionType, number>

  const total = Object.values(weights).reduce((s, w) => s + (w > 0 ? w : 0), 0)
  if (total <= 0) return "mcq"

  const rand = (options.rng ?? Math.random)() * total
  let cumulative = 0
  for (const key of Object.keys(weights) as QuestionType[]) {
    const w = weights[key] || 0
    if (w <= 0) continue
    cumulative += w
    if (rand <= cumulative) return key
  }
  return "mcq"
}

export interface RawQuestion {
  question: string
  options?: string[]
  correct?: number | boolean | number[] | string
  explanation?: string
  media?: { url?: string; alt?: string }
  pairs?: Array<{ left: string; right: string }>
  blank_answer?: string
}

export interface FormattedQuestion {
  type: QuestionType
  question: string
  options?: string[]
  correct?: number | boolean | number[] | string
  explanation?: string
  media?: { url?: string; alt?: string }
  pairs?: Array<{ left: string; right: string }>
  blank_answer?: string
}

/**
 * Adapte une question existante a un type cible.
 * Renvoie toujours un objet typable, meme si certains champs sont vides
 * (le pipeline en aval doit pouvoir le filtrer/log).
 */
export function formatQuestionForType(
  question: RawQuestion,
  type: QuestionType,
): FormattedQuestion {
  const baseQuestion = (question.question || "").trim()

  switch (type) {
    case "true_false": {
      // Reduction a 2 options (Vrai / Faux)
      let correct: boolean
      if (typeof question.correct === "boolean") {
        correct = question.correct
      } else if (typeof question.correct === "number" && Array.isArray(question.options)) {
        // Heuristique: si la 1ere option contient "vrai" ou "true", correct = (index == celle-la)
        const trueIdx = question.options.findIndex((o) =>
          /^(vrai|true|oui|yes)$/i.test(o.trim()),
        )
        correct = trueIdx >= 0 ? question.correct === trueIdx : question.correct === 0
      } else {
        correct = false
      }
      return {
        type,
        question: baseQuestion,
        options: ["Vrai", "Faux"],
        correct,
        explanation: question.explanation,
      }
    }

    case "fill_blank": {
      // On garde la question et la "correct answer" sous forme de texte libre
      let answer: string | undefined
      if (typeof question.correct === "string") {
        answer = question.correct
      } else if (
        typeof question.correct === "number" &&
        Array.isArray(question.options)
      ) {
        answer = question.options[question.correct]
      } else if (question.blank_answer) {
        answer = question.blank_answer
      }
      return {
        type,
        question: baseQuestion,
        blank_answer: answer,
        explanation: question.explanation,
      }
    }

    case "matching": {
      const pairs = Array.isArray(question.pairs)
        ? question.pairs
        : Array.isArray(question.options) && question.options.length >= 2
          ? // Conversion naive: pair (option_i, option_{i+1})
            question.options
              .reduce<Array<{ left: string; right: string }>>((acc, opt, i) => {
                if (i % 2 === 0 && question.options![i + 1] !== undefined) {
                  acc.push({ left: opt, right: question.options![i + 1] })
                }
                return acc
              }, [])
          : []
      return {
        type,
        question: baseQuestion,
        pairs,
        explanation: question.explanation,
      }
    }

    case "image":
    case "audio": {
      return {
        type,
        question: baseQuestion,
        options: question.options,
        correct: question.correct,
        media: question.media,
        explanation: question.explanation,
      }
    }

    case "mcq":
    default: {
      return {
        type: "mcq",
        question: baseQuestion,
        options: question.options || [],
        correct: typeof question.correct === "number" ? question.correct : 0,
        explanation: question.explanation,
      }
    }
  }
}

/**
 * Helper: variete d'un set de questions (0-1).
 * Utile pour le scoring qualite.
 */
export function questionTypeVariety(types: QuestionType[]): number {
  if (types.length === 0) return 0
  const unique = new Set(types).size
  // 6 types possibles -> on plafonne plus tot pour ne pas exiger 6 types
  return Math.min(1, unique / Math.min(types.length, 4))
}
