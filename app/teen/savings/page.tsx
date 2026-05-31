import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { SegmentedProgress } from "@/components/ui/progress"
import Link from "next/link"
import { Plus } from "lucide-react"
import { GoalLockButton } from "@/components/teen/goal-lock-button"
import { GoalWithdrawButton } from "@/components/teen/goal-withdraw-button"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatHero, NivCoach, NivEmpty } from "@/components/brand"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

/** Libellés + couleur de pastille mono pour les statuts d'objectif. */
const GOAL_STATUS: Record<string, { label: string; className: string }> = {
  active: { label: "Actif", className: "bg-teal text-paper" },
  achieved: { label: "Atteint", className: "bg-lime text-on-bright" },
  withdrawn: { label: "Récupéré", className: "bg-ink text-paper" },
}

export default async function TeenSavingsPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/login")

  const supabase = await createClient()

  const [{ data: goals }, { data: spendable }] = await Promise.all([
    supabase
      .from("savings_goals")
      .select("*")
      .eq("teen_id", userInfo.profileId)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_coins_spendable")
      .select("total, locked_in_goals, spendable")
      .eq("teen_id", userInfo.profileId)
      .maybeSingle(),
  ])

  const hasAchieved = (goals ?? []).some((g) => g.status === "achieved")

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="eyebrow tracking-[0.16em] text-mute">Épargne</span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Tes objectifs d&apos;<em className="font-semibold italic text-pink">épargne</em>
          </h1>
          <p className="text-sm text-mute">
            Mets de côté tes coins pour atteindre ce qui te tient à cœur.
          </p>
        </div>
        <Link href="/teen/savings/new">
          <Button variant="pink"><Plus className="w-4 h-4" /> Nouvel objectif</Button>
        </Link>
      </header>

      {/* Synthèse — surface sombre : Disponible en hero, Total/Bloqué en sub-lignes */}
      <StatHero
        eyebrow="Disponible"
        tone="coral"
        size="lg"
        value={(spendable?.spendable ?? 0).toLocaleString()}
        unit="⊙ coins"
        meta={
          <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono tabular-nums">
            <span>Total : {(spendable?.total ?? 0).toLocaleString()} ⊙</span>
            <span>Bloqué (épargne) : {(spendable?.locked_in_goals ?? 0).toLocaleString()} ⊙</span>
          </div>
        }
      />

      {hasAchieved && (
        <NivCoach
          mood="proud"
          message="Objectif atteint, bravo ! Récupère tes coins ou vise plus haut."
        />
      )}

      {(goals ?? []).length === 0 ? (
        <NivEmpty
          mood="calm"
          title="Aucun objectif d'épargne"
          description="Crée ton premier objectif et commence à mettre tes coins de côté pour ce qui compte."
          action={
            <Link href="/teen/savings/new">
              <Button variant="pink" size="sm">Créer un objectif</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(goals ?? []).map((g) => {
            const pct = Math.min(100, Math.round((g.current_saved_coins / g.target_coins) * 100))
            const segments = 10
            const current = Math.min(segments, Math.round((pct / 100) * segments))
            const status = GOAL_STATUS[g.status] ?? {
              label: g.status,
              className: "bg-ink text-paper",
            }
            return (
              <StickerCard key={g.id} variant="default" className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-base font-bold text-ink">{g.title}</h3>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border-2 border-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.12em]",
                      status.className,
                    )}
                  >
                    {status.label}
                  </span>
                </div>
                {g.description && (
                  <p className="text-sm text-mute">{g.description}</p>
                )}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-mono text-sm tabular-nums text-ink-2">
                    <span>{g.current_saved_coins.toLocaleString()} / {g.target_coins.toLocaleString()} ⊙</span>
                    <span>{pct}%</span>
                  </div>
                  <SegmentedProgress steps={segments} current={current} size="md" />
                </div>
                {g.parent_match_pct > 0 && (
                  <span className="inline-block rounded-full border-2 border-ink bg-paper-2 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink-2">
                    Match parent {g.parent_match_pct}%
                    {g.parent_match_cap_coins ? ` (cap ${g.parent_match_cap_coins})` : ""}
                  </span>
                )}
                {g.status === "active" && (
                  <GoalLockButton
                    goalId={g.id}
                    spendable={spendable?.spendable ?? 0}
                    currentSavedCoins={g.current_saved_coins}
                    targetCoins={g.target_coins}
                  />
                )}
                {g.status === "achieved" && (
                  <GoalWithdrawButton
                    goalId={g.id}
                    lockedCoins={g.current_saved_coins}
                  />
                )}
                {g.status === "withdrawn" && (
                  <p className="font-mono text-xs italic text-lime">
                    Récupéré — coins disponibles
                  </p>
                )}
              </StickerCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
