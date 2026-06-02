/**
 * /teen/food/groups/[id] — Group food order detail (V6, issue #236).
 *
 * Server component: loads the group_action, its roster (group_action_invites
 * joined to teen names), the list of food partners (for the organizer's resto
 * picker) and any already-finalized food_order. Renders:
 * - roster (accepted / pending) with status pills
 * - GroupFoodActions (client): discount preview, accept/decline (invitee), and
 *   the organizer finalize flow (pick resto → build menu cart → finalize).
 */
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { StickerCard } from "@/components/ui/sticker-card"
import Link from "next/link"
import { ArrowLeft, Users } from "lucide-react"
import { GroupFoodActions, type PartnerOption } from "./actions-client"

export const dynamic = "force-dynamic"

const FOOD_PARTNER_CATEGORIES = [
  "restaurant",
  "cafe",
  "bakery",
  "fast_food",
  "catering",
  "grocery",
] as const

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
  completed: "Terminée",
  cancelled: "Annulée",
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function GroupFoodDetailPage({ params }: PageProps) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/login")
  const { id } = await params
  const supabase = await createClient()
  const teenId = userInfo.profileId

  const { data: action } = await supabase
    .from("group_actions")
    .select(
      "id, organizer_id, action_type, title, status, max_size, total_coins, deadline, created_at"
    )
    .eq("id", id)
    .eq("action_type", "food")
    .maybeSingle()

  if (!action) notFound()

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

  // Already-finalized order tied to this group_action (empty until finalize).
  const { data: order } = await supabase
    .from("food_orders")
    .select("id, total_coins, status, delivery_type")
    .eq("group_action_id", id)
    .maybeSingle()

  // Food partners for the organizer's resto picker (service-role, like /teen/food).
  let partners: PartnerOption[] = []
  if (isOrganizer) {
    const admin = createServiceRoleClient()
    const { data: parts } = await admin
      .from("partners")
      .select("id, company_name, sub_category")
      .eq("status", "active")
      .in("sub_category", FOOD_PARTNER_CATEGORIES as unknown as string[])
      .order("company_name", { ascending: true })
    partners = ((parts ?? []) as Array<{
      id: string
      company_name: string
      sub_category: string | null
    }>).map((p) => ({
      id: p.id,
      name: p.company_name,
      sub_category: p.sub_category,
    }))
  }

  const teenName = (r: InviteWithTeen) =>
    [r.teens?.first_name, r.teens?.last_name].filter(Boolean).join(" ").trim() ||
    (r.is_organizer ? "Organisateur" : "Ami")

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4 pt-6 md:p-8">
      <div>
        <Link
          href="/teen/food/groups"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-mute hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Commandes
        </Link>
      </div>

      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-coral/20">
          <Users className="h-7 w-7 text-ink" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="eyebrow tracking-[0.16em]">
            Commande · {GROUP_STATUS[action.status] ?? action.status}
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            {action.title || "Commande sans titre"}
          </h1>
          <p className="mt-1 font-mono text-xs text-mute">
            {accepted.length}/{roster.length} confirmés · max {action.max_size ?? "—"}
            {isOrganizer ? " · tu es l'organisateur" : ""}
          </p>
        </div>
      </div>

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
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 p-4"
                >
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

      <GroupFoodActions
        groupActionId={action.id}
        status={action.status}
        isOrganizer={isOrganizer}
        myInviteStatus={myInvite?.status ?? null}
        acceptedCount={accepted.length}
        pendingCount={pending.length}
        partners={partners}
        existingOrder={
          order
            ? {
                id: order.id as string,
                total_coins: (order.total_coins as number | null) ?? 0,
                status: (order.status as string | null) ?? "",
                delivery_type: (order.delivery_type as string | null) ?? "",
              }
            : null
        }
      />
    </div>
  )
}
