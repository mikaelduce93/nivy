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
    }
  } catch (err) {
    console.error("[teen/leaderboard] threw:", err)
    loadError = "Impossible de charger le classement pour le moment."
  }

  return (
    <PullToRefresh>
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Top Créateurs · {monthStart.slice(0, 7)}</h1>
        <div className="flex gap-3 text-sm">
          <Link href="/teen/feed" className="text-blue-600 hover:underline">
            Feed
          </Link>
          <Link href="/gamification/leaderboard" className="text-blue-600 hover:underline">
            XP global
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const active = (category ?? "all") === c
          return (
            <Link
              key={c}
              href={c === "all" ? "/teen/leaderboard" : `/teen/leaderboard?category=${c}`}
              className={`rounded px-3 py-1 text-xs ${
                active ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {c}
            </Link>
          )
        })}
      </div>

      {loadError && (
        <div
          role="alert"
          className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
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
        <LeaderboardList entries={entries} />
      )}
    </div>
    </PullToRefresh>
  )
}
