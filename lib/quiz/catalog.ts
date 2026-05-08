/**
 * Quiz Catalog
 * ============
 * Display metadata for quiz subjects/categories. The source of truth for the
 * actual catalog of quizzes lives in the `educational_quizzes` table — this
 * file is a typed enrichment layer mapping `subject` (DB column) to the
 * icon/colour used in the UI. Keeping it client-safe (no server imports) so
 * client components can render category cards without a DB round-trip.
 *
 * Per quiz-end-to-end-builder agent definition: questions are NEVER generated
 * client-side. They live in `educational_quizzes.questions` (JSONB array).
 */

import {
  Calculator,
  BookOpen,
  Languages,
  Beaker,
  History,
  Globe,
  Music,
  Star,
  Brain,
  type LucideIcon,
} from "lucide-react"

export interface QuizCategoryMeta {
  /** Matches `educational_quizzes.subject` */
  id: string
  /** Display name in UI */
  name: string
  icon: LucideIcon
  /** Tailwind gradient classes */
  color: string
}

/**
 * Subject -> display metadata. Subjects not listed fall back to GENERIC_CATEGORY.
 * Add an entry here whenever a new `subject` value appears in DB seeds.
 */
export const QUIZ_CATEGORIES: QuizCategoryMeta[] = [
  { id: "math", name: "Mathématiques", icon: Calculator, color: "from-blue-500 to-cyan-500" },
  { id: "science", name: "Sciences", icon: Beaker, color: "from-green-500 to-emerald-500" },
  { id: "history", name: "Histoire", icon: History, color: "from-amber-500 to-orange-500" },
  { id: "geography", name: "Géographie", icon: Globe, color: "from-cyan-500 to-blue-500" },
  { id: "french", name: "Français", icon: BookOpen, color: "from-purple-500 to-pink-500" },
  { id: "english", name: "Anglais", icon: Languages, color: "from-rose-500 to-pink-500" },
  { id: "arabic", name: "Arabe", icon: Languages, color: "from-emerald-500 to-teal-500" },
  { id: "music", name: "Musique", icon: Music, color: "from-fuchsia-500 to-purple-500" },
  { id: "culture", name: "Culture Générale", icon: Star, color: "from-yellow-500 to-amber-500" },
]

export const GENERIC_CATEGORY: QuizCategoryMeta = {
  id: "general",
  name: "Général",
  icon: Brain,
  color: "from-brand-soft to-purple-500",
}

const CATEGORY_BY_ID = new Map(QUIZ_CATEGORIES.map((c) => [c.id, c]))

export function getCategoryMeta(subject: string | null | undefined): QuizCategoryMeta {
  if (!subject) return GENERIC_CATEGORY
  return CATEGORY_BY_ID.get(subject.toLowerCase()) ?? {
    ...GENERIC_CATEGORY,
    id: subject,
    name: subject.charAt(0).toUpperCase() + subject.slice(1),
  }
}
