/**
 * Wave 2.3 — Creator leaderboard.
 *
 * Separate from the gamification XP leaderboard (/gamification/leaderboard).
 * Reads creator_monthly_stats and surfaces the current month's top creators.
 */
import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

const CATEGORIES = ["all", "sport", "art", "tech", "academic", "food", "lifestyle"] as const

type Row = {
  user_id: string
  category: string | null
  submissions_count: number
  total_likes: number
  total_views: number
  xp_earned: number
  rank_overall: number | null
}

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
  await sr.rpc("refresh_creator_monthly_stats")

  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10)

  let q = sr
    .from("creator_monthly_stats")
    .select("user_id,category,submissions_count,total_likes,total_views,xp_earned,rank_overall")
    .eq("month", monthStart)
    .order("xp_earned", { ascending: false })
    .limit(20)
  if (category && category !== "all") q = q.eq("category", category)

  const { data } = await q
  const entries = (data ?? []) as Row[]

  return (
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

      {entries.length === 0 ? (
        <p className="text-gray-500">Pas encore de classement ce mois-ci.</p>
      ) : (
        <ol className="space-y-2">
          {entries.map((row, idx) => (
            <li
              key={row.user_id}
              className="flex items-center justify-between rounded border bg-white p-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-right font-bold text-gray-400">#{idx + 1}</span>
                <span className="font-mono text-xs text-gray-700">
                  {row.user_id.slice(0, 8)}…
                </span>
                {row.category && (
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                    {row.category}
                  </span>
                )}
              </div>
              <div className="flex gap-4 text-xs text-gray-600">
                <span>{row.submissions_count} posts</span>
                <span>♥ {row.total_likes}</span>
                <span className="font-semibold text-blue-700">{row.xp_earned} XP</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
