/**
 * /teen/venues/[id] — Partner venue detail (V6, issue #238).
 *
 * Server component: loads the venue (partners WHERE partner_type='venue') and
 * its active slots (venue_slots), plus the teen's friends for the invite picker.
 * Renders the venue, its slots with remaining capacity, and VenueReserveActions
 * (client): create a group, preview the size discount, accept/decline invites,
 * and (organizer) reserve a slot for the group via reserve_group_venue_slot.
 */
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StickerCard } from "@/components/ui/sticker-card"
import Link from "next/link"
import { ArrowLeft, MapPin } from "lucide-react"
import { VenueReserveActions, type FriendOption, type SlotOption } from "./reserve-client"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VenueDetailPage({ params }: PageProps) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/login")
  const { id } = await params
  const supabase = await createClient()
  const teenId = userInfo.profileId

  const { data: venue } = await supabase
    .from("partners")
    .select("id, company_name, description, sub_category")
    .eq("id", id)
    .eq("partner_type", "venue")
    .eq("status", "active")
    .maybeSingle()

  if (!venue) notFound()

  // venue_slots may legitimately have no rows yet → empty state is expected.
  const { data: slotRows } = await supabase
    .from("venue_slots")
    .select("id, title, starts_at, capacity, booked, price_coins")
    .eq("partner_id", id)
    .eq("is_active", true)
    .order("starts_at", { ascending: true })
  const slots = (slotRows ?? []) as SlotOption[]

  // Friends source = get_friends RPC (friend_id rows) + teens table for names
  // (same source as the rides UI).
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

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4 pt-6 md:p-8">
      <div>
        <Link
          href="/teen/venues"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-mute hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Lieux
        </Link>
      </div>

      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-pink/20">
          <MapPin className="h-7 w-7 text-ink" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="eyebrow tracking-[0.16em]">Lieu partenaire</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            {venue.company_name}
          </h1>
          {venue.sub_category && (
            <p className="mt-1 font-mono text-xs text-mute">{venue.sub_category}</p>
          )}
        </div>
      </div>

      {venue.description && (
        <StickerCard variant="panel" className="p-4">
          <p className="text-sm text-ink">{venue.description}</p>
        </StickerCard>
      )}

      <VenueReserveActions slots={slots} friends={friends} />
    </div>
  )
}
