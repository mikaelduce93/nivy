import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { APIResponse } from "../../../lib/responses"

/**
 * GET /api/teen/messages/[conversationId]
 *   Convenience alias of GET /api/teen/messages?conversationId=…
 *   Returns full message history for the calling teen + marks inbound as read.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") return APIResponse.unauthorized()

  const teenId = userInfo.teenData?.id
  if (!teenId) return APIResponse.error("Teen profile not found", 400)

  const { conversationId } = await params
  if (!conversationId) return APIResponse.error("conversationId required")

  const supabase = await createClient()

  const { data: convo, error: convoError } = await supabase
    .from("direct_conversations")
    .select("id, user1_id, user2_id")
    .eq("id", conversationId)
    .maybeSingle()
  if (convoError) return APIResponse.serverError("Conversation lookup failed", convoError)
  if (!convo) return APIResponse.notFound("Conversation not found")
  if (convo.user1_id !== teenId && convo.user2_id !== teenId) return APIResponse.forbidden()

  const { data: messages, error } = await supabase
    .from("direct_messages")
    .select("id, conversation_id, sender_id, recipient_id, content, is_read, read_at, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500)

  if (error) return APIResponse.serverError("Failed to fetch messages", error)

  await supabase
    .from("direct_messages")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("recipient_id", teenId)
    .eq("is_read", false)

  const isUser1 = convo.user1_id === teenId
  await supabase
    .from("direct_conversations")
    .update(isUser1 ? { unread_count_user1: 0 } : { unread_count_user2: 0 })
    .eq("id", conversationId)

  return APIResponse.success({ data: messages ?? [] })
}
