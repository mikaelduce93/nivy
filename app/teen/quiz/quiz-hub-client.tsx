"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Brain,
  Zap,
  Trophy,
  Clock,
  Star,
  Play,
  Target,
  CheckCircle,
  History as HistoryIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SegmentedProgress } from "@/components/ui/progress"
import { StickerCard } from "@/components/ui/sticker-card"
import { Niv, DarkSurface, NivEmpty } from "@/components/brand"
import { getCategoryMeta } from "@/lib/quiz/catalog"
import type { QuizCategorySummary, QuizSummary } from "@/lib/quiz/schema"

interface AttemptRow {
  id: string
  quiz_id: string
  score: number
  xp_earned: number | null
  passed: boolean | null
  created_at: string | null
  quiz: { id: string; title: string; subject: string; icon: string | null } | null
}

interface DailyQuizPayload {
  quiz: QuizSummary | null
  completedToday: boolean
}

interface QuizHubClientProps {
  categories: QuizCategorySummary[]
  quizzesBySubject: Record<string, QuizSummary[]>
  recentAttempts: AttemptRow[]
  dailyQuiz: DailyQuizPayload
  stats: {
    totalCompleted: number
    averageScore: number
    totalXpEarned: number
    perfectCount: number
  }
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return ""
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "À l'instant"
  if (minutes < 60) return `Il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Hier"
  if (days < 7) return `Il y a ${days}j`
  return new Date(iso).toLocaleDateString("fr-FR")
}

export function QuizHubClient({
  categories,
  quizzesBySubject,
  recentAttempts,
  dailyQuiz,
  stats,
}: QuizHubClientProps) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)

  const visibleCategories = useMemo(
    () =>
      categories.map((c) => ({
        ...c,
        meta: getCategoryMeta(c.id),
      })),
    [categories],
  )

  const subjectQuizzes = selectedSubject ? quizzesBySubject[selectedSubject] ?? [] : []

  return (
    <div className="min-h-screen pb-32 space-y-8 pt-6" data-testid="teen-quiz-hub">
      {/* Header — hero éditorial */}
      <header className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow tracking-[0.16em]">Cerveau · Quiz</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">
              Teste tes <em className="font-semibold italic text-pink">connaissances</em>
            </h1>
            <p className="text-sm text-mute">Gagne de l'XP en répondant juste.</p>
          </div>
          <Link
            href="/teen/quiz/history"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-ink bg-white px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-ink shadow-stkr-sm transition-colors hover:bg-paper-2"
          >
            <HistoryIcon className="size-4" aria-hidden="true" />
            <span>Historique</span>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            icon={<CheckCircle className="size-4 text-lime" aria-hidden="true" />}
            value={stats.totalCompleted.toString()}
            label="Complétés"
          />
          <StatCard
            icon={<Target className="size-4 text-teal" aria-hidden="true" />}
            value={`${stats.averageScore}%`}
            label="Moyenne"
            valueClassName="text-teal"
          />
          <StatCard
            icon={<Zap className="size-4 text-gold" aria-hidden="true" />}
            value={stats.totalXpEarned.toLocaleString()}
            label="XP Total"
            valueClassName="text-gold"
          />
          <StatCard
            icon={<Trophy className="size-4 text-lime" aria-hidden="true" />}
            value={stats.perfectCount.toString()}
            label="100%"
            valueClassName="text-lime"
          />
        </div>
      </header>

      {/* Daily Challenge — surface sombre ponctuelle */}
      {dailyQuiz.quiz && (
        <DarkSurface
          tone="pink"
          shadow
          className="p-8"
          data-testid="daily-quiz-card"
        >
          <div className="absolute right-4 top-4 rounded-full border-2 border-paper/30 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-pink">
            Quotidien
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Niv mood="hype" float size={88} className="shrink-0" />
            <div className="min-w-[240px] flex-1">
              <h3 className="font-display text-2xl font-extrabold text-paper mb-1">
                {dailyQuiz.quiz.title}
              </h3>
              <p className="text-paper/70 mb-4">
                {dailyQuiz.quiz.description ||
                  `${dailyQuiz.quiz.questions_count} questions pour tester tes connaissances`}
              </p>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Zap className="size-5 text-gold" aria-hidden="true" />
                  <span className="font-mono font-bold text-gold">
                    +{dailyQuiz.quiz.xp_reward ?? 50} XP
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="size-5 text-pink" aria-hidden="true" />
                  <span className="font-mono font-bold text-paper">
                    {dailyQuiz.quiz.questions_count} questions
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-5 text-paper/60" aria-hidden="true" />
                  <span className="font-mono text-paper/60">
                    {dailyQuiz.quiz.time_limit_minutes ?? 15} min
                  </span>
                </div>
              </div>
            </div>
            <Button asChild variant="pink">
              <Link href={`/teen/quiz/${dailyQuiz.quiz.id}`}>
                <Play className="size-4" aria-hidden="true" />
                {dailyQuiz.completedToday ? "Rejouer" : "Commencer"}
              </Link>
            </Button>
          </div>
        </DarkSurface>
      )}

      {/* Categories */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow tracking-[0.16em]">Catégories</p>
          {selectedSubject && (
            <button
              onClick={() => setSelectedSubject(null)}
              className="font-mono text-xs text-mute hover:text-ink"
            >
              ← Retour aux catégories
            </button>
          )}
        </div>

        {!selectedSubject ? (
          visibleCategories.length === 0 ? (
            <NivEmpty
              mood="calm"
              title="Aucune catégorie disponible"
              description="Les quiz arrivent bientôt — reviens plus tard !"
              data-testid="quiz-empty-state"
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {visibleCategories.map((category) => {
                const Icon = category.meta.icon
                const progress =
                  category.total > 0 ? (category.completed / category.total) * 100 : 0
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedSubject(category.id)}
                    className="flex flex-col rounded-2xl border-2 border-ink bg-white p-6 text-left shadow-stkr-md transition-all duration-200 ease-out hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink motion-reduce:translate-x-0 motion-reduce:translate-y-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
                    data-testid={`quiz-category-${category.id}`}
                  >
                    <span className="mb-4 grid size-14 place-items-center rounded-2xl border-2 border-ink bg-paper-2">
                      <Icon className="size-7 text-ink" aria-hidden="true" />
                    </span>
                    <h3 className="font-display text-lg font-extrabold text-ink mb-1">
                      {category.meta.name}
                    </h3>
                    <p className="font-mono text-sm text-mute mb-4">
                      {category.completed}/{category.total} quiz
                    </p>
                    <SegmentedProgress
                      steps={Math.max(1, category.total)}
                      current={category.completed}
                      aria-label={`${Math.round(progress)}% complété`}
                    />
                  </button>
                )
              })}
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {subjectQuizzes.length === 0 ? (
              <NivEmpty
                mood="calm"
                title="Pas encore de quiz ici"
                description="Cette catégorie attend ses premiers quiz."
                data-testid="quiz-empty-state"
              />
            ) : (
              subjectQuizzes.map((quiz) => (
                <Link
                  key={quiz.id}
                  href={`/teen/quiz/${quiz.id}`}
                  className="flex flex-col rounded-2xl border-2 border-ink bg-white p-5 shadow-stkr-md transition-all duration-200 ease-out hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink motion-reduce:translate-x-0 motion-reduce:translate-y-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
                  data-testid={`quiz-card-${quiz.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-ink truncate">{quiz.title}</h3>
                      {quiz.description && (
                        <p className="text-sm text-mute line-clamp-2 mt-1">
                          {quiz.description}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-4 font-mono text-xs text-mute">
                        <span>{quiz.questions_count} questions</span>
                        {quiz.difficulty && <span className="capitalize">{quiz.difficulty}</span>}
                        {quiz.grade_level && <span>{quiz.grade_level}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-gold">
                      <Zap className="size-4" aria-hidden="true" />
                      <span className="font-mono text-sm font-bold">+{quiz.xp_reward ?? 50}</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </section>

      {/* Recent attempts */}
      <section className="space-y-4">
        <p className="eyebrow tracking-[0.16em]">Récents</p>
        {recentAttempts.length === 0 ? (
          <NivEmpty
            mood="happy"
            title="Aucun quiz joué"
            description="Lance ton premier quiz pour commencer à gagner de l'XP."
            data-testid="quiz-empty-state"
          />
        ) : (
          <div className="space-y-3" data-testid="recent-attempts">
            {recentAttempts.map((attempt) => (
              <StickerCard key={attempt.id} className="p-4">
                <div className="flex items-center gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl border-2 border-ink bg-paper-2">
                    <Brain className="size-6 text-ink" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-ink truncate">
                      {attempt.quiz?.title ?? "Quiz supprimé"}
                    </h4>
                    <p className="text-sm text-mute capitalize">
                      {attempt.quiz?.subject ?? "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div
                      className={cn(
                        "font-display text-lg font-extrabold tabular-nums",
                        attempt.score >= 90
                          ? "text-lime"
                          : attempt.score >= 70
                            ? "text-gold"
                            : "text-coral",
                      )}
                    >
                      {attempt.score}%
                    </div>
                    {(attempt.xp_earned ?? 0) > 0 && (
                      <div className="flex items-center justify-end gap-1 font-mono text-xs text-gold">
                        <Zap className="size-3" aria-hidden="true" />
                        <span>+{attempt.xp_earned}</span>
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-xs text-mute">
                    {formatRelativeTime(attempt.created_at)}
                  </span>
                </div>
              </StickerCard>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({
  icon,
  value,
  label,
  valueClassName,
}: {
  icon: React.ReactNode
  value: string
  label: string
  valueClassName?: string
}) {
  return (
    <StickerCard className="items-center p-4 text-center">
      <div className="flex items-center justify-center gap-2 mb-1">
        {icon}
        <span className={cn("font-mono text-xl font-bold tabular-nums text-ink", valueClassName)}>
          {value}
        </span>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">{label}</p>
    </StickerCard>
  )
}
