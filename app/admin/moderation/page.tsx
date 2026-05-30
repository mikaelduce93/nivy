/**
 * Wave 4A — unified admin moderation inbox (canon §3).
 *
 * Single page at /admin/moderation. Reads from canonical moderation_queue
 * (filtered by content_type via ?type=…) and enriches with user_reports
 * counts where available. No mock rows. Empty state is honest.
 *
 * Permission gate: `content.view` (moderator + admin + super_admin) per
 * canon §1 capability matrix.
 */
import Link from "next/link"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getAdminInfo } from "@/lib/auth/admin-permissions"
import { adapterFor, listSupportedContentTypes } from "@/lib/admin/moderation-adapters"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldAlert, ShieldCheck } from "lucide-react"
import { EmptyState } from "@/components/ui/states/empty-state"
import { ModerationDecisionRow } from "./moderation-decision-row"

export const dynamic = "force-dynamic"

const FILTERS = [
  { key: "pending", label: "En attente", statuses: ["pending"] },
  { key: "actioned", label: "Actionnés", statuses: ["rejected", "approved", "escalated"] },
  { key: "all", label: "Tous", statuses: ["pending", "rejected", "approved", "escalated"] },
] as const
type FilterKey = (typeof FILTERS)[number]["key"]

interface PageProps {
  searchParams: Promise<{ type?: string; filter?: FilterKey }>
}

interface QueueRow {
  id: string
  content_type: string
  content_id: string | null
  status: string
  reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  payload: Record<string, unknown> | null
}

export default async function AdminModerationPage({ searchParams }: PageProps) {
  const admin = await getAdminInfo()
  if (!admin) redirect("/auth/login")
  if (!admin.permissions["content.view"]) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-bold text-ink">Modération</h1>
        <p className="text-destructive">Accès refusé — permission `content.view` requise.</p>
      </main>
    )
  }

  const { type, filter } = await searchParams
  const activeFilter: FilterKey = (FILTERS.find((f) => f.key === filter)?.key ?? "pending")
  const filterDef = FILTERS.find((f) => f.key === activeFilter)!

  const sr = createServiceRoleClient()

  // Counters per content_type (pending only).
  const { data: countersRaw } = await sr
    .from("moderation_queue")
    .select("content_type, status")
    .eq("status", "pending")
    .limit(2000)
  const counters = new Map<string, number>()
  for (const r of (countersRaw ?? []) as Array<{ content_type: string }>) {
    counters.set(r.content_type, (counters.get(r.content_type) ?? 0) + 1)
  }
  const totalPending = (countersRaw ?? []).length

  // Fetch the visible queue rows, filtered.
  let q = sr
    .from("moderation_queue")
    .select("id, content_type, content_id, status, reason, reviewed_by, reviewed_at, created_at, payload")
    .in("status", filterDef.statuses)
    .order("created_at", { ascending: true })
    .limit(100)
  if (type) q = q.eq("content_type", type)
  const { data: rowsRaw } = await q
  const rows: QueueRow[] = (rowsRaw ?? []) as unknown as QueueRow[]

  // Aggregate user_reports counts per (content_type, content_id) for the
  // visible rows so the moderator sees how many independent reporters
  // flagged the same item.
  const reportCounts = new Map<string, number>()
  if (rows.length > 0) {
    const ids = rows.map((r) => r.content_id).filter(Boolean) as string[]
    if (ids.length > 0) {
      const { data: reports } = await sr
        .from("user_reports")
        .select("target_type, target_id")
        .in("target_id", ids)
      for (const r of (reports ?? []) as Array<{ target_type: string; target_id: string }>) {
        const k = `${r.target_type}:${r.target_id}`
        reportCounts.set(k, (reportCounts.get(k) ?? 0) + 1)
      }
    }
  }

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-black text-ink flex items-center gap-3">
          <ShieldAlert className="w-7 h-7 text-gold" />
          Modération
          <Badge className="bg-gold/20 text-gold">{totalPending} en attente</Badge>
        </h1>
        <p className="text-mute text-sm mt-1">
          Inbox unifié — moderation_queue source de vérité. Décisions auditées.
        </p>
      </header>

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const params = new URLSearchParams()
          params.set("filter", f.key)
          if (type) params.set("type", type)
          const isActive = activeFilter === f.key
          return (
            <Link
              key={f.key}
              href={`/admin/moderation?${params.toString()}`}
              className={
                "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider " +
                (isActive
                  ? "bg-gold/20 text-gold ring-1 ring-gold/40"
                  : "bg-card text-mute hover:text-ink ring-1 ring-line")
              }
            >
              {f.label}
            </Link>
          )
        })}
        <span className="mx-2 text-ink">·</span>
        <ContentTypeFilters activeType={type ?? null} counters={counters} activeFilter={activeFilter} />
      </div>

      {/* Decision rows */}
      {rows.length === 0 ? (
        <Card className="bg-card border-ink">
          <CardContent className="p-10">
            <EmptyState
              icon={ShieldCheck}
              title="File vide"
              description={
                activeFilter === "pending"
                  ? "Aucun item en attente. Bonne nouvelle."
                  : "Aucun item ne correspond à ce filtre."
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink text-base">
              {rows.length} {rows.length === 1 ? "item" : "items"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={null}>
              <ul className="space-y-3">
                {rows.map((r) => {
                  const adapter = adapterFor(r.content_type)
                  const repCount = r.content_id
                    ? reportCounts.get(`${r.content_type}:${r.content_id}`) ?? 0
                    : 0
                  return (
                    <ModerationDecisionRow
                      key={r.id}
                      row={r}
                      contentLabel={adapter?.label ?? r.content_type}
                      supported={!!adapter}
                      reportCount={repCount}
                    />
                  )
                })}
              </ul>
            </Suspense>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-mute">
        Décisions canoniques: dismiss · hide · delete · restore · escalate · warn · suspend.
        warn et suspend agissent sur l&apos;utilisateur (à brancher Wave 4A.2). Les types non
        supportés renvoient 409 unsupported_action — pas de fake success.
      </p>
    </main>
  )
}

function ContentTypeFilters({
  activeType,
  counters,
  activeFilter,
}: {
  activeType: string | null
  counters: Map<string, number>
  activeFilter: FilterKey
}) {
  const supported = listSupportedContentTypes()
  // Surface every type that has at least one pending row, plus the supported
  // adapter types so admins can pre-select even when zero pending.
  const types = Array.from(new Set([...counters.keys(), ...supported])).sort()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/admin/moderation?filter=${activeFilter}`}
        className={
          "rounded-full px-3 py-1 text-xs font-medium " +
          (!activeType
            ? "bg-teal/20 text-teal ring-1 ring-teal/40"
            : "bg-card text-mute hover:text-ink ring-1 ring-line")
        }
      >
        Tous types
      </Link>
      {types.map((t) => {
        const params = new URLSearchParams()
        params.set("filter", activeFilter)
        params.set("type", t)
        const isActive = activeType === t
        return (
          <Link
            key={t}
            href={`/admin/moderation?${params.toString()}`}
            className={
              "rounded-full px-3 py-1 text-xs font-medium " +
              (isActive
                ? "bg-teal/20 text-teal ring-1 ring-teal/40"
                : "bg-card text-mute hover:text-ink ring-1 ring-line")
            }
          >
            {t}
            {(counters.get(t) ?? 0) > 0 && (
              <span className="ml-1 text-gold">{counters.get(t)}</span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
