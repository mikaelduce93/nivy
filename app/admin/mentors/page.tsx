/**
 * V1.1 P2.5 — Admin mentor moderation queue.
 *
 * Server component: lists mentors awaiting KYC approval + active mentors.
 * KYC documents are stored in the PRIVATE `kyc-documents` Storage bucket,
 * keyed by `kyc_documents.owner_user_id` (mentor side, see migration 059
 * §0). We sign URLs server-side with a 15-minute TTL using the service-role
 * client and pass them to the client row component for inspection.
 *
 * Mutations:
 *   - POST /api/admin/mentors/:id/approve  (existing, calls admin_approve_mentor RPC)
 *   - POST /api/admin/mentors/:id/reject   (FLAG: not yet implemented — see report)
 *
 * Defense-in-depth: middleware also gates /admin/*, but we double-check
 * admin_roles here (matching app/admin/partners + app/admin/proofs).
 */
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { H1, H2 } from "@/components/ui/headings"
import { MentorReviewRow } from "./mentor-review-row"
import { EmptyState } from "@/components/ui/states/empty-state"
import { GraduationCap } from "lucide-react"

export const dynamic = "force-dynamic"

const ADMIN_ROLES = new Set(["admin", "super_admin", "moderator"])
const SIGNED_URL_TTL_SECONDS = 60 * 15 // 15 minutes per spec

interface MentorRow {
  id: string
  user_id: string | null
  expertise_tags: string[] | null
  years_experience: number | null
  bio: string | null
  hourly_rate_dh: number | string | null
  age_min_mentee: number | null
  age_max_mentee: number | null
  status: string
  kyc_status: string
  rating: number | string | null
  sessions_count: number | null
  created_at: string
}

interface ProfileLite {
  id: string
  full_name: string | null
  email: string | null
}

interface KycDocRow {
  id: string
  owner_user_id: string | null
  doc_type: string
  file_path: string
  status: string
  subject_kind: string | null
  created_at: string
}

