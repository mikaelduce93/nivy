/**
 * /teen/quests/friend-defis — Friend défis hub (TICKET-020 / Wave-2 FD2).
 *
 * Lists every friend_challenges row where the current teen is either the
 * creator or the opponent (v2 schema, migration 073). The page filters by
 * status across three buckets:
 *
 *   • pending  → invitations awaiting an answer (the user is the opponent
 *                on incoming invites; the creator on outgoing ones)
 *   • active   → accepted challenges currently being played
 *   • completed → settled challenges (winner already determined by FD4)
 *
 * Each row is rendered with the unified <DefiCard variant="friend"> from
 * components/teen/defi-card.tsx — we DO NOT modify that component
 * (Wave-2 write-scope constraint).
 *
 * All mutations (accept / decline / record progress) call FD1's API
 * routes (TICKET-019, landing separately) via fetch — we never read or
 * write friend_challenges directly from the client. The API contract
 * matches the file paths declared in TICKETS.md:
 *
 *   POST /api/teen/friend-challenges/[id]/accept
 *   POST /api/teen/friend-challenges/[id]/decline   (FD1: same accept route w/ body)
 *   POST /api/teen/friend-challenges/[id]/progress
 *
 * See FD1's TICKET-019 for the canonical request/response shape; the
 * client below treats any non-2xx as a failure and surfaces the error
 * inline.
 */

import { redirect } from "next/navigation"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { FriendDefisClient, type FriendChallengeRow } from "./friend-defis-client"

// Force dynamic — list contents change with auth + frequent writes from FD1.
export const dynamic = "force-dynamic"

async function getFriendChallenges(teenAuthId: string): Promise<FriendChallengeRow[]> {
  const supabase = await createClient()

  // RLS (migration 073, friend_challenges_self_read_v2) already restricts
  // SELECT to creator_id = auth.uid() OR opponent_id = auth.uid(). We add
  // the same predicate explicitly for clarity + index hits
  // (idx_friend_challenges_creator_status_v2 / opponent_status_v2).
  const { data, error } = await supabase
    .from("friend_challenges")
    .select(
      [
        "id",
        "name",
        "creator_id",
        "opponent_id",
        "status",
        "acceptance_status",
        "challenge_kind",
        "target_value",
        "progress_creator",
        "progress_opponent",
        "stake_xp",
        "xp_pot",
        "starts_at",
        "ends_at",
        "expires_at",
        "winner_id",
        "is_draw",
        "created_at",
      ].join(","),
    )
    .or(`creator_id.eq.${teenAuthId},opponent_id.eq.${teenAuthId}`)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    console.error("[friend-defis] fetch error", error)
    return []
  }

  return (data || []) as unknown as FriendChallengeRow[]
}

export default async function FriendDefisPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  // teenData.id is the auth.users.id (see lib/auth/get-user-role.ts:87) —
  // friend_challenges.creator_id / opponent_id reference auth.users(id), so
  // this is the correct join key.
  const teenAuthId = userInfo.teenData?.id
  if (!teenAuthId) {
    redirect("/teen")
  }

  const challenges = await getFriendChallenges(teenAuthId).catch(() => [])

  return (
    <div className="min-h-screen pb-32">
      <Suspense fallback={<FriendDefisSkeleton />}>
        <FriendDefisClient
          teenAuthId={teenAuthId}
          challenges={JSON.parse(JSON.stringify(challenges))}
        />
      </Suspense>
    </div>
  )
}

function FriendDefisSkeleton() {
  return (
    <div className="space-y-8 pt-8 animate-pulse">
      <div className="h-12 bg-zinc-800/50 rounded-2xl w-full max-w-md" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-64 bg-zinc-800/30 rounded-3xl" />
        ))}
      </div>
    </div>
  )
}
