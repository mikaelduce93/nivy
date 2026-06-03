/**
 * /teen/food/groups — Group food orders hub (V6, issue #236).
 *
 * Lists the teen's food group_actions split into:
 * - « Mes commandes organisées » (organizer)
 * - « Invitations reçues » (invitee)
 *
 * Reads group_actions + group_action_invites server-side (RLS lets the teen
 * read their own as organizer/participant), mirroring the rides group hub.
 * Charte paper : StickerCard + pills mono.
 */
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"
import Link from "next/link"
import { Plus, Users, ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

// Ton FR + couleur charte par statut de group_action.
const GROUP_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Brouillon", cls: "bg-muted text-mute border-ink" },
  forming: { label: "En préparation", cls: "bg-gold/15 text-ink border-ink" },
  confirmed: { label: "Confirmée", cls: "bg-teal/15 text-ink border-ink" },
  completed: { label: "Terminée", cls: "bg-lime/15 text-ink border-ink" },
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

export default async function TeenFoodGroupsPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/login")
  const supabase = await createClient()
  const teenId = userInfo.profileId

  // Invites the teen is part of (organizer auto-gets an is_organizer invite).
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
      .eq("action_type", "food")
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
    <div className="container mx-auto space-y-8 pt-6">
      <div>
        <Link
          href="/teen/food"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-mute hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Food
        </Link>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-coral/20">
            <Users className="h-7 w-7 text-ink" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="eyebrow tracking-[0.16em]">Food à plusieurs</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">
              Vos <em className="font-semibold italic text-pink">commandes</em>
            </h1>
            <p className="mt-1 text-sm text-mute">
              Commande groupée : invite tes amis, plus vous êtes nombreux, plus la
              remise est grande, et chacun paie sa part.
            </p>
          </div>
        </div>
        <Link href="/teen/food/groups/new" className="shrink-0">
          <Button variant="pink" className="min-h-11">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nouvelle commande</span>
            <span className="sm:hidden">Créer</span>
          </Button>
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
          Mes commandes organisées
        </h2>
        {organized.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Aucune commande organisée"
            description="Crée une commande groupée pour réunir tes amis sur un resto et débloquer une remise selon le nombre de participants."
            action={
              <Button asChild variant="pink" className="min-h-11">
                <Link href="/teen/food/groups/new">Nouvelle commande</Link>
              </Button>
            }
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
            description="Quand un ami t'invite à une commande groupée, elle apparaît ici pour que tu acceptes ou refuses."
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
}: {
  action: GroupAction
  accepted: number
  total: number
  role: "organizer" | "invitee"
}) {
  const status = GROUP_STATUS[action.status] ?? {
    label: action.status,
    cls: "bg-muted text-mute border-ink",
  }
  return (
    <Link href={`/teen/food/groups/${action.id}`} className="block">
      <StickerCard variant="hover" className="gap-0 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 break-words text-sm font-bold text-ink">
              {action.title || "Commande sans titre"}
            </p>
            <div className="mt-1 font-mono text-xs text-mute">
              {[
                role === "organizer" ? "Organisateur" : "Invité",
                `${accepted}/${total} confirmés`,
                `max ${action.max_size ?? "—"}`,
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
