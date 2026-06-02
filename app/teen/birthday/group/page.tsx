/**
 * /teen/birthday/group — Collective birthday (V6, issue #240).
 *
 * Server component: resolves everything the single-page collective-birthday
 * flow needs and hands it to the client:
 * - the teen's own anniv_orders (id, party_date, total_dh, status)
 * - their friends list (get_friends RPC + teens table, the existing source)
 * - their existing `anniv` group_actions (organized + invited) with rosters
 *   and, when finalized, attendee contributions.
 *
 * Flow lives on this one page: pick an order → invite friends (create) →
 * friends accept → organizer finalizes (split + size discount). If the teen
 * has no anniv_orders, the client shows an empty state pointing to /teen/birthday.
 *
 * Reads are direct-Supabase server-side (RLS scopes them to the teen), matching
 * the rides-groups pattern. Charte paper.
 */
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import {
  CollectiveBirthday,
  type AnnivOrderOption,
  type FriendOption,
  type GroupActionView,
} from "./client"

export const dynamic = "force-dynamic"

export default async function TeenCollectiveBirthdayPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/login")
  const supabase = await createClient()
  const teenId = userInfo.profileId

  // 1) The teen's own birthday orders (lean schema).
  const { data: orderRows } = await supabase
    .from("anniv_orders")
    .select("id, party_date, total_dh, status")
    .eq("teen_id", teenId)
    .order("party_date", { ascending: false })
  const orders = (orderRows ?? []) as AnnivOrderOption[]

  // 2) Friends source = get_friends RPC (friend_id rows) + teens table for names.
  let friends: FriendOption[] = []
  const { data: friendRows } = await supabase.rpc("get_friends", { p_teen_id: teenId })
  const friendIds = ((friendRows ?? []) as Array<{ friend_id?: string }>)
    .map((f) => f?.friend_id)
    .filter(Boolean) as string[]
  if (friendIds.length > 0) {
    const { data: details } = await supabase
      .from("teens")
      .select("id, first_name, last_name, avatar_url")
      .in("id", friendIds)
    friends = ((details ?? []) as Array<{
      id: string
      first_name: string | null
      last_name: string | null
      avatar_url: string | null
    }>).map((d) => ({
      id: d.id,
      name: [d.first_name, d.last_name].filter(Boolean).join(" ").trim() || "Ami",
      avatar_url: d.avatar_url,
    }))
  }

  // 3) The teen's existing `anniv` group_actions (organized + invited) + rosters.
  const { data: myInvites } = await supabase
    .from("group_action_invites")
    .select("group_action_id")
    .eq("teen_id", teenId)
  const actionIds = Array.from(
    new Set((myInvites ?? []).map((i) => i.group_action_id).filter(Boolean))
  ) as string[]

  let groups: GroupActionView[] = []
  if (actionIds.length > 0) {
    const { data: actions } = await supabase
      .from("group_actions")
      .select(
        "id, organizer_id, resource_id, title, status, max_size, total_coins, deadline, created_at"
      )
      .in("id", actionIds)
      .eq("action_type", "anniv")
      .order("created_at", { ascending: false })

    const annivIds = (actions ?? []).map((a) => a.id)

    type RosterRow = {
      id: string
      group_action_id: string
      teen_id: string
      status: string
      is_organizer: boolean
      share_coins: number | null
      teens: { id: string; first_name: string | null; last_name: string | null } | null
    }
    const { data: roster } = annivIds.length
      ? await supabase
          .from("group_action_invites")
          .select(
            "id, group_action_id, teen_id, status, is_organizer, share_coins, teens:teen_id (id, first_name, last_name)"
          )
          .in("group_action_id", annivIds)
      : { data: [] }
    const rosterRows = (roster ?? []) as unknown as RosterRow[]

    type AttendeeRow = {
      id: string
      group_action_id: string | null
      teen_id: string
      contribution_coins: number
      status: string
    }
    const { data: attendees } = annivIds.length
      ? await supabase
          .from("anniv_order_attendees")
          .select("id, group_action_id, teen_id, contribution_coins, status")
          .in("group_action_id", annivIds)
      : { data: [] }
    const attendeeRows = (attendees ?? []) as unknown as AttendeeRow[]

    groups = (actions ?? []).map((a) => {
      const invites = rosterRows
        .filter((r) => r.group_action_id === a.id)
        .map((r) => ({
          id: r.id,
          teen_id: r.teen_id,
          status: r.status,
          is_organizer: r.is_organizer,
          share_coins: r.share_coins,
          name:
            [r.teens?.first_name, r.teens?.last_name].filter(Boolean).join(" ").trim() ||
            (r.is_organizer ? "Organisateur" : "Ami"),
        }))
      return {
        id: a.id,
        title: a.title,
        status: a.status,
        max_size: a.max_size,
        resource_id: a.resource_id,
        total_coins: a.total_coins,
        is_organizer: a.organizer_id === teenId,
        my_status: invites.find((i) => i.teen_id === teenId)?.status ?? null,
        invites,
        attendees: attendeeRows
          .filter((at) => at.group_action_id === a.id)
          .map((at) => ({
            teen_id: at.teen_id,
            contribution_coins: at.contribution_coins,
            status: at.status,
          })),
      }
    })
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4 pt-6 md:p-8">
      <div>
        <Link
          href="/teen/birthday"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-mute hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Anniversaire
        </Link>
      </div>

      <div>
        <p className="eyebrow tracking-[0.16em] mb-1">Lifestyle</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Anniversaire <em className="font-semibold italic text-pink">collectif</em>
        </h1>
        <p className="mt-2 text-sm text-mute">
          Choisis une réservation d&apos;anniversaire, invite tes amis à participer et
          partagez la note : plus vous êtes nombreux, plus la remise est grande.
        </p>
      </div>

      <CollectiveBirthday orders={orders} friends={friends} groups={groups} />
    </div>
  )
}
