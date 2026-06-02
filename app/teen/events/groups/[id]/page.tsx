/**
 * /teen/events/groups/[id] — Group event booking detail (V6, issue #237).
 *
 * Server component: loads the `event` group_action, its roster (invites joined
 * to teen names) and the linked event (via group_action.resource_id). Renders:
 * - the event summary (title / date / city / price per place),
 * - the roster (accepted / pending) with status pills,
 * - GroupEventActions (client): discount preview, accept/decline (invitee),
 *   and « Finaliser la réservation » (organizer → finalize_group_event_booking).
 */
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StickerCard } from "@/components/ui/sticker-card"
import Link from "next/link"
import { ArrowLeft, CalendarDays } from "lucide-react"
import { GroupEventActions } from "./actions-client"

export const dynamic = "force-dynamic"

const INVITE_STATUS: Record<string, { label: string; cls: string }> = {
  accepted: { label: "Confirmé", cls: "bg-lime/15 text-ink border-ink" },
  pending: { label: "En attente", cls: "bg-gold/15 text-ink border-ink" },
  declined: { label: "Refusé", cls: "bg-muted text-mute border-ink" },
  expired: { label: "Expiré", cls: "bg-muted text-mute border-ink" },
}

const GROUP_STATUS: Record<string, string> = {
  draft: "Brouillon",
  forming: "En préparation",
  confirmed: "Confirmée",
  completed: "Réservée",
  cancelled: "Annulée",
}

interface PageProps {
  params: Promise<{ id: string }>
}

const fmtWhen = (iso: string | null) => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function GroupEventDetailPage({ params }: PageProps) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/login")
  const { id } = await params
  const supabase = await createClient()
  const teenId = userInfo.profileId

  const { data: action } = await supabase
    .from("group_actions")
    .select(
      "id, organizer_id, action_type, title, status, max_size, total_coins, resource_id, deadline, created_at"
    )
    .eq("id", id)
    .eq("action_type", "event")
    .maybeSingle()

  if (!action) notFound()

  // Linked event (resource_id), if set.
  type EventRow = {
    id: string
    title: string | null
    starts_at: string | null
    event_date: string | null
    city: string | null
    price_coins: number | null
    capacity: number | null
    status: string
  }
  let event: EventRow | null = null
  if (action.resource_id) {
    const { data: ev } = await supabase
      .from("events")
      .select("id, title, starts_at, event_date, city, price_coins, capacity, status")
      .eq("id", action.resource_id)
      .maybeSingle()
    event = (ev ?? null) as EventRow | null
  }

  const { data: invites } = await supabase
    .from("group_action_invites")
    .select(
      "id, teen_id, status, is_organizer, share_coins, expires_at, teens:teen_id (id, first_name, last_name, avatar_url)"
    )
    .eq("group_action_id", id)

  type InviteWithTeen = {
    id: string
    teen_id: string
    status: string
    is_organizer: boolean
    share_coins: number | null
    expires_at: string | null
    teens: { id: string; first_name: string | null; last_name: string | null } | null
  }
  const roster = (invites ?? []) as unknown as InviteWithTeen[]

  const isOrganizer = action.organizer_id === teenId
  const myInvite = roster.find((r) => r.teen_id === teenId) ?? null
  const accepted = roster.filter((r) => r.status === "accepted")
  const pending = roster.filter((r) => r.status === "pending")

  const teenName = (r: InviteWithTeen) =>
    [r.teens?.first_name, r.teens?.last_name].filter(Boolean).join(" ").trim() ||
    (r.is_organizer ? "Organisateur" : "Ami")

  const eventWhen = fmtWhen(event?.starts_at ?? event?.event_date ?? null)

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4 pt-6 md:p-8">
      <div>
        <Link
          href="/teen/events/groups"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-mute hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Réservations groupées
        </Link>
      </div>

      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-pink/20">
          <CalendarDays className="h-7 w-7 text-ink" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="eyebrow tracking-[0.16em]">
            Réservation · {GROUP_STATUS[action.status] ?? action.status}
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            {action.title || "Réservation sans titre"}
          </h1>
          <p className="mt-1 font-mono text-xs text-mute">
            {accepted.length}/{roster.length} confirmés · max {action.max_size ?? "—"}
            {isOrganizer ? " · tu es l'organisateur" : ""}
          </p>
        </div>
      </div>

      {/* Event summary */}
      {event && (
        <StickerCard variant="panel" className="gap-1 p-4">
          <p className="font-display text-lg font-extrabold text-ink">
            {event.title || "Évènement"}
          </p>
          <p className="font-mono text-sm text-ink">
            {[eventWhen, event.city].filter(Boolean).join(" · ") || "Date à venir"}
          </p>
          <p className="font-mono text-sm text-ink">
            Place :{" "}
            <strong className="text-pink">
              {(event.price_coins ?? 0) > 0 ? `${event.price_coins} coins ⊙` : "Gratuit"}
            </strong>
            {event.capacity != null ? ` · capacité ${event.capacity}` : ""}
          </p>
        </StickerCard>
      )}

      {/* Roster */}
      <section className="space-y-3">
        <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
          Participants
        </h2>
        <StickerCard className="divide-y-2 divide-ink/10 p-0">
          {roster.length === 0 ? (
            <p className="p-4 text-sm text-mute">Aucun participant pour l&apos;instant.</p>
          ) : (
            roster.map((r) => {
              const st = INVITE_STATUS[r.status] ?? {
                label: r.status,
                cls: "bg-muted text-mute border-ink",
              }
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">
                      {teenName(r)}
                      {r.is_organizer ? (
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.1em] text-pink">
                          organisateur
                        </span>
                      ) : null}
                    </p>
                    {r.share_coins != null ? (
                      <p className="font-mono text-xs text-mute">
                        Part : {r.share_coins} coins ⊙
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full border-2 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${st.cls}`}
                  >
                    {st.label}
                  </span>
                </div>
              )
            })
          )}
        </StickerCard>
      </section>

      <GroupEventActions
        groupActionId={action.id}
        eventId={action.resource_id ?? null}
        status={action.status}
        isOrganizer={isOrganizer}
        myInviteStatus={myInvite?.status ?? null}
        acceptedCount={accepted.length}
        pendingCount={pending.length}
      />
    </div>
  )
}
