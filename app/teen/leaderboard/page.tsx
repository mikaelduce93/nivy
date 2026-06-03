/**
 * Wave 2.3 — Creator leaderboard.
 *
 * Separate from the gamification XP leaderboard (/gamification/leaderboard).
 * Reads creator_monthly_stats and surfaces the current month's top creators.
 */
import Link from "next/link"
import { Trophy } from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { EmptyState } from "@/components/ui/states/empty-state"
import { PullToRefresh } from "@/components/teen/pull-to-refresh"
// TICKET-026 (Wave 3 / W3-A9) — FLIP animations on rank changes. Lifts
// the row rendering into a client component so it can live inside an
// <AnimatePresence mode="popLayout"> tree.
import { LeaderboardList, type LeaderboardRow } from "./leaderboard-list"

export const dynamic = "force-dynamic"

const CATEGORIES = ["all", "sport", "art", "tech", "academic", "food", "lifestyle"] as const

type Row = LeaderboardRow

export default async function CreatorLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const sr = createServiceRoleClient()
  // Polish-F: refresh + read can both fail. Previously a thrown RPC bubbled
  // straight to the framework error boundary; now we degrade gracefully.
  let entries: Row[] = []
  let loadError: string | null = null
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10)
  try {
    const { error: refreshErr } = await sr.rpc("refresh_creator_monthly_stats")
    if (refreshErr) {
      console.warn("[teen/leaderboard] refresh RPC error:", refreshErr)
    }
    let q = sr
      .from("creator_monthly_stats")
      .select("user_id,category,submissions_count,total_likes,total_views,xp_earned,rank_overall")
      .eq("month", monthStart)
      .order("xp_earned", { ascending: false })
      .limit(20)
    if (category && category !== "all") q = q.eq("category", category)
    const { data, error } = await q
    if (error) {
      console.error("[teen/leaderboard] read error:", error)
      loadError = "Impossible de charger le classement pour le moment."
    } else {
      entries = (data ?? []) as Row[]
      // Enrichissement de lecture : joindre pseudo + avatar depuis `teens`
      // (user_id == teen.id). Le pseudo est souvent NULL en seed → fallback
      // sur profiles.full_name via COALESCE applicatif (cf. get_user_crew).
      const ids = Array.from(new Set(entries.map((e) => e.user_id))).filter(Boolean)
      if (ids.length) {
        const { data: teens } = await sr
          .from("teens")
          .select("id, pseudo, avatar_url")
          .in("id", ids)
        const { data: profiles } = await sr
          .from("profiles")
          .select("id, full_name")
          .in("id", ids)
        const teenById = new Map(
          (teens ?? []).map((t: any) => [t.id as string, t]),
        )
        const nameById = new Map(
          (profiles ?? []).map((p: any) => [p.id as string, p.full_name as string | null]),
        )
        entries = entries.map((e) => {
          const t = teenById.get(e.user_id)
          return {
            ...e,
            pseudo:
              (t?.pseudo as string | null) ??
              (nameById.get(e.user_id) as string | null) ??
              null,
            avatar_url: (t?.avatar_url as string | null) ?? null,
          }
        })
      }
    }
  } catch (err) {
    console.error("[teen/leaderboard] threw:", err)
    loadError = "Impossible de charger le classement pour le moment."
  }

  // Libellés FR des catégories (l'enum reste la valeur de filtre BDD).
  const CATEGORY_LABELS: Record<string, string> = {
    all: "Tous",
    sport: "Sport",
    art: "Art",
    tech: "Tech",
    academic: "Études",
    food: "Food",
    lifestyle: "Lifestyle",
  }

  return (
    <PullToRefresh>
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">Classement · {monthStart.slice(0, 7)}</p>
          <div className="flex gap-3 font-mono text-xs">
            <Link href="/teen/feed" className="text-teal hover:underline">
              Feed
            </Link>
            <Link href="/teen/leaderboard" className="text-teal hover:underline">
              XP global
            </Link>
          </div>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
          Top <em className="font-semibold italic text-pink not-italic">créateurs</em>
        </h1>
        <p className="max-w-md text-mute">
          Les ados qui font vibrer le feed ce mois-ci. Publie pour grimper.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const active = (category ?? "all") === c
          return (
            <Link
              key={c}
              href={c === "all" ? "/teen/leaderboard" : `/teen/leaderboard?category=${c}`}
              className={`rounded-full border-2 border-ink px-3.5 py-1 font-mono text-xs font-semibold uppercase tracking-wide transition-all ${
                active
                  ? "-translate-x-0.5 -translate-y-0.5 bg-ink text-paper shadow-stkr-pink"
                  : "bg-white text-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-sm"
              }`}
            >
              {CATEGORY_LABELS[c] ?? c}
            </Link>
          )
        })}
      </div>

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border-2 border-coral bg-white px-3.5 py-2.5 text-sm font-medium text-coral shadow-stkr-sm"
        >
          {loadError}
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Pas encore de classement"
          description="Le classement pour ce mois est en cours de constitution. Publie tes créations pour grimper en haut !"
          action={{ label: "Créer un post", href: "/teen/create" }}
        />
      ) : (
        <LeaderboardList entries={entries} currentUserId={user.id} />
      )}
    </div>
    </PullToRefresh>
  )
}
