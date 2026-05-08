"use server"

import { createClient } from "@/lib/supabase/server"

export interface Conversation {
  id: string
  name: string
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
  isGroup: boolean
  participantIds: string[]
  otherParticipantName: string | null
  otherParticipantId: string | null
}

/**
 * List all 1:1 conversations for the currently authenticated teen.
 *
 * Reads from the `direct_conversations` table (TICKET-046, migration 088).
 * Returns [] when the user has no conversations or is unauthenticated.
 *
 * NOTE: this used to read `teen_conversations` which was never declared in the
 * migration history. The page that consumed it (`app/teen/messages/page.tsx`)
 * now resolves the inbox inline; this helper is kept exported for historical
 * compatibility but routed at the new schema.
 */
export async function getConversations(): Promise<Conversation[]> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from("direct_conversations")
      .select(
        "id, user1_id, user2_id, last_message, last_message_at, unread_count_user1, unread_count_user2"
      )
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(50)

    if (error) {
      console.error("getConversations error:", error)
      return []
    }

    const otherIds = (data || [])
      .map((c: any) => (c.user1_id === user.id ? c.user2_id : c.user1_id))
      .filter(Boolean)

    let nameMap: Record<string, string> = {}
    if (otherIds.length > 0) {
      const { data: profiles } = await supabase
        .from("teens")
        .select("id, first_name, last_name")
        .in("id", otherIds)

      for (const p of profiles || []) {
        const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ").trim()
        if (p.id) nameMap[p.id as string] = fullName || "Ami"
      }
    }

    return (data || []).map((c: any) => {
      const otherId = c.user1_id === user.id ? c.user2_id : c.user1_id
      const isUser1 = c.user1_id === user.id
      return {
        id: c.id as string,
        name: nameMap[otherId] ?? "Ami",
        lastMessage: c.last_message ?? null,
        lastMessageAt: c.last_message_at ?? null,
        unreadCount: (isUser1 ? c.unread_count_user1 : c.unread_count_user2) ?? 0,
        isGroup: false,
        participantIds: [c.user1_id, c.user2_id].filter(Boolean),
        otherParticipantName: nameMap[otherId] ?? null,
        otherParticipantId: otherId,
      }
    })
  } catch (err) {
    console.error("getConversations unexpected error:", err)
    return []
  }
}
