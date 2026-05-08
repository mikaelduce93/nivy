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
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { PartnerReviewRow } from "./partner-review-row"
import { EmptyState } from "@/components/ui/states/empty-state"
import { Store } from "lucide-react"

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
        <h1 className="mb-2 text-2xl font-bold text-white">Partenaires · KYC</h1>
        <p className="text-red-400">Accès refusé — rôle administrateur requis.</p>
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
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin"
          className="text-sm text-zinc-400 underline-offset-4 hover:text-white hover:underline"
        >
          ← Retour
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Partenaires · KYC</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Validez les dossiers KYC. Les pièces justificatives sont signées 15 min.
        </p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Total" value={stats.total} tone="zinc" />
        <StatCard label="En attente" value={stats.pending} tone="yellow" />
        <StatCard label="En révision" value={stats.in_review} tone="blue" />
        <StatCard label="Approuvés" value={stats.active} tone="green" />
        <StatCard label="Rejetés" value={stats.rejected} tone="red" />
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-white">
          File en attente ({pending?.length ?? 0})
        </h2>

        {(!pending || pending.length === 0) && (
          <EmptyState
            size="small"
            icon={Store}
            title="Aucun partenaire en attente"
            description="Aucun partenaire en attente d'approbation."
          />
        )}

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
      </section>
    </main>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "zinc" | "yellow" | "blue" | "green" | "red"
}) {
  const palette: Record<typeof tone, string> = {
    zinc: "border-zinc-800 bg-zinc-900 text-zinc-300",
    yellow: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    blue: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    green: "border-green-500/30 bg-green-500/10 text-green-300",
    red: "border-red-500/30 bg-red-500/10 text-red-300",
  }
  return (
    <div className={`rounded border p-3 ${palette[tone]}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  )
}
