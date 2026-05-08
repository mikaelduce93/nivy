import { NextRequest } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { APIResponse } from "../../../lib/responses"
import { FriendHandlers } from "../handlers"

/**
 * GET /api/teen/friends/requests
 *   ?direction=incoming (default) | outgoing
 *   ?limit=50
 *
 * Returns the list of pending friend requests for the calling teen.
 */
export async function GET(request: NextRequest) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") {
    return APIResponse.unauthorized()
  }
  const teenId = userInfo.teenData?.id
  if (!teenId) return APIResponse.error("Teen profile not found", 400)

  const url = new URL(request.url)
  const direction = url.searchParams.get("direction") ?? "incoming"
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50) || 50, 100)

  if (direction === "outgoing") return FriendHandlers.sent(teenId, limit)
  return FriendHandlers.requests(teenId, limit)
}
