import { NextRequest } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { APIResponse } from "../../lib/responses"
import { FriendHandlers } from "./handlers"

/**
 * GET /api/teen/friends — list of accepted friends + lightweight stats.
 *
 * Shape returned to /teen/friends/page.tsx:
 *   { friends: [{ id, name, avatar_url, status, xp, mutual, mutual_calculated }] }
 *
 * `status` here means presence (online/away/offline), not friendship status —
 * the page filters tabs by it. We resolve presence from `user_presence` and XP
 * from `user_xp` to keep parity with the previous implementation.
 */
export async function GET(_request: NextRequest) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") {
    return APIResponse.unauthorized()
  }
  const teenId = userInfo.teenData?.id
  if (!teenId) return APIResponse.error("Teen profile not found", 400)

  const result = await FriendHandlers.list(teenId)

  // FriendHandlers.list returns the rich shape; reshape to what the UI consumes.
  // We re-fetch presence + xp here in a single round-trip rather than threading
  // them through handlers.ts (which is reused by other consumers expecting the
  // richer shape).
  const json = await result.json()
  if (!json?.success) return APIResponse.success({ friends: [], total: 0 })

  const rawFriends: any[] = json.friends || []
  const friendIds = rawFriends.map((f) => f?.id).filter(Boolean) as string[]

  const { createClient } = await import("@/lib/supabase/server")
  const supabase = await createClient()

  let presenceMap: Record<string, string> = {}
  let xpMap: Record<string, number> = {}

  if (friendIds.length > 0) {
    const { data: presence } = await supabase
      .from("user_presence")
      .select("user_id, status")
      .in("user_id", friendIds)
    if (presence) {
      for (const p of presence) presenceMap[p.user_id as string] = p.status as string
    }

    const { data: xpRows } = await supabase
      .from("user_xp")
      .select("user_id, total_xp")
      .in("user_id", friendIds)
    if (xpRows) {
      for (const x of xpRows) xpMap[x.user_id as string] = (x.total_xp as number) || 0
    }
  }

  const friends = rawFriends.map((f) => {
    const fullName = [f?.first_name, f?.last_name].filter(Boolean).join(" ").trim()
    return {
      id: f?.id as string,
      name: f?.friendship?.nickname || fullName || "Ami",
      avatar_url: f?.avatar_url ?? null,
      status: presenceMap[f?.id] || "offline",
      xp: xpMap[f?.id] || 0,
      mutual: 0,
      mutual_calculated: false,
    }
  })

  return APIResponse.success({
    friends,
    total: friends.length,
    stats: json.stats ?? {
      total_friends: friends.length,
      pending_requests: 0,
      best_friends: 0,
    },
  })
}

/**
 * POST /api/teen/friends — send a friend request.
 * Body: { targetTeenId: string, message?: string }
 */
export async function POST(request: NextRequest) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") {
    return APIResponse.unauthorized()
  }
  const teenId = userInfo.teenData?.id
  if (!teenId) return APIResponse.error("Teen profile not found", 400)

  let body: any
  try {
    body = await request.json()
  } catch {
    return APIResponse.error("Invalid JSON body")
  }
  const targetTeenId: string | undefined = body?.targetTeenId || body?.friendId
  const message: string | undefined = body?.message

  if (!targetTeenId) return APIResponse.error("targetTeenId is required")
  if (targetTeenId === teenId) return APIResponse.error("Cannot friend yourself")

  return FriendHandlers.sendRequest(teenId, targetTeenId, message)
}
