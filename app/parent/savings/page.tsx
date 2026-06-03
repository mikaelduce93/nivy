import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import { NivCoach, NivEmpty } from "@/components/brand"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { GoalMatchForm } from "@/components/parent/goal-match-form"

export const dynamic = "force-dynamic"

const STATUS_LABELS: Record<string, string> = {
  active: "En cours",
  achieved: "Atteint",
  paused: "En pause",
  cancelled: "Annulé",
}

const statusLabel = (s: string) => STATUS_LABELS[s] ?? s

export default async function ParentSavingsPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") redirect("/login")

  const supabase = await createClient()

  // Polish-F: drop the sentinel UUID hack (`["00000000-..."]`). Branch on
  // teenIds.length and surface load failures via a banner rather than
  // masking them as "Aucun objectif…".
  type GoalRow = {
    id: string
    title: string
    target_coins: number
    current_saved_coins: number
    parent_match_pct: number | string | null
    parent_match_cap_coins: number | null
    parent_match_contributed_coins: number
    status: string
    profile?: { full_name?: string } | null
  }
  let goals: GoalRow[] = []
  let loadError: string | null = null
  try {
    const { data: links, error: linksErr } = await supabase
      .from("parent_teen_links")
      .select("teen_id")
      .eq("parent_id", userInfo.profileId)
    if (linksErr) {
      console.error("[parent/savings] parent_teen_links error:", linksErr)
      loadError = "Impossible de charger les ados liés."
    }
    const teenIds = (links ?? []).map((l) => l.teen_id as string)
    if (teenIds.length > 0) {
      const { data, error } = await supabase
        .from("savings_goals")
        .select("*, profile:teen_id(full_name)")
        .in("teen_id", teenIds)
        .order("created_at", { ascending: false })
      if (error) {
        console.error("[parent/savings] savings_goals error:", error)
        loadError = loadError ?? "Impossible de charger les objectifs."
      } else {
        goals = (data ?? []) as GoalRow[]
      }
    }
  } catch (err) {
    console.error("[parent/savings] queries threw:", err)
    loadError = "Une erreur est survenue lors du chargement."
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="container mx-auto px-6 py-32">
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        <div className="mb-8">
          <p className="eyebrow text-pink">Épargne</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink">
            Les <em className="font-semibold italic text-pink">objectifs</em> de ton ado
          </h1>
          <p className="mt-2 text-mute">
            Suis l&apos;épargne de tes ados et booste-la avec un match parental.
          </p>
        </div>

        {loadError && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {loadError}
          </div>
        )}

        <NivCoach
          mood="proud"
          className="mb-8"
          message="L'épargne, c'est mon truc préféré — chaque coin mis de côté rapproche du rêve. Rappel : 1 DH = 100 coins."
        />

        {goals.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Aucun objectif pour l'instant"
            description="Tes ados n'ont pas encore créé d'objectif d'épargne. Invite-les à commencer."
            action={
              <Button asChild>
                <Link href="/parent/teens">Inviter un teen</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {goals.map((g) => {
              const teenName = (g as { profile?: { full_name?: string } }).profile?.full_name ?? "Ado"
              const pct = Math.min(100, Math.round((g.current_saved_coins / g.target_coins) * 100))
              const filledSegments = Math.round((pct / 100) * 10)
              return (
                <StickerCard key={g.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg font-extrabold text-ink">
                      {teenName} — {g.title}
                    </h3>
                    {g.status === "achieved" ? (
                      <span className="px-2 py-1 rounded-md border-2 border-ink text-lime font-mono text-[11px] uppercase tracking-wide">
                        ✓ {statusLabel(g.status)}
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-md border-2 border-ink text-ink font-mono text-[11px] uppercase tracking-wide">
                        {statusLabel(g.status)}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm font-mono">
                        <span className="text-coral">
                          ⊙ {g.current_saved_coins} / {g.target_coins} coins
                        </span>
                        <span className="text-ink">{pct}%</span>
                      </div>
                      <SegmentedProgress steps={10} current={filledSegments} />
                      <p className="text-[11px] text-mute font-mono">1 DH = 100 coins</p>
                    </div>
                    <div className="text-sm text-mute">
                      Match déjà versé :{" "}
                      <span className="font-mono text-coral">
                        ⊙ {g.parent_match_contributed_coins} coins
                      </span>
                    </div>
                    <GoalMatchForm
                      goalId={g.id}
                      initialPct={Number(g.parent_match_pct ?? 0)}
                      initialCap={g.parent_match_cap_coins ?? null}
                    />
                  </div>
                </StickerCard>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
