import type { Metadata } from "next"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { ScrollText } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Journal d'audit — Admin" }

// Refonte V1.5 (#107) — journal d'audit canonique (audit_log, rétention 7 ans,
// spec §18/§29 inv.8). À fusionner éventuellement avec /admin/logs (routing §6 #2).
export default async function AdminAuditLogPage() {
  let rows: { id: string; action?: string; actor_id?: string; created_at?: string }[] = []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("audit_log")
      .select("id, action, actor_id, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
    rows = data ?? []
  } catch {
    rows = []
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="eyebrow">Conformité</p>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <ScrollText className="w-7 h-7 text-pink" /> Journal d'audit
        </h1>
        <p className="text-mute">Toutes les actions admin — rétention 7 ans.</p>
      </header>
      {rows.length > 0 ? (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} padding="sm" className="px-5 flex-row items-center justify-between">
              <span className="font-mono text-sm text-ink">{r.action || "action"}</span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-mute font-mono">{r.created_at ? new Date(r.created_at).toLocaleString("fr-FR") : ""}</span>
                <StatusBadge variant="info" label="enregistré" />
              </span>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-14"><p className="text-mute">Aucune entrée d'audit récente.</p></Card>
      )}
    </div>
  )
}
