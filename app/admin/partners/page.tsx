/**
 * Wave C.7 — Admin partner KYC moderation queue.
 *
 * Server component: queries `partners` (pending / in_review) + their
 * `kyc_documents`. Documents are stored in the PRIVATE `kyc-documents`
 * Storage bucket — we generate a 15-min signed URL server-side and pass
 * it to the row component so admins can click through to inspect.
 *
 * Mutations live in:
 *   - POST /api/admin/partners/:id/approve
 *   - POST /api/admin/partners/:id/reject
 */
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { PartnerReviewRow } from "./partner-review-row"
import { NivEmpty } from "@/components/brand"
import { StatCard } from "@/components/admin/stat-card"
import BackButton from "@/components/admin/BackButton"

export const dynamic = "force-dynamic"

const ADMIN_ROLES = new Set(["admin", "super_admin", "moderator"])
const PENDING_STATUSES = ["pending", "in_review"]
const SIGNED_URL_TTL_SECONDS = 60 * 15 // 15 minutes per spec

export default async function AdminPartnersPage() {
  // 1. Auth + admin gate (defense-in-depth; middleware also gates /admin/*)
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
        <h1 className="mb-2 text-2xl font-bold text-ink">Partenaires · KYC</h1>
        <p className="text-destructive">Accès refusé — rôle administrateur requis.</p>
      </main>
    )
  }

  // 2. Counters
  const { data: counters } = await sr
    .from("partners")
    .select("status")
    .returns<Array<{ status: string }>>()
  const stats = {
    total: counters?.length ?? 0,
    pending: counters?.filter((p) => p.status === "pending").length ?? 0,
    in_review: counters?.filter((p) => p.status === "in_review").length ?? 0,
    active: counters?.filter((p) => p.status === "active").length ?? 0,
    rejected: counters?.filter((p) => p.status === "rejected").length ?? 0,
  }

  // 3. Pending queue
  const { data: pending } = await sr
    .from("partners")
    .select("id, company_name, partner_type, sub_category, email, status, created_at, updated_at")
    .in("status", PENDING_STATUSES)
    .order("created_at", { ascending: true })
    .limit(50)

  const partnerIds = (pending ?? []).map((p) => p.id)

  // 4. Documents (only for the visible queue)
  const { data: docs } = partnerIds.length
    ? await sr
        .from("kyc_documents")
        .select("id, partner_id, doc_type, file_path, status, subject_kind, created_at")
        .in("partner_id", partnerIds)
        .order("created_at", { ascending: true })
    : { data: [] }

  // 5. Sign every doc once (15 min). Group by partner.
  const docsByPartner = new Map<
    string,
    Array<{
      id: string
      doc_type: string
      status: string
      subject_kind: string | null
      signedUrl: string | null
    }>
  >()

  for (const d of docs ?? []) {
    if (!d.partner_id) continue // nullable en base ; exclu de fait par le filtre .in() ci-dessus
    const { data: signed } = await sr.storage
      .from("kyc-documents")
      .createSignedUrl(d.file_path, SIGNED_URL_TTL_SECONDS)
    const list = docsByPartner.get(d.partner_id) ?? []
    list.push({
      id: d.id,
      doc_type: d.doc_type,
      status: d.status,
      subject_kind: d.subject_kind ?? null,
      signedUrl: signed?.signedUrl ?? null,
    })
    docsByPartner.set(d.partner_id, list)
  }

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <BackButton href="/admin" />

      <header className="mb-8">
        <span className="eyebrow tracking-[0.16em] text-mute">Partenaires · KYC</span>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink">
          Dossiers <em className="font-semibold italic text-pink">KYC</em> partenaires
        </h1>
        <p className="mt-1 text-sm text-mute">
          Valide les dossiers KYC. Les pièces justificatives sont signées 15 min.
        </p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="En attente" value={stats.pending} tone="gold" />
        <StatCard label="En révision" value={stats.in_review} tone="teal" />
        <StatCard label="Approuvés" value={stats.active} tone="lime" />
        <StatCard label="Rejetés" value={stats.rejected} tone="coral" />
        <StatCard label="Total" value={stats.total} tone="paper" />
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-extrabold tracking-tight text-ink">
          File en attente ({pending?.length ?? 0})
        </h2>

        {!pending || pending.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Aucun dossier en attente"
            description="Aucun partenaire en attente d'approbation pour le moment."
          />
        ) : (
          <ul className="space-y-3">
            {(pending ?? []).map((p) => (
              <PartnerReviewRow
                key={p.id}
                partner={{
                  id: p.id,
                  company_name: p.company_name,
                  partner_type: p.partner_type,
                  sub_category: p.sub_category,
                  email: p.email,
                  status: p.status,
                  created_at: p.created_at,
                }}
                documents={docsByPartner.get(p.id) ?? []}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
