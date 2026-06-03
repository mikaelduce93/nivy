import { redirect } from "next/navigation"
import Link from "next/link"
import { Zap, ArrowLeft, Brain } from "lucide-react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { getRecentQuizAttempts, getTeenQuizStats } from "@/lib/quiz/server"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"

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
          <ArrowLeft className="size-5" aria-hidden="true" />
          <span className="sr-only">Retour aux quiz</span>
        </Link>
        <div>
          <p className="eyebrow tracking-[0.16em]">Ton historique quiz</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Tes <em className="font-semibold italic text-pink">quiz</em> joués
          </h1>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <StickerCard className="items-center p-4 text-center">
          <div className="font-mono text-2xl font-bold tabular-nums text-ink">
            {stats.totalCompleted}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
            Quiz joués
          </div>
        </StickerCard>
        <StickerCard className="items-center p-4 text-center">
          <div className="font-mono text-2xl font-bold tabular-nums text-teal">
            {stats.averageScore}%
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
            Moyenne
          </div>
        </StickerCard>
        <StickerCard className="items-center p-4 text-center">
          <div className="font-mono text-xl sm:text-2xl font-bold tabular-nums text-gold">
            {stats.totalXpEarned.toLocaleString()}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
            XP Total
          </div>
        </StickerCard>
      </div>

      {/* Attempts list */}
      {attempts.length === 0 ? (
        <div data-testid="quiz-history-empty">
          <NivEmpty
            mood="calm"
            title="Aucun quiz joué"
            description="Lance ton premier quiz pour commencer à gagner de l'XP."
            action={
              <Button asChild variant="pink">
                <Link href="/teen/quiz">Voir les quiz</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-3" data-testid="quiz-history-list">
          {attempts.map((attempt) => (
            <Link
              key={attempt.id}
              href={attempt.quiz_id ? `/teen/quiz/${attempt.quiz_id}` : "#"}
              className="flex items-center gap-4 rounded-2xl border-2 border-ink bg-white p-4 shadow-stkr-md transition-all duration-200 ease-out hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink motion-reduce:translate-x-0 motion-reduce:translate-y-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-xl border-2 border-ink bg-paper-2">
                <Brain className="size-6 text-ink" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-ink truncate">
                  {attempt.quiz?.title ?? "Quiz supprimé"}
                </h4>
                <p className="font-mono text-xs text-mute capitalize">
                  {attempt.quiz?.subject ?? "—"} · {formatDate(attempt.created_at)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={cn(
                    "rounded-full border-2 border-ink px-2.5 py-0.5 font-mono text-sm font-bold tabular-nums",
                    attempt.score >= 90
                      ? "bg-lime text-on-bright"
                      : attempt.score >= 70
                        ? "bg-gold text-on-bright"
                        : "bg-coral text-on-bright",
                  )}
                >
                  {attempt.score}%
                </span>
                {(attempt.xp_earned ?? 0) > 0 && (
                  <div className="flex items-center justify-end gap-1 font-mono text-xs text-gold">
                    <Zap className="size-3" aria-hidden="true" />
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
