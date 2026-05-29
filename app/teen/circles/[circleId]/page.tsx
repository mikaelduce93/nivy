import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CircleChatClient } from "./circle-chat-client"

/**
 * #60 — Circle detail / chat route. Mounts the previously-orphaned CircleChat
 * component (backend: circles / circle_members / circle_messages + the
 * send_circle_message / *_reaction RPCs, all live). Only an active member of
 * the circle may open it.
 */
export default async function CircleDetailPage({
  params,
}: {
  params: Promise<{ circleId: string }>
}) {
  const { circleId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Must be an active member to view the chat (mirrors the API authz).
  const { data: membership } = await supabase
    .from("circle_members")
    .select("id")
    .eq("circle_id", circleId)
    .eq("teen_id", user.id)
    .eq("status", "active")
    .maybeSingle()

  if (!membership) {
    // Not a member (or circle doesn't exist) — send back to the list.
    redirect("/teen/circles")
  }

  const { data: circle } = await supabase
    .from("circles")
    .select("id, name, description, avatar_url, theme_color, emoji")
    .eq("id", circleId)
    .maybeSingle()

  if (!circle) notFound()

  const { count: memberCount } = await supabase
    .from("circle_members")
    .select("id", { count: "exact", head: true })
    .eq("circle_id", circleId)
    .eq("status", "active")

  const circleInfo = {
    id: circle.id,
    name: circle.name,
    description: circle.description ?? undefined,
    avatar_url: circle.avatar_url ?? undefined,
    theme_color: circle.theme_color ?? "#6366f1",
    emoji: circle.emoji ?? undefined,
    member_count: memberCount ?? 0,
  }

  return <CircleChatClient circleId={circleId} teenId={user.id} circleInfo={circleInfo} />
}