export default async function AdminMentorsPage() {
  // 1. Auth + admin gate (defense-in-depth; middleware already gates /admin/*)
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
        <H1 className="mb-2 text-2xl">Mentors · KYC</H1>
        <p className="text-destructive">Accès refusé — rôle administrateur requis.</p>
      </main>
    )
  }

  // 2. Counters
  const { data: counters } = await sr
    .from("mentors")
    .select("status, kyc_status")
    .returns<Array<{ status: string; kyc_status: string }>>()
  const stats = {
    total: counters?.length ?? 0,
    pending: counters?.filter((m) => m.kyc_status === "pending").length ?? 0,
    active: counters?.filter((m) => m.status === "active").length ?? 0,
    rejected: counters?.filter((m) => m.kyc_status === "rejected" || m.status === "rejected").length ?? 0,
    paused: counters?.filter((m) => m.status === "paused" || m.status === "suspended").length ?? 0,
  }

  // 3. Pending queue (KYC pending) + active mentors
  const { data: pending } = await sr
    .from("mentors")
    .select(
      "id, user_id, expertise_tags, years_experience, bio, hourly_rate_dh, age_min_mentee, age_max_mentee, status, kyc_status, rating, sessions_count, created_at",
    )
    .eq("kyc_status", "pending")
    .order("created_at", { ascending: true })
    .limit(50)
    .returns<MentorRow[]>()

  const { data: activeList } = await sr
    .from("mentors")
    .select(
      "id, user_id, expertise_tags, years_experience, bio, hourly_rate_dh, age_min_mentee, age_max_mentee, status, kyc_status, rating, sessions_count, created_at",
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<MentorRow[]>()

  const allMentors = [...(pending ?? []), ...(activeList ?? [])]
  const userIds = Array.from(
    new Set(allMentors.map((m) => m.user_id).filter((u): u is string => !!u)),
  )

  // 4. Fetch profile names + emails
  const profilesById = new Map<string, ProfileLite>()
  if (userIds.length) {
    const { data: profs } = await sr
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds)
      .returns<ProfileLite[]>()
    for (const p of profs ?? []) profilesById.set(p.id, p)
  }

  // 5. Documents — only for the visible queue (pending + active)
  const docsByUser = new Map<
    string,
    Array<{ id: string; doc_type: string; status: string; signedUrl: string | null }>
  >()
  if (userIds.length) {
    const { data: docs } = await sr
      .from("kyc_documents")
      .select("id, owner_user_id, doc_type, file_path, status, subject_kind, created_at")
      .in("owner_user_id", userIds)
      .eq("subject_kind", "mentor")
      .order("created_at", { ascending: true })
      .returns<KycDocRow[]>()

    for (const d of docs ?? []) {
      if (!d.owner_user_id) continue
      const { data: signed } = await sr.storage
        .from("kyc-documents")
        .createSignedUrl(d.file_path, SIGNED_URL_TTL_SECONDS)
      const list = docsByUser.get(d.owner_user_id) ?? []
      list.push({
        id: d.id,
        doc_type: d.doc_type,
        status: d.status,
        signedUrl: signed?.signedUrl ?? null,
      })
      docsByUser.set(d.owner_user_id, list)
    }
  }

  function buildView(m: MentorRow) {
    const profile = m.user_id ? profilesById.get(m.user_id) ?? null : null
    return {
      id: m.id,
      user_id: m.user_id,
      full_name: profile?.full_name ?? null,
      email: profile?.email ?? null,
      expertise_tags: m.expertise_tags ?? [],
      years_experience: m.years_experience ?? null,
      bio: m.bio ?? null,
      hourly_rate_dh:
        m.hourly_rate_dh == null ? null : Number(m.hourly_rate_dh),
      age_min_mentee: m.age_min_mentee ?? null,
      age_max_mentee: m.age_max_mentee ?? null,
      status: m.status,
      kyc_status: m.kyc_status,
      rating: m.rating == null ? null : Number(m.rating),
      sessions_count: m.sessions_count ?? 0,
      created_at: m.created_at,
      documents: m.user_id ? docsByUser.get(m.user_id) ?? [] : [],
    }
  }

  const pendingView = (pending ?? []).map(buildView)
  const activeView = (activeList ?? []).map(buildView)

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Retour
        </Link>
      </div>

      <header className="mb-8">
        <H1>Mentors · KYC</H1>
        <p className="mt-1 text-sm text-muted-foreground">
          Validez les dossiers mentors. Les pièces justificatives sont signées 15 min.
        </p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Total" value={stats.total} tone="neutral" />
        <StatCard label="En attente" value={stats.pending} tone="warning" />
        <StatCard label="Actifs" value={stats.active} tone="success" />
        <StatCard label="Pause/susp." value={stats.paused} tone="info" />
        <StatCard label="Rejetés" value={stats.rejected} tone="danger" />
      </section>

      <section className="mb-10">
        <H2 className="mb-3 text-base">
          File en attente ({pendingView.length})
        </H2>

        {pendingView.length === 0 && (
          <EmptyState
            size="small"
            icon={GraduationCap}
            title="Aucun mentor en attente"
            description="Aucun mentor en attente d'approbation."
          />
        )}

        <ul className="space-y-3">
          {pendingView.map((m) => (
            <MentorReviewRow key={m.id} mentor={m} actionable />
          ))}
        </ul>
      </section>

      <section>
        <H2 className="mb-3 text-base">
          Mentors actifs ({activeView.length})
        </H2>

        {activeView.length === 0 && (
          <p className="rounded border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Aucun mentor actif.
          </p>
        )}

        <ul className="space-y-3">
          {activeView.map((m) => (
            <MentorReviewRow key={m.id} mentor={m} actionable={false} />
          ))}
        </ul>
      </section>
    </main>
  )
}

type StatTone = "neutral" | "warning" | "info" | "success" | "danger"

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: StatTone
}) {
  const palette: Record<StatTone, string> = {
    neutral: "border-border bg-card text-muted-foreground",
    warning: "border-warning/30 bg-warning/10 text-warning",
    info: "border-info/30 bg-info/10 text-info",
    success: "border-success/30 bg-success/10 text-success",
    danger: "border-destructive/30 bg-destructive/10 text-destructive",
  }
  return (
    <div className={`rounded border p-3 ${palette[tone]}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  )
}
