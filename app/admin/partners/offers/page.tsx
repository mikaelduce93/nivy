/**
 * Wave 3A.5 — admin offer-moderation queue (canon §4.1).
 *
 * Lists all partner offers in `status='pending_approval'` and exposes
 * approve/reject buttons that hit POST /api/admin/partners/offers/:id/decision.
 * The route writes audit_log; on approve it flips both status and is_active,
 * which the DB CHECK constraint requires together (canon §3.2 invariant).
 */
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NivEmpty } from "@/components/brand"
import { StatCard } from "@/components/admin/stat-card"
import BackButton from "@/components/admin/BackButton"
import { OfferDecisionRow } from "./offer-decision-row"

export const dynamic = "force-dynamic"

const ADMIN_ROLES = new Set(["admin", "super_admin", "moderator"])

export default async function AdminPartnerOffersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const sr = createServiceRoleClient()
  const { data: role } = await sr
    .from("admin_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!role || !ADMIN_ROLES.has(role.role)) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-2 text-2xl font-bold text-ink">Modération des offres</h1>
        <p className="text-destructive">Accès refusé — rôle administrateur requis.</p>
      </main>
    )
  }

  type PendingOffer = {
    id: string
    partner_id: string
    title: string
    description: string | null
    offer_type: string | null
    discount_value: number | string | null
    discount_type: string | null
    min_purchase_amount: number | string | null
    max_discount_amount: number | string | null
    valid_from: string | null
    valid_until: string | null
    status: string
    is_active: boolean
    created_at: string
  }

  const { data: pendingRaw } = await sr
    .from("partner_offers")
    .select(
      "id, partner_id, title, description, offer_type, discount_value, discount_type, " +
        "min_purchase_amount, max_discount_amount, valid_from, valid_until, status, is_active, created_at",
    )
    .eq("status", "pending_approval")
    .order("created_at", { ascending: true })
    .limit(100)
  const pending: PendingOffer[] = (pendingRaw ?? []) as unknown as PendingOffer[]

  type PartnerLite = { id: string; company_name: string; partner_type: string }
  const partnerIds = Array.from(new Set(pending.map((o) => o.partner_id))).filter(Boolean)
  const { data: partnersRaw } = partnerIds.length
    ? await sr
        .from("partners")
        .select("id, company_name, partner_type")
        .in("id", partnerIds)
    : { data: [] as PartnerLite[] }
  const partners: PartnerLite[] = (partnersRaw ?? []) as unknown as PartnerLite[]
  const partnerById = new Map(partners.map((p) => [p.id, p]))

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <BackButton href="/admin/partners" label="Retour partenaires" />

      <header className="mb-8">
        <span className="eyebrow tracking-[0.16em] text-mute">Partenaires · Offres</span>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink">
          Offres en <em className="font-semibold italic text-pink">attente</em>
        </h1>
        <p className="mt-1 text-sm text-mute">
          Chaque nouvelle offre partenaire arrive ici avant publication. Approuver l&apos;active
          côté ado immédiatement.
        </p>
      </header>

      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        <StatCard label="En attente" value={pending.length} tone="gold" />
        <StatCard label="Partenaires" value={partnerIds.length} tone="teal" />
        <StatCard label="À traiter" value={pending.length} tone="coral" />
      </section>

      {pending.length === 0 ? (
        <NivEmpty
          mood="proud"
          title="Tout est traité, le crew assure"
          description="Toutes les offres soumises ont été traitées."
        />
      ) : (
        <ul className="space-y-3">
          {pending.map((offer) => (
            <OfferDecisionRow
              key={offer.id}
              offer={offer as any}
              partner={partnerById.get(offer.partner_id) ?? null}
            />
          ))}
        </ul>
      )}
    </main>
  )
}
