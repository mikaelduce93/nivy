import type { Metadata } from "next"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatCard } from "@/components/admin/stat-card"
import { NivEmpty } from "@/components/brand"
import { ScrollText, ShieldAlert } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Journal d'audit — Admin" }

// Actions sensibles : accès console SQL, suppression, anonymisation RGPD.
// Différenciées visuellement (accent rose/corail) du reste du journal.
const SENSITIVE_ACTIONS = new Set([
  "sql_console_access",
  "delete",
  "data_deletion",
  "anonymize",
  "anonymization",
  "rgpd_purge",
])

// Catégorise une action en sévérité charte (lime/gold/rose) pour le badge.
function severityFor(action: string): { label: string; cls: string } {
  if (SENSITIVE_ACTIONS.has(action)) {
    return { label: "sensible", cls: "border-pink bg-pink/15 text-pink" }
  }
  if (action.startsWith("update") || action.startsWith("edit") || action.includes("role")) {
    return { label: "modification", cls: "border-gold bg-gold/15 text-gold" }
  }
  return { label: "info", cls: "border-lime bg-lime/15 text-lime" }
}

// Refonte V1.5 (#107) — journal d'audit canonique (audit_log, rétention 7 ans,
// spec §18/§29 inv.8). À fusionner éventuellement avec /admin/logs (routing §6 #2).
export default async function AdminAuditLogPage() {
  let rows: {
    id: string
    action?: string
    actor_id?: string
    actor_role?: string
    resource_type?: string
    description?: string
    created_at?: string
  }[] = []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("audit_log")
      .select("id, action, actor_id, actor_role, resource_type, description, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
    rows = data ?? []
  } catch {
    rows = []
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="eyebrow">Conformité · Audit</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink flex items-center gap-3">
          <ScrollText className="w-7 h-7 text-pink" />
          Journal d&apos;<em className="font-semibold italic text-pink">audit</em>
        </h1>
        <p className="text-mute">Toutes les actions admin — rétention 7 ans.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Entrées récentes"
          value={rows.length}
          tone="paper"
          icon={<ScrollText className="h-5 w-5" />}
          hint="50 dernières actions journalisées"
        />
        <StatCard
          label="Actions sensibles"
          value={rows.filter((r) => SENSITIVE_ACTIONS.has(r.action ?? "")).length}
          tone="coral"
          icon={<ShieldAlert className="h-5 w-5" />}
          hint="Accès SQL · suppression · anonymisation"
        />
      </div>

      {/* Filtres — habillage charte. Le branchement recherche/pagination reste
          à venir (hors périmètre iso de cette refonte). */}
      <StickerCard variant="panel" className="gap-2 p-4">
        <span className="eyebrow tracking-[0.14em] text-mute">Filtrer (à venir)</span>
        <div className="flex flex-wrap gap-2">
          {["Toutes", "Sensibles", "Modifications", "7 derniers jours"].map((f, i) => (
            <span
              key={f}
              className={
                "rounded-full border-2 border-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.12em] " +
                (i === 0 ? "bg-ink text-paper" : "text-mute")
              }
            >
              {f}
            </span>
          ))}
        </div>
      </StickerCard>

      {rows.length > 0 ? (
        <div className="space-y-2">
          {rows.map((r) => {
            const sev = severityFor(r.action ?? "")
            const sensitive = SENSITIVE_ACTIONS.has(r.action ?? "")
            return (
              <StickerCard
                key={r.id}
                variant="panel"
                className={"gap-2 p-4" + (sensitive ? " border-pink shadow-stkr-pink" : "")}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    {sensitive ? <ShieldAlert className="h-4 w-4 text-pink" /> : null}
                    <span className="font-mono text-sm font-bold text-ink">{r.action || "action"}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-xs text-mute">
                      {r.created_at ? new Date(r.created_at).toLocaleString("fr-FR") : ""}
                    </span>
                    <span
                      className={
                        "rounded-full border-2 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] " +
                        sev.cls
                      }
                    >
                      {sev.label}
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mute">
                  <span className="rounded-md border-2 border-ink/20 bg-ink/5 px-2 py-0.5 font-mono">
                    {r.actor_role || "système"}
                  </span>
                  {r.actor_id ? (
                    <span className="font-mono">acteur {r.actor_id.slice(0, 8)}</span>
                  ) : null}
                  {r.resource_type ? (
                    <>
                      <span>•</span>
                      <span className="font-mono">{r.resource_type}</span>
                    </>
                  ) : null}
                </div>
                {r.description ? (
                  <p className="text-sm text-ink-2">{r.description}</p>
                ) : null}
              </StickerCard>
            )
          })}
        </div>
      ) : (
        <NivEmpty
          title="Aucune entrée d'audit récente"
          description="Les actions admin journalisées apparaîtront ici."
        />
      )}
    </div>
  )
}
