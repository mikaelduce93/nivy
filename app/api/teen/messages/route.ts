import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { APIResponse } from "../../lib/responses"

/**
 * /api/teen/messages — direct (1:1) messaging between accepted friends.
 *
 * GET  /api/teen/messages                     -> inbox: list of conversations.
 * GET  /api/teen/messages?conversationId=X    -> messages of a conversation.
 * POST /api/teen/messages                     -> send a message.
 *      body: { conversationId?, recipientId?, content }
 *
 * Friendship is enforced both in the application layer and via RLS on
 * `direct_conversations` / `direct_messages` (see migration 088).
 */

type DirectConversationRow = {
  id: string
  user1_id: string
  user2_id: string
  last_message: string | null
  last_message_at: string | null
  unread_count_user1: number
  unread_count_user2: number
}

export async function GET(request: NextRequest) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") return APIResponse.unauthorized()

  const teenId = userInfo.teenData?.id
  if (!teenId) return APIResponse.error("Teen profile not found", 400)

  const supabase = await createClient()
  const url = new URL(request.url)
  const conversationId = url.searchParams.get("conversationId")

  // ---- conversation messages -----------------------------------------------
  if (conversationId) {
    // RLS already restricts to participants; we double-check here for clarity.
    const { data: convo, error: convoError } = await supabase
      .from("direct_conversations")
      .select("id, user1_id, user2_id")
      .eq("id", conversationId)
      .maybeSingle()

    if (convoError) return APIResponse.serverError("Conversation lookup failed", convoError)
    if (!convo) return APIResponse.notFound("Conversation not found")
    if (convo.user1_id !== teenId && convo.user2_id !== teenId) {
      return APIResponse.forbidden()
    }

    const { data: messages, error: msgError } = await supabase
      .from("direct_messages")
      .select("id, conversation_id, sender_id, recipient_id, content, is_read, read_at, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(500)

    if (msgError) return APIResponse.serverError("Failed to fetch messages", msgError)

    // Mark inbound messages as read.
    await supabase
      .from("direct_messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("recipient_id", teenId)
      .eq("is_read", false)

    // Reset our side of the unread counter on the conversation.
    const isUser1 = convo.user1_id === teenId
    await supabase
      .from("direct_conversations")
      .update(isUser1 ? { unread_count_user1: 0 } : { unread_count_user2: 0 })
      .eq("id", conversationId)

    return APIResponse.success({ data: messages ?? [] })
  }

  // ---- inbox ---------------------------------------------------------------
  const { data: conversations, error } = await supabase
    .from("direct_conversations")
    .select("id, user1_id, user2_id, last_message, last_message_at, unread_count_user1, unread_count_user2")
    .or(`user1_id.eq.${teenId},user2_id.eq.${teenId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(100)

  if (error) return APIResponse.serverError("Failed to fetch inbox", error)

  const rows = (conversations ?? []) as DirectConversationRow[]
  const otherIds = rows.map((c) => (c.user1_id === teenId ? c.user2_id : c.user1_id))
  let nameMap: Record<string, { name: string; avatar: string | null }> = {}

  if (otherIds.length > 0) {
    const { data: peers } = await supabase
      .from("teens")
      .select("id, first_name, last_name, avatar_url")
      .in("id", otherIds)
    for (const p of peers ?? []) {
      const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || "Ami"
      nameMap[p.id as string] = { name: fullName, avatar: (p.avatar_url as string) ?? null }
    }
  }

  const inbox = rows.map((c) => {
    const otherId = c.user1_id === teenId ? c.user2_id : c.user1_id
    const isUser1 = c.user1_id === teenId
    const peer = nameMap[otherId] ?? { name: "Ami", avatar: null }
    return {
      id: c.id,
      name: peer.name,
      avatar_url: peer.avatar,
      lastMessage: c.last_message,
      lastMessageAt: c.last_message_at,
      unreadCount: isUser1 ? c.unread_count_user1 : c.unread_count_user2,
      isGroup: false,
      participantIds: [c.user1_id, c.user2_id],
      otherParticipantId: otherId,
      otherParticipantName: peer.name,
    }
  })

  return APIResponse.success({ conversations: inbox })
}

export async function POST(request: NextRequest) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") return APIResponse.unauthorized()

  const teenId = userInfo.teenData?.id
  if (!teenId) return APIResponse.error("Teen profile not found", 400)

  let body: any
  try {
    body = await request.json()
  } catch {
    return APIResponse.error("Invalid JSON body")
  }

  const content: string = (body?.content ?? "").toString().trim()
  const attachmentPath: string | null = body?.attachment_path ?? null
  const attachmentMime: string | null = body?.attachment_mime ?? null
  const attachmentSize: number | null = body?.attachment_size_bytes ?? null

  if (!content && !attachmentPath) {
    return APIResponse.error("content or attachment_path is required")
  }
  if (content && content.length > 4000) {
    return APIResponse.error("content too long (max 4000 chars)")
  }
  if (attachmentPath && attachmentSize && attachmentSize > 5 * 1024 * 1024) {
    return APIResponse.error("attachment exceeds 5 MB", 413)
  }

  let conversationId: string | null = body?.conversationId ?? null
  let recipientId: string | null = body?.recipientId ?? null

  const supabase = await createClient()

  // ---- Resolve / create the conversation -----------------------------------
  if (!conversationId && !recipientId) {
    return APIResponse.error("conversationId or recipientId is required")
  }

  if (conversationId) {
    const { data: convo, error } = await supabase
      .from("direct_conversations")
      .select("id, user1_id, user2_id")
      .eq("id", conversationId)
      .maybeSingle()
    if (error) return APIResponse.serverError("Conversation lookup failed", error)
    if (!convo) return APIResponse.notFound("Conversation not found")
    if (convo.user1_id !== teenId && convo.user2_id !== teenId) {
      return APIResponse.forbidden()
    }
    recipientId = convo.user1_id === teenId ? convo.user2_id : convo.user1_id
  } else if (recipientId) {
    if (recipientId === teenId) return APIResponse.error("Cannot message yourself")

    // Friendship gate (defence-in-depth alongside RLS).
    const { data: areFriends, error: friendCheckError } = await supabase.rpc("are_friends", {
      p_user1: teenId,
      p_user2: recipientId,
    })
    if (friendCheckError) {
      return APIResponse.serverError("Friendship check failed", friendCheckError)
    }
    if (!areFriends) {
      return APIResponse.forbidden("You can only message accepted friends")
    }

    const { data: convoId, error: ensureError } = await supabase.rpc(
      "ensure_direct_conversation",
      { p_self: teenId, p_other: recipientId }
    )
    if (ensureError || !convoId) {
      return APIResponse.serverError("Failed to open conversation", ensureError)
    }
    conversationId = convoId as string
  }

  if (!conversationId || !recipientId) {
    return APIResponse.error("Could not resolve conversation")
  }

  // ---- Block enforcement (canon §4) ----------------------------------------
  const { data: blockedEither } = await supabase.rpc("is_blocked_either", {
    p_a: teenId,
    p_b: recipientId,
  })
  if (blockedEither === true) {
    return APIResponse.forbidden("Tu ne peux pas envoyer de message à cette personne")
  }

  // ---- Mentor↔teen DM gate (canon §4) --------------------------------------
  // mentor_can_dm_teen returns true only when both parties are role=teen.
  // (Wave 2A stub; full mentor-authorization graph is Wave 2B.)
  const { data: dmAllowed } = await supabase.rpc("mentor_can_dm_teen", {
    p_mentor_id: teenId,
    p_teen_id: recipientId,
  })
  if (dmAllowed === false) {
    return APIResponse.forbidden("Échange non autorisé")
  }

  // ---- Insert the message --------------------------------------------------
  const { data: inserted, error: insertError } = await supabase
    .from("direct_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: teenId,
      recipient_id: recipientId,
      content: content || null,
      attachment_path: attachmentPath,
      attachment_mime: attachmentMime,
      attachment_size_bytes: attachmentSize,
    })
    .select("id, conversation_id, sender_id, recipient_id, content, attachment_path, attachment_mime, is_read, created_at")
    .single()

  if (insertError) return APIResponse.serverError("Failed to send message", insertError)

  // ---- Update conversation preview + unread counter ------------------------
  const { data: convo } = await supabase
    .from("direct_conversations")
    .select("user1_id, user2_id, unread_count_user1, unread_count_user2")
    .eq("id", conversationId)
    .single()

  if (convo) {
    const recipientIsUser1 = convo.user1_id === recipientId
    const previewSource = content || (attachmentPath ? "[pièce jointe]" : "")
    const update: Record<string, any> = {
      last_message: previewSource.slice(0, 200),
      last_message_at: new Date().toISOString(),
      last_sender_id: teenId,
      updated_at: new Date().toISOString(),
    }
    if (recipientIsUser1) {
      update.unread_count_user1 = (convo.unread_count_user1 ?? 0) + 1
    } else {
      update.unread_count_user2 = (convo.unread_count_user2 ?? 0) + 1
    }
    await supabase.from("direct_conversations").update(update).eq("id", conversationId)
  }

  // ---- Notify recipient (canonical user_notifications) ---------------------
  await supabase
    .from("user_notifications")
    .insert({
      user_id: recipientId,
      title: "Nouveau message",
      body: `${userInfo.fullName} t'a envoyé un message`,
      data: {
        conversation_id: conversationId,
        sender_id: teenId,
        sender_name: userInfo.fullName,
      },
      is_read: false,
      created_at: new Date().toISOString(),
    })
    .then(() => undefined, () => undefined)

  return APIResponse.success({ data: inserted, conversationId })
}
