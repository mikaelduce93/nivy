import { redirect } from "next/navigation"
import Link from "next/link"
import { Brain, Zap, ArrowLeft } from "lucide-react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { getRecentQuizAttempts, getTeenQuizStats } from "@/lib/quiz/server"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/states/empty-state"

export const dynamic = "force-dynamic"

function formatDate(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function QuizHistoryPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen" || !userInfo.teenData?.id) {
    redirect("/auth/redirect")
  }

  const teenId = userInfo.teenData.id
  const [attempts, stats] = await Promise.all([
    getRecentQuizAttempts(teenId, 50),
    getTeenQuizStats(teenId),
  ])

  return (
    <div className="min-h-screen pb-32 pt-6 space-y-6" data-testid="quiz-history-page">
      <div className="flex items-center gap-3">
        <Link href="/teen/quiz" className="text-mute hover:text-ink">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tight">Historique</h1>
          <p className="text-sm text-mute">Tous tes quiz joués</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-ink text-center">
          <div className="text-2xl font-black text-ink">{stats.totalCompleted}</div>
          <div className="text-[10px] text-mute uppercase tracking-wider">Quiz joués</div>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-ink text-center">
          <div className="text-2xl font-black text-ink">{stats.averageScore}%</div>
          <div className="text-[10px] text-mute uppercase tracking-wider">Moyenne</div>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-ink text-center">
          <div className="text-2xl font-black text-brand-soft">
            {stats.totalXpEarned.toLocaleString()}
          </div>
          <div className="text-[10px] text-mute uppercase tracking-wider">XP Total</div>
        </div>
      </div>

      {/* Attempts list */}
      {attempts.length === 0 ? (
        <div data-testid="quiz-history-empty">
          <EmptyState
            icon={Brain}
            title="Aucun quiz joué"
            description="Lance ton premier quiz pour commencer à gagner de l'XP."
            action={{ label: "Voir les quiz", href: "/teen/quiz" }}
          />
        </div>
      ) : (
        <div className="space-y-2" data-testid="quiz-history-list">
          {attempts.map((attempt) => (
            <Link
              key={attempt.id}
              href={attempt.quiz_id ? `/teen/quiz/${attempt.quiz_id}` : "#"}
              className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-ink hover:border-ink transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-soft/20 flex items-center justify-center">
                <Brain className="w-6 h-6 text-brand-soft" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-ink truncate">
                  {attempt.quiz?.title ?? "Quiz supprimé"}
                </h4>
                <p className="text-xs text-mute capitalize">
                  {attempt.quiz?.subject ?? "—"} · {formatDate(attempt.created_at)}
                </p>
              </div>
              <div className="text-right">
                <div
                  className={cn(
                    "font-black text-lg",
                    attempt.score >= 90
                      ? "text-success-soft"
                      : attempt.score >= 70
                        ? "text-gold"
                        : "text-accent-soft",
                  )}
                >
                  {attempt.score}%
                </div>
                {(attempt.xp_earned ?? 0) > 0 && (
                  <div className="flex items-center justify-end gap-1 text-xs text-brand-soft">
                    <Zap className="w-3 h-3" />
                    <span>+{attempt.xp_earned}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
