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
 * List all conversations for the currently authenticated teen.
 * Reads from the teen_conversations table (participant1_id / participant2_id columns).
 * Returns [] when the user has no conversations or is unauthenticated.
 */
export async function getConversations(): Promise<Conversation[]> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from("teen_conversations")
      .select("id, participant1_id, participant2_id, last_message, last_message_at, unread_count, is_group, group_name")
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("getConversations error:", error)
      return []
    }

    // Collect all unique other-participant IDs for a single name lookup
    const otherIds = (data || [])
      .map((c: any) =>
        c.participant1_id === user.id ? c.participant2_id : c.participant1_id
      )
      .filter(Boolean)

    let nameMap: Record<string, string> = {}
    if (otherIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", otherIds)

      for (const p of profiles || []) {
        if (p.id && p.full_name) nameMap[p.id] = p.full_name
      }
    }

    return (data || []).map((c: any) => {
      const otherId =
        c.participant1_id === user.id ? c.participant2_id : c.participant1_id
      return {
        id: c.id as string,
        name: c.is_group ? (c.group_name ?? "Groupe") : (nameMap[otherId] ?? "Utilisateur"),
        lastMessage: c.last_message ?? null,
        lastMessageAt: c.last_message_at ?? null,
        unreadCount: c.unread_count ?? 0,
        isGroup: !!c.is_group,
        participantIds: [c.participant1_id, c.participant2_id].filter(Boolean),
        otherParticipantName: c.is_group ? null : (nameMap[otherId] ?? null),
        otherParticipantId: c.is_group ? null : otherId,
      }
    })
  } catch (err) {
    console.error("getConversations unexpected error:", err)
    return []
  }
}
