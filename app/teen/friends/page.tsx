/**
 * /teen/friends — Friends hub.
 *
 * TICKET-036 (Wave-3 P5) — surfaces FD3's friend recommendations
 * (RPC `public.recommend_friends`, migration 079, exposed via
 * `/api/teen/recommend-friends`) inside a "Suggestions" section.
 *
 * The page itself is a server component: it resolves the caller's teen_id
 * via getUserRole() and invokes the SECURITY DEFINER RPC directly so the
 * suggestions are part of the SSR payload (no client-side waterfall). All
 * interactive state — search, tabs, invite buttons — lives in
 * ./friends-client.tsx.
 *
 * Write-scope guardrails:
 *   - We DO NOT touch the friend-challenges UI (FD2 owns it).
 *   - We DO NOT modify the recommend_friends RPC (FD3 owns it).
 */

import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import FriendsClient, { type FriendSuggestion } from "./friends-client"
import { PullToRefresh } from "@/components/teen/pull-to-refresh"

// Force dynamic — recommendations depend on auth + frequently changing
// behavioural signals (teen_neighbours).
export const dynamic = "force-dynamic"

const SUGGESTION_FETCH_LIMIT = 10
const SUGGESTION_RENDER_LIMIT = 5

function parseSuggestionRows(data: unknown): FriendSuggestion[] {
  if (!Array.isArray(data)) return []
  return data
    .map((row): FriendSuggestion | null => {
      let parsed: unknown = row
      if (typeof row === "string") {
        try {
          parsed = JSON.parse(row)
        } catch {
          return null
        }
      }
      if (!parsed || typeof parsed !== "object") return null
      const r = parsed as Record<string, unknown>
      if (typeof r.teen_id !== "string") return null
      const source: "neighbours" | "affinity" =
        r.source === "affinity" ? "affinity" : "neighbours"
      return {
        teen_id: r.teen_id,
        name: typeof r.name === "string" ? r.name : "Anonyme",
        level: typeof r.level === "number" ? r.level : Number(r.level) || 1,
        last_seen:
          typeof r.last_seen === "string" || r.last_seen === null
            ? (r.last_seen as string | null)
            : null,
        similarity:
          typeof r.similarity === "number"
            ? r.similarity
            : Number(r.similarity) || 0,
        source,
      }
    })
    .filter((row): row is FriendSuggestion => row !== null)
}

async function getFriendSuggestions(teenId: string): Promise<FriendSuggestion[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("recommend_friends", {
    p_teen_id: teenId,
    p_limit: SUGGESTION_FETCH_LIMIT,
  })
  if (error) {
    console.error("[teen/friends] recommend_friends RPC error:", error)
    return []
  }
  return parseSuggestionRows(data).slice(0, SUGGESTION_RENDER_LIMIT)
}

export default async function FriendsPage() {
  const userInfo = await getUserRole()

  // Unauthenticated / non-teen viewers fall back to an empty suggestions list
  // — we still render the page so the existing /api/teen/friends client fetch
  // can produce the "Aucun ami" empty state without a hard redirect.
  let suggestions: FriendSuggestion[] = []
  if (userInfo?.role === "teen" && userInfo.teenData?.id) {
    suggestions = await getFriendSuggestions(userInfo.teenData.id).catch(() => [])
  }

  return (
    <PullToRefresh>
      <Suspense fallback={<FriendsSkeleton />}>
        <FriendsClient initialSuggestions={suggestions} />
      </Suspense>
    </PullToRefresh>
  )
}

// Polish-F: replace `fallback={null}` (which produced a blank flash on slow
// networks) with a layout-matching skeleton. Pure presentational + a11y
// hidden so screen readers don't announce shimmer rows.
function FriendsSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6" aria-hidden="true">
      <div className="h-10 w-48 rounded-xl bg-white/5 motion-safe:animate-pulse" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-2xl border border-white/5 bg-white/5 motion-safe:animate-pulse"
          />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-xl bg-white/5 motion-safe:animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}
