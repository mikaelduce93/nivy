/**
 * Polish-E — /admin/tag-normalize
 *
 * Admin queue for unmapped free-text tags surfaced by the
 * `cron.tag_normalize` job (W-D.11 / TICKET-040, see
 * app/api/cron/tag-normalize/route.ts).
 *
 * Source of data:
 *   - Latest `admin_audit_logs` row with `action = 'cron.tag_normalize'`,
 *     payload contains `report[].unmapped_sample[].{tag,count}`.
 *   - Existing `tag_aliases` rows decorate each entry with a current
 *     status/canonical so admins can re-decide.
 *
 * Actions per row are POSTed to /api/admin/tag-aliases.
 *
 * Auth: admin / super_admin / moderator (admin_roles).
 */
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { TagAliasRow } from "./tag-alias-row"

export const dynamic = "force-dynamic"

const ADMIN_ROLES = new Set(["admin", "super_admin", "moderator"])
const TOP_N = 50

interface UnmappedSampleEntry {
  tag: string
  count: number
}

interface ReportTable {
  table?: string
  unmapped_sample?: unknown
}

interface CronPayload {
  dry_run?: boolean
  totals?: Record<string, number>
  report?: ReportTable[]
  duration_ms?: number
}

interface AggRow {
  alias: string
  count: number
  tables: string[]
  existing_status: "pending" | "approved" | "rejected" | null
  existing_canonical: string | null
  suggested_canonical: string | null
}

/** Naive suggestion: pick the canonical tag that shares the most
 *  characters with the alias (case-insensitive substring/prefix). Used
 *  only as a UI hint — admin still confirms. */
function suggestCanonical(alias: string, taxonomy: string[]): string | null {
  if (!alias) return null
  const a = alias.toLowerCase().replace(/[^a-z0-9]/g, "")
  let best: string | null = null
  let bestScore = 0
  for (const t of taxonomy) {
    const tn = t.toLowerCase().replace(/[^a-z0-9]/g, "")
    if (!tn) continue
    let score = 0
    if (tn === a) score = 1000
    else if (tn.startsWith(a) || a.startsWith(tn)) score = 500 + Math.min(tn.length, a.length)
    else if (tn.includes(a) || a.includes(tn)) score = 200 + Math.min(tn.length, a.length)
    else {
      // shared character count
      const set = new Set(tn)
      let shared = 0
      for (const c of a) if (set.has(c)) shared++
      score = shared
    }
    if (score > bestScore) {
      bestScore = score
      best = t
    }
  }
  return bestScore >= 3 ? best : null
}

