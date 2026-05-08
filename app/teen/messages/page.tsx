import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { Suspense } from "react"
import { MessagesClient } from "./messages-client"
import { createClient } from "@/lib/supabase/server"

/**
 * /teen/messages — direct (1:1) inbox.
 *
 * Reads `direct_conversations` for the authenticated teen and resolves the
 * peer's display name + avatar from the `teens` table. The conversation list
 * is rendered server-side; the client opens a thread via /api/teen/messages
 * and posts new messages to the same endpoint.
 */
async function loadInbox(teenId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("direct_conversations")
      .select(
        "id, user1_id, user2_id, last_message, last_message_at, unread_count_user1, unread_count_user2"
      )
      .or(`user1_id.eq.${teenId},user2_id.eq.${teenId}`)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(50)

    if (error || !data) return []

    const peerIds = data
      .map((c: any) => (c.user1_id === teenId ? c.user2_id : c.user1_id))
      .filter(Boolean) as string[]

    let nameMap: Record<string, string> = {}
    if (peerIds.length > 0) {
      const { data: peers } = await supabase
        .from("teens")
        .select("id, first_name, last_name")
        .in("id", peerIds)
      for (const p of peers ?? []) {
        const n = [p.first_name, p.last_name].filter(Boolean).join(" ").trim()
        if (p.id) nameMap[p.id as string] = n || "Ami"
      }
    }

    return data.map((c: any) => {
      const otherId: string = c.user1_id === teenId ? c.user2_id : c.user1_id
      const isUser1 = c.user1_id === teenId
      return {
        id: c.id as string,
        name: nameMap[otherId] ?? "Ami",
        lastMessage: (c.last_message as string) ?? null,
        lastMessageAt: (c.last_message_at as string) ?? null,
        unreadCount: (isUser1 ? c.unread_count_user1 : c.unread_count_user2) ?? 0,
        isGroup: false,
        participantIds: [c.user1_id, c.user2_id].filter(Boolean) as string[],
        otherParticipantName: nameMap[otherId] ?? null,
        otherParticipantId: otherId,
      }
    })
  } catch {
    return []
  }
}

export default async function MessagesPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  const teenId = userInfo.teenData?.id ?? userInfo.profileId
  const conversations = await loadInbox(teenId)

  const props = JSON.parse(JSON.stringify({ conversations }))

  return (
    <div className="min-h-screen pb-32">
      <Suspense fallback={<MessagesSkeleton />}>
        <MessagesClient
          conversations={props.conversations}
          currentUserId={teenId}
        />
      </Suspense>
    </div>
  )
}

function MessagesSkeleton() {
  return (
    <div className="space-y-4 pt-6 animate-pulse">
      <div className="h-14 bg-zinc-800/50 rounded-2xl w-64" />
      <div className="h-12 bg-zinc-800/30 rounded-xl" />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-20 bg-zinc-800/30 rounded-2xl" />
      ))}
    </div>
  )
}
