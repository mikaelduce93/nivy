/**
 * Quiz schemas & shared types
 * ===========================
 * Zod schemas for quiz API request validation + the shared TS types used by
 * server pages, API routes and client components.
 */

import { z } from "zod"

/** A single question as embedded in `educational_quizzes.questions` (JSONB). */
export interface QuizQuestion {
  question: string
  options: string[]
  correct: number
  explanation?: string
  type?: "mcq" | "true_false" | "multiple_choice"
}

/** Row-shape for a fully-loaded quiz (from `educational_quizzes`). */
export interface Quiz {
  id: string
  code: string
  title: string
  description: string | null
  subject: string
  difficulty: string | null
  grade_level: string | null
  questions: QuizQuestion[]
  time_limit_minutes: number | null
  passing_score: number | null
  xp_reward: number | null
  icon: string | null
}

/** Lightweight summary used in lists (no questions payload). */
export interface QuizSummary {
  id: string
  code: string
  title: string
  description: string | null
  subject: string
  difficulty: string | null
  grade_level: string | null
  questions_count: number
  time_limit_minutes: number | null
  passing_score: number | null
  xp_reward: number | null
  icon: string | null
}

export interface QuizCategorySummary {
  id: string // subject slug
  total: number
  completed: number
}

export interface QuizAttemptRow {
  id: string
  teen_id: string
  quiz_id: string
  score: number
  correct_count: number | null
  total_questions: number | null
  passed: boolean | null
  xp_earned: number | null
  time_spent_seconds: number | null
  completed_at: string | null
  created_at: string | null
}

/* ==========================================================================
   Zod schemas
   ========================================================================== */

export const submitQuizSchema = z.object({
  quizId: z.string().uuid("quizId doit être un UUID valide"),
  answers: z
    .array(z.number().int().min(0).max(20))
    .min(1, "Au moins une réponse requise")
    .max(50, "Trop de réponses"),
  timeSpentSeconds: z.number().int().min(0).max(60 * 60).optional(),
})
export type SubmitQuizInput = z.infer<typeof submitQuizSchema>

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const categoryQuerySchema = z.object({
  subject: z.string().min(1).max(40).optional(),
})
