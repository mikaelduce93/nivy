import { NextRequest } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { APIResponse } from "../../../../../lib/responses"
import { FriendHandlers } from "../../../handlers"

/**
 * POST /api/teen/friends/requests/[id]/accept
 * Accepts the friend request whose id is in the path. The path parameter is
 * the friend_requests row id, not the sender id.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") {
    return APIResponse.unauthorized()
  }
  const teenId = userInfo.teenData?.id
  if (!teenId) return APIResponse.error("Teen profile not found", 400)

  const { id } = await params
  if (!id) return APIResponse.error("Request id required")

  return FriendHandlers.accept(teenId, id)
}
