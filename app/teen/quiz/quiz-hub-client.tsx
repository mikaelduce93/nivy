"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
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
import { Progress } from "@/components/ui/progress"
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
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gen-z-lavender to-purple-500 flex items-center justify-center">
              <Brain className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase italic">Quiz</h1>
              <p className="text-zinc-500 text-sm font-medium">Teste tes connaissances</p>
            </div>
          </div>
          <Link
            href="/teen/quiz/history"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <HistoryIcon className="w-4 h-4" />
            <span>Historique</span>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            icon={<CheckCircle className="w-4 h-4 text-gen-z-mint" />}
            value={stats.totalCompleted.toString()}
            label="Complétés"
          />
          <StatCard
            icon={<Target className="w-4 h-4 text-gen-z-coral" />}
            value={`${stats.averageScore}%`}
            label="Moyenne"
            delay={0.1}
          />
          <StatCard
            icon={<Zap className="w-4 h-4 text-gen-z-lavender" />}
            value={stats.totalXpEarned.toLocaleString()}
            label="XP Total"
            delay={0.2}
          />
          <StatCard
            icon={<Trophy className="w-4 h-4 text-yellow-500" />}
            value={stats.perfectCount.toString()}
            label="100%"
            delay={0.3}
          />
        </div>
      </header>

      {/* Daily Challenge */}
      {dailyQuiz.quiz && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-gen-z-lavender/20 to-purple-500/10 border border-gen-z-lavender/30"
          data-testid="daily-quiz-card"
        >
          <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-gen-z-lavender/20 text-gen-z-lavender text-xs font-black uppercase">
            Quotidien
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gen-z-lavender to-purple-500 flex items-center justify-center">
              <Brain className="w-10 h-10 text-black" />
            </div>
            <div className="flex-1 min-w-[240px]">
              <h3 className="text-2xl font-black text-white mb-1">{dailyQuiz.quiz.title}</h3>
              <p className="text-zinc-400 mb-4">
                {dailyQuiz.quiz.description ||
                  `${dailyQuiz.quiz.questions_count} questions pour tester tes connaissances`}
              </p>
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-gen-z-lavender" />
                  <span className="font-bold text-gen-z-lavender">
                    +{dailyQuiz.quiz.xp_reward ?? 50} XP
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span className="font-bold text-yellow-500">
                    {dailyQuiz.quiz.questions_count} questions
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-zinc-400" />
                  <span className="text-zinc-400">
                    {dailyQuiz.quiz.time_limit_minutes ?? 15} min
                  </span>
                </div>
              </div>
            </div>
            <Link href={`/teen/quiz/${dailyQuiz.quiz.id}`}>
              <Button className="bg-gen-z-lavender text-black font-bold hover:bg-gen-z-lavender/80">
                <Play className="w-4 h-4 mr-2" />
                {dailyQuiz.completedToday ? "Rejouer" : "Commencer"}
              </Button>
            </Link>
          </div>
        </motion.div>
      )}

      {/* Categories */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-black uppercase">Catégories</h2>
          {selectedSubject && (
            <button
              onClick={() => setSelectedSubject(null)}
              className="text-xs text-zinc-500 hover:text-white"
            >
              ← Retour aux catégories
            </button>
          )}
        </div>

        {!selectedSubject ? (
          visibleCategories.length === 0 ? (
            <EmptyCard
              title="Aucune catégorie disponible"
              description="Les quiz arrivent bientôt — reviens plus tard !"
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {visibleCategories.map((category, idx) => {
                const Icon = category.meta.icon
                const progress =
                  category.total > 0 ? (category.completed / category.total) * 100 : 0
                return (
                  <motion.button
                    key={category.id}
                    type="button"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    onClick={() => setSelectedSubject(category.id)}
                    className="text-left relative p-6 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-white/20 transition-all"
                    data-testid={`quiz-category-${category.id}`}
                  >
                    <div
                      className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br",
                        category.meta.color,
                      )}
                    >
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-black text-lg text-white mb-1">{category.meta.name}</h3>
                    <p className="text-sm text-zinc-400 mb-4">
                      {category.completed}/{category.total} quiz
                    </p>
                    <Progress value={progress} className="h-2" />
                  </motion.button>
                )
              })}
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjectQuizzes.length === 0 ? (
              <EmptyCard
                title="Pas encore de quiz ici"
                description="Cette catégorie attend ses premiers quiz."
              />
            ) : (
              subjectQuizzes.map((quiz) => (
                <Link
                  key={quiz.id}
                  href={`/teen/quiz/${quiz.id}`}
                  className="p-5 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-white/20 transition-all"
                  data-testid={`quiz-card-${quiz.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-white truncate">{quiz.title}</h3>
                      {quiz.description && (
                        <p className="text-sm text-zinc-400 line-clamp-2 mt-1">
                          {quiz.description}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                        <span>{quiz.questions_count} questions</span>
                        {quiz.difficulty && <span className="capitalize">{quiz.difficulty}</span>}
                        {quiz.grade_level && <span>{quiz.grade_level}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-gen-z-lavender shrink-0">
                      <Zap className="w-4 h-4" />
                      <span className="text-sm font-bold">+{quiz.xp_reward ?? 50}</span>
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
        <h2 className="text-xl font-black uppercase">Récents</h2>
        {recentAttempts.length === 0 ? (
          <EmptyCard
            title="Aucun quiz joué"
            description="Lance ton premier quiz pour commencer à gagner de l'XP."
          />
        ) : (
          <div className="space-y-3" data-testid="recent-attempts">
            {recentAttempts.map((attempt, idx) => (
              <motion.div
                key={attempt.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5"
              >
                <div className="w-12 h-12 rounded-xl bg-gen-z-lavender/20 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-gen-z-lavender" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white truncate">
                    {attempt.quiz?.title ?? "Quiz supprimé"}
                  </h4>
                  <p className="text-sm text-zinc-400 capitalize">
                    {attempt.quiz?.subject ?? "—"}
                  </p>
                </div>
                <div className="text-right">
                  <div
                    className={cn(
                      "font-black text-lg",
                      attempt.score >= 90
                        ? "text-gen-z-mint"
                        : attempt.score >= 70
                          ? "text-yellow-500"
                          : "text-gen-z-coral",
                    )}
                  >
                    {attempt.score}%
                  </div>
                  {(attempt.xp_earned ?? 0) > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gen-z-lavender">
                      <Zap className="w-3 h-3" />
                      <span>+{attempt.xp_earned}</span>
                    </div>
                  )}
                </div>
                <span className="text-xs text-zinc-500 shrink-0">
                  {formatRelativeTime(attempt.created_at)}
                </span>
              </motion.div>
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
  delay = 0,
}: {
  icon: React.ReactNode
  value: string
  label: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 text-center"
    >
      <div className="flex items-center justify-center gap-2 mb-1">
        {icon}
        <span className="font-black text-xl">{value}</span>
      </div>
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
    </motion.div>
  )
}

function EmptyCard({ title, description }: { title: string; description: string }) {
  return (
    <div
      className="p-8 rounded-3xl bg-zinc-900/40 border border-dashed border-white/10 text-center"
      data-testid="quiz-empty-state"
    >
      <h3 className="font-bold text-white mb-1">{title}</h3>
      <p className="text-sm text-zinc-400">{description}</p>
    </div>
  )
}
