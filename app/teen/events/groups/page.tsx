/**
 * /teen/events/groups — Group event booking hub (V6, issue #237, Flow B).
 *
 * Lists:
 * - bookable events (the teen's own created events + public published ones) with
 *   a « Réserver en groupe » entry point that opens a group_action for the event,
 * - « Mes réservations organisées » (the teen's `event` group_actions as organizer),
 * - « Invitations reçues » (the teen's `event` group_actions as invitee).
 *
 * Reads events + group_actions + group_action_invites server-side (RLS lets the
 * teen read their own). Friends come from get_friends (+ teens names) for the
 * StartGroupBooking picker. Charte paper : StickerCard + pills mono.
 */
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"
import Link from "next/link"
import { Plus, CalendarDays, ArrowLeft } from "lucide-react"
import { StartGroupBooking, type FriendOption, type BookableEvent } from "./start-booking"

export const dynamic = "force-dynamic"

const GROUP_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Brouillon", cls: "bg-muted text-mute border-ink" },
  forming: { label: "En préparation", cls: "bg-gold/15 text-ink border-ink" },
  confirmed: { label: "Confirmée", cls: "bg-teal/15 text-ink border-ink" },
  completed: { label: "Réservée", cls: "bg-lime/15 text-ink border-ink" },
  cancelled: { label: "Annulée", cls: "bg-muted text-mute border-ink" },
}

interface GroupAction {
  id: string
  organizer_id: string
  title: string | null
  status: string
  max_size: number | null
  deadline: string | null
  created_at: string
}

interface InviteRow {
  group_action_id: string
  status: string
}

