/**
 * GET /api/teen/friends/search?q=…&limit=20
 *
 * Wave 2A — canonical teen-search route. Returns matches by `pseudo` (and
 * fallback first/last name) for the calling teen. Excludes blocked-either
 * users. Adult-teen mixing rejected at handler layer (FriendHandlers.search
 * already operates within `teens` only).
 *
 * Canon: docs/canon/social-feed.locked.md §3 + §8 ("Search teens" row).
 */
import { NextRequest } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { APIResponse } from "../../../lib/responses"
import { FriendHandlers } from "../handlers"

export async function GET(request: NextRequest) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") return APIResponse.unauthorized()

  const teenId = userInfo.teenData?.id
  if (!teenId) return APIResponse.error("Teen profile not found", 400)

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") || "").trim()
  const limit = Math.min(Number(searchParams.get("limit") || 20) || 20, 50)

  return FriendHandlers.search(teenId, q, limit)
}
