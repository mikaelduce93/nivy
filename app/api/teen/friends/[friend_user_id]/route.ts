/**
 * DELETE /api/teen/friends/[friend_user_id] — unfriend.
 *
 * Canon §3 actions table + §8 APIs index + §11 row 4 (MISSING — must build).
 */
import { NextRequest } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { APIResponse } from "../../../lib/responses"
import { FriendHandlers } from "../handlers"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ friend_user_id: string }> }
) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") return APIResponse.unauthorized()

  const teenId = userInfo.teenData?.id
  if (!teenId) return APIResponse.error("Teen profile not found", 400)

  const { friend_user_id } = await params
  if (!friend_user_id) return APIResponse.error("friend_user_id required")

  return FriendHandlers.remove(teenId, friend_user_id)
}
