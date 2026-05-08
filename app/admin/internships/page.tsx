/**
 * V1.1 P2.5 — Admin internship moderation queue.
 *
 * Server component: lists internships with status filter (open / closed /
 * archived). Admin can post a new internship via the inline form (calls
 * POST /api/admin/internships) and close an open internship (calls
 * POST /api/admin/internships/:id/close).
 *
 * Note: "archived" is not in the underlying CHECK constraint
 * (status ∈ draft|open|closed|filled|cancelled per migration 059), so we
 * map "archived" → cancelled+filled in the UI filter.
 *
 * Defense-in-depth: middleware also gates /admin/*, but we double-check
 * admin_roles here.
 */
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { H1, H2 } from "@/components/ui/headings"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"
import { InternshipForm } from "./internship-form"
import { CloseInternshipButton } from "./internship-form"
import { EmptyState } from "@/components/ui/states/empty-state"
import { Briefcase } from "lucide-react"

function internshipStatusVariant(status: string): StatusVariant {
  switch (status) {
    case "open":
      return "success"
    case "closed":
    case "filled":
      return "info"
    case "cancelled":
      return "danger"
    default:
      return "neutral"
  }
}

export const dynamic = "force-dynamic"

const ADMIN_ROLES = new Set(["admin", "super_admin", "moderator"])

interface InternshipRow {
  id: string
  partner_id: string | null
  title: string
  description: string | null
  duration: string
  age_min: number
  age_max: number
  application_deadline: string | null
  spots_total: number
  spots_taken: number
  paid: boolean
  stipend_dh: number | string | null
  status: string
  created_at: string
}

interface PartnerLite {
  id: string
  company_name: string
}

type StatusFilter = "open" | "closed" | "archived"

const STATUS_FILTER_MAP: Record<StatusFilter, string[]> = {
  open: ["open"],
  closed: ["closed", "filled"],
  archived: ["cancelled", "draft"],
}

export default async function AdminInternshipsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const sp = await searchParams
  const rawStatus = (sp.status ?? "open").toLowerCase()
  const statusFilter: StatusFilter =
    rawStatus === "closed" || rawStatus === "archived" ? (rawStatus as StatusFilter) : "open"

  // 1. Auth + admin gate
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
        <H1 className="mb-2 text-2xl">Stages</H1>
        <p className="text-destructive">Accès refusé — rôle administrateur requis.</p>
      </main>
    )
  }

  // 2. Counters
  const { data: counters } = await sr
    .from("internships")
    .select("status")
    .returns<Array<{ status: string }>>()
  const stats = {
    total: counters?.length ?? 0,
    open: counters?.filter((c) => c.status === "open").length ?? 0,
    closed: counters?.filter((c) => c.status === "closed" || c.status === "filled").length ?? 0,
    archived: counters?.filter((c) => c.status === "cancelled" || c.status === "draft").length ?? 0,
  }

  // 3. Filtered list
  const { data: internships } = await sr
    .from("internships")
    .select(
      "id, partner_id, title, description, duration, age_min, age_max, application_deadline, spots_total, spots_taken, paid, stipend_dh, status, created_at",
    )
    .in("status", STATUS_FILTER_MAP[statusFilter])
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<InternshipRow[]>()

  // 4. Partner names for display + form options
  const partnerIds = Array.from(
    new Set((internships ?? []).map((i) => i.partner_id).filter((p): p is string => !!p)),
  )

  const partnersById = new Map<string, PartnerLite>()
  if (partnerIds.length) {
    const { data: parts } = await sr
      .from("partners")
      .select("id, company_name")
      .in("id", partnerIds)
      .returns<PartnerLite[]>()
    for (const p of parts ?? []) partnersById.set(p.id, p)
  }

  // Active partners for the new-internship form (cap to 200)
  const { data: activePartners } = await sr
    .from("partners")
    .select("id, company_name")
    .eq("status", "active")
    .order("company_name", { ascending: true })
    .limit(200)
    .returns<PartnerLite[]>()

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
        <H1>Stages · Modération</H1>
        <p className="mt-1 text-sm text-muted-foreground">
          Publiez et fermez les offres de stage. Les candidatures se gèrent depuis chaque stage.
        </p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} tone="neutral" />
        <StatCard label="Ouverts" value={stats.open} tone="success" />
        <StatCard label="Fermés" value={stats.closed} tone="info" />
        <StatCard label="Archivés" value={stats.archived} tone="neutral" />
      </section>

      <section className="mb-10">
        <H2 className="mb-3 text-base">Publier un nouveau stage</H2>
        <InternshipForm partners={activePartners ?? []} />
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <H2 className="text-base">
            Stages ({internships?.length ?? 0})
          </H2>
          <nav className="flex gap-1 text-xs">
            {(["open", "closed", "archived"] as StatusFilter[]).map((s) => (
              <Link
                key={s}
                href={`/admin/internships?status=${s}`}
                className={`rounded px-3 py-1 ${
                  statusFilter === s
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {s === "open" ? "Ouverts" : s === "closed" ? "Fermés" : "Archivés"}
              </Link>
            ))}
          </nav>
        </div>

        {(!internships || internships.length === 0) && (
          <EmptyState
            size="small"
            icon={Briefcase}
            title="Aucun stage"
            description="Aucun stage dans cette catégorie."
          />
        )}

        <ul className="space-y-3">
          {(internships ?? []).map((i) => {
            const partner = i.partner_id ? partnersById.get(i.partner_id) ?? null : null
            return (
              <li
                key={i.id}
                className="rounded border border-border bg-card p-4"
              >
                <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-foreground">{i.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {partner?.company_name ?? "(partenaire inconnu)"} · {i.duration}
                    </div>
                    <div className="text-xs text-muted-foreground/80">
                      Publié le {new Date(i.created_at).toLocaleString("fr-FR")}
                    </div>
                  </div>
                  <StatusBadge
                    variant={internshipStatusVariant(i.status)}
                    label={i.status}
                    size="sm"
                  />
                </header>

                {i.description && (
                  <p className="mb-3 line-clamp-3 rounded bg-background px-3 py-2 text-xs text-foreground/90">
                    {i.description}
                  </p>
                )}

                <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <Field label="Tranche d'âge">
                    {i.age_min}-{i.age_max} ans
                  </Field>
                  <Field label="Places">
                    {i.spots_taken}/{i.spots_total}
                  </Field>
                  <Field label="Rémunéré">
                    {i.paid ? `Oui${i.stipend_dh ? ` (${Number(i.stipend_dh)} DH)` : ""}` : "Non"}
                  </Field>
                  <Field label="Deadline">
                    {i.application_deadline
                      ? new Date(i.application_deadline).toLocaleDateString("fr-FR")
                      : "—"}
                  </Field>
                </div>

                {i.status === "open" && (
                  <div className="flex flex-wrap gap-2">
                    <CloseInternshipButton id={i.id} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded bg-background px-2 py-1">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-foreground/90">{children}</div>
    </div>
  )
}

type StatTone = "neutral" | "info" | "success"

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
    info: "border-info/30 bg-info/10 text-info",
    success: "border-success/30 bg-success/10 text-success",
  }
  return (
    <div className={`rounded border p-3 ${palette[tone]}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  )
}