const fmtDate = (iso: string | null) => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function TeenEventGroupsPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/login")
  const supabase = await createClient()
  const teenId = userInfo.profileId
  const nowIso = new Date().toISOString()

  // --- Bookable events: teen's own + public published (future) ---------------
  const { data: publicEvents } = await supabase
    .from("events")
    .select("id, title, starts_at, event_date, city, price_coins, capacity, created_by, status")
    .eq("status", "published")
    .gte("event_date", nowIso)
    .order("event_date", { ascending: true })
    .limit(50)

  const { data: ownEvents } = await supabase
    .from("events")
    .select("id, title, starts_at, event_date, city, price_coins, capacity, created_by, status")
    .eq("created_by", teenId)
    .order("created_at", { ascending: false })
    .limit(50)

  type EventRow = {
    id: string
    title: string | null
    starts_at: string | null
    event_date: string | null
    city: string | null
    price_coins: number | null
    capacity: number | null
    created_by: string | null
    status: string
  }
  const eventById = new Map<string, EventRow>()
  for (const e of [...((ownEvents ?? []) as EventRow[]), ...((publicEvents ?? []) as EventRow[])]) {
    if (!eventById.has(e.id)) eventById.set(e.id, e)
  }
  const bookable: BookableEvent[] = Array.from(eventById.values()).map((e) => ({
    id: e.id,
    title: e.title || "Évènement",
    when: e.starts_at ?? e.event_date,
    city: e.city,
    price_coins: e.price_coins ?? 0,
    mine: e.created_by === teenId,
  }))

  // --- Friends for the invite picker -----------------------------------------
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
    }))
  }

  // --- The teen's event group_actions ----------------------------------------
  const { data: myInvites } = await supabase
    .from("group_action_invites")
    .select("group_action_id")
    .eq("teen_id", teenId)

  const actionIds = Array.from(
    new Set((myInvites ?? []).map((i) => i.group_action_id).filter(Boolean))
  ) as string[]

  let actions: GroupAction[] = []
  let roster: InviteRow[] = []
  if (actionIds.length > 0) {
    const { data: act } = await supabase
      .from("group_actions")
      .select("id, organizer_id, title, status, max_size, deadline, created_at")
      .in("id", actionIds)
      .eq("action_type", "event")
      .order("created_at", { ascending: false })
    actions = (act ?? []) as GroupAction[]

    const { data: r } = await supabase
      .from("group_action_invites")
      .select("group_action_id, status")
      .in("group_action_id", actionIds)
    roster = (r ?? []) as InviteRow[]
  }

  const acceptedCount = (id: string) =>
    roster.filter((i) => i.group_action_id === id && i.status === "accepted").length
  const totalCount = (id: string) =>
    roster.filter((i) => i.group_action_id === id).length

  const organized = actions.filter((a) => a.organizer_id === teenId)
  const invited = actions.filter((a) => a.organizer_id !== teenId)

  return (
    <div className="container mx-auto max-w-3xl space-y-8 p-4 pt-6 md:p-8">
      <div>
        <Link
          href="/teen/events"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-mute hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Évènements
        </Link>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-pink/20">
            <CalendarDays className="h-7 w-7 text-ink" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="eyebrow tracking-[0.16em]">Évènements</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">
              Réservez <em className="font-semibold italic text-pink">ensemble</em>
            </h1>
            <p className="mt-1 text-sm text-mute">
              Choisis un évènement, invite tes amis et payez chacun votre place
              remisée selon le nombre de participants.
            </p>
          </div>
        </div>
        <Link href="/teen/events/new" className="shrink-0">
          <Button variant="pink" className="min-h-11">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Créer un évènement</span>
            <span className="sm:hidden">Créer</span>
          </Button>
        </Link>
      </div>

      {/* Start a group booking */}
      <section className="space-y-3">
        <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
          Ouvrir une réservation groupée
        </h2>
        {bookable.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Aucun évènement à réserver"
            description="Crée ton propre évènement ou attends qu'un évènement public soit publié pour ouvrir une réservation groupée."
            action={
              <Button asChild variant="pink" className="min-h-11">
                <Link href="/teen/events/new">Créer un évènement</Link>
              </Button>
            }
          />
        ) : (
          <StartGroupBooking events={bookable} friends={friends} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
          Mes réservations organisées
        </h2>
        {organized.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Aucune réservation organisée"
            description="Ouvre une réservation groupée ci-dessus pour réserver un évènement avec tes amis et débloquer une remise selon le nombre de participants."
          />
        ) : (
          <div className="space-y-3">
            {organized.map((a) => (
              <GroupRow
                key={a.id}
                action={a}
                accepted={acceptedCount(a.id)}
                total={totalCount(a.id)}
                role="organizer"
                fmtDeadline={fmtDate(a.deadline)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
          Invitations reçues
        </h2>
        {invited.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Aucune invitation"
            description="Quand un ami t'invite à réserver un évènement, elle apparaît ici pour que tu acceptes ou refuses."
          />
        ) : (
          <div className="space-y-3">
            {invited.map((a) => (
              <GroupRow
                key={a.id}
                action={a}
                accepted={acceptedCount(a.id)}
                total={totalCount(a.id)}
                role="invitee"
                fmtDeadline={fmtDate(a.deadline)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function GroupRow({
  action,
  accepted,
  total,
  role,
  fmtDeadline,
}: {
  action: GroupAction
  accepted: number
  total: number
  role: "organizer" | "invitee"
  fmtDeadline: string | null
}) {
  const status = GROUP_STATUS[action.status] ?? {
    label: action.status,
    cls: "bg-muted text-mute border-ink",
  }
  return (
    <Link href={`/teen/events/groups/${action.id}`} className="block">
      <StickerCard variant="hover" className="gap-0 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 break-words text-sm font-bold text-ink">
              {action.title || "Réservation sans titre"}
            </p>
            <div className="mt-1 font-mono text-xs text-mute">
              {[
                role === "organizer" ? "Organisateur" : "Invité",
                `${accepted}/${total} confirmés`,
                `max ${action.max_size ?? "—"}`,
                ...(fmtDeadline ? [`avant ${fmtDeadline}`] : []),
              ].join(" · ")}
            </div>
          </div>
          <span
            className={`inline-flex shrink-0 items-center rounded-full border-2 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${status.cls}`}
          >
            {status.label}
          </span>
        </div>
      </StickerCard>
    </Link>
  )
}