export default async function AdminTagNormalizePage() {
  // 1. Auth
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
  if (!role || !ADMIN_ROLES.has(role.role as string)) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-2 text-2xl font-bold text-white">Tag normalize</h1>
        <p className="text-red-400">
          Accès refusé — rôle administrateur requis.
        </p>
      </main>
    )
  }

  // 2. Latest cron run
  const { data: latest } = await sr
    .from("admin_audit_logs")
    .select("id, payload, created_at")
    .eq("action", "cron.tag_normalize")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const payload = (latest?.payload ?? null) as CronPayload | null

  // 3. Aggregate alias→count across all reported tables
  const agg = new Map<string, { count: number; tables: Set<string> }>()
  for (const t of payload?.report ?? []) {
    const tableName = typeof t.table === "string" ? t.table : "unknown"
    const samples = Array.isArray(t.unmapped_sample) ? t.unmapped_sample : []
    for (const s of samples as unknown[]) {
      if (!s || typeof s !== "object") continue
      const entry = s as Partial<UnmappedSampleEntry>
      if (typeof entry.tag !== "string") continue
      const c = typeof entry.count === "number" ? entry.count : 0
      const cur = agg.get(entry.tag) ?? { count: 0, tables: new Set<string>() }
      cur.count += c
      cur.tables.add(tableName)
      agg.set(entry.tag, cur)
    }
  }

  const aliases = Array.from(agg.keys())

  // 4. Fetch existing tag_aliases for these aliases (to decorate UI).
  const aliasInfoByAlias = new Map<
    string,
    { status: AggRow["existing_status"]; canonical_tag: string | null }
  >()
  if (aliases.length > 0) {
    const { data: existing } = await sr
      .from("tag_aliases")
      .select("alias, status, canonical_tag")
      .in("alias", aliases)
    for (const e of existing ?? []) {
      aliasInfoByAlias.set(e.alias as string, {
        status: e.status as AggRow["existing_status"],
        canonical_tag: (e.canonical_tag as string | null) ?? null,
      })
    }
  }

  // 5. Canonical taxonomy for suggestions + dropdowns.
  const { data: taxonomyRows } = await sr
    .from("interest_taxonomy")
    .select("tag, is_active")
    .eq("is_active", true)
    .order("tag", { ascending: true })

  const taxonomy = (taxonomyRows ?? [])
    .map((r) => r.tag as string)
    .filter(Boolean)

  // 6. Build rows (sorted by count desc, capped TOP_N).
  const rows: AggRow[] = aliases
    .map<AggRow>((alias) => {
      const a = agg.get(alias)!
      const info = aliasInfoByAlias.get(alias) ?? null
      return {
        alias,
        count: a.count,
        tables: Array.from(a.tables),
        existing_status: info?.status ?? null,
        existing_canonical: info?.canonical_tag ?? null,
        suggested_canonical:
          info?.canonical_tag ?? suggestCanonical(alias, taxonomy),
      }
    })
    .sort((x, y) => y.count - x.count)
    .slice(0, TOP_N)

  const totals = payload?.totals ?? null
  const lastRunAt = latest?.created_at as string | undefined

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

      <header className="mb-6">
        <h1 className="text-3xl font-bold text-white">
          Tag normalize · file non-mappée
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Tags free-text rejetés par le cron de normalisation. Approuvez (alias
          → canonique existant ou nouveau) ou rejetez.
        </p>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Dernier run"
          value={lastRunAt ? new Date(lastRunAt).toLocaleString("fr-FR") : "—"}
          tone="zinc"
        />
        <Stat
          label="Mode"
          value={payload?.dry_run === false ? "COMMIT" : "DRY-RUN"}
          tone={payload?.dry_run === false ? "green" : "yellow"}
        />
        <Stat
          label="Drift rows"
          value={String(totals?.rows_with_drift ?? 0)}
          tone="zinc"
        />
        <Stat
          label="Tags droppés"
          value={String(totals?.tags_dropped ?? 0)}
          tone="red"
        />
      </section>

      {!latest && (
        <p className="rounded border border-zinc-800 bg-zinc-900 p-6 text-center text-sm text-zinc-400">
          Aucun run du cron <code>tag-normalize</code> trouvé dans
          admin_audit_logs.
        </p>
      )}

      {rows.length === 0 && latest && (
        <p className="rounded border border-zinc-800 bg-zinc-900 p-6 text-center text-sm text-zinc-400">
          Aucun tag non-mappé dans le dernier run.
        </p>
      )}

      <ul className="space-y-2">
        {rows.map((r) => (
          <TagAliasRow
            key={r.alias}
            alias={r.alias}
            count={r.count}
            tables={r.tables}
            existingStatus={r.existing_status}
            existingCanonical={r.existing_canonical}
            suggestedCanonical={r.suggested_canonical}
            taxonomy={taxonomy}
          />
        ))}
      </ul>
    </main>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: "zinc" | "green" | "yellow" | "red"
}) {
  const palette: Record<typeof tone, string> = {
    zinc: "border-zinc-800 bg-zinc-900 text-zinc-200",
    green: "border-green-500/30 bg-green-500/10 text-green-300",
    yellow: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    red: "border-red-500/30 bg-red-500/10 text-red-300",
  }
  return (
    <div className={`rounded border p-3 ${palette[tone]}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  )
}
