import type { Metadata } from "next"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NivEmpty } from "@/components/brand/niv-usage"
import { StatHero, DarkSurface } from "@/components/brand/niv"
import { StickerCard } from "@/components/ui/sticker-card"
import { FileDown, Trash2, Clock } from "lucide-react"

export const metadata: Metadata = { title: "DSAR / CNDP — Admin" }
export const dynamic = "force-dynamic"

// Refonte V1.5 (#107) + V3 (#196) — file DSAR câblée sur le réel : demandes
// d'export (data_exports) et d'effacement (data_deletion_requests) encore
// ouvertes (completed_at/cancelled_at null), triées par date de demande.
export default async function AdminCndpPage() {
  const sr = createServiceRoleClient()

  const [deletions, exports] = await Promise.all([
    sr
      .from("data_deletion_requests")
      .select("id, user_id, status, requested_at, scheduled_for", { count: "exact" })
      .is("completed_at", null)
      .is("cancelled_at", null)
      .order("requested_at", { ascending: true })
      .limit(50),
    sr
      .from("data_exports")
      .select("id, user_id, status, requested_at", { count: "exact" })
      .is("completed_at", null)
      .order("requested_at", { ascending: true })
      .limit(50),
  ])

  const delRows = deletions.data ?? []
  const expRows = exports.data ?? []
  const pendingTotal = (deletions.count ?? 0) + (exports.count ?? 0)

  const maskUser = (id: string | null) => (id ? `${id.slice(0, 8)}…` : "—")

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="eyebrow">Conformité · CNDP</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
          Demandes <em className="font-semibold italic text-pink">DSAR</em>
        </h1>
        <p className="text-mute">Accès et effacement (loi 09-08) à traiter sous 30 jours.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <StatHero
          eyebrow="En attente"
          value={pendingTotal}
          tone="coral"
          icon={<Clock className="h-6 w-6" />}
          meta={pendingTotal === 0 ? "Aucune demande dans le délai légal" : "Demandes ouvertes à traiter"}
        />
        <DarkSurface tone="gold" shadow className="flex flex-col justify-center gap-2 p-5 sm:p-6">
          <span className="eyebrow tracking-[0.16em] text-paper/60">Rappel conformité</span>
          <p className="text-sm leading-snug text-paper/90">
            Loi <span className="font-mono">09-08</span> · CNDP : chaque demande doit être traitée sous{" "}
            <span className="font-mono font-semibold text-gold">30 jours</span>.
          </p>
        </DarkSurface>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <StickerCard className="gap-3 p-6">
          <div className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-teal" />
            <span className="font-display font-bold text-ink">Accès aux données ({exports.count ?? 0})</span>
          </div>
          {expRows.length === 0 ? (
            <p className="text-sm text-mute">Aucun export en attente.</p>
          ) : (
            <ul className="space-y-2">
              {expRows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border-2 border-line p-2 text-sm">
                  <span className="font-mono text-xs text-mute">{maskUser(r.user_id)}</span>
                  <span className="text-mute">{new Date(r.requested_at).toLocaleDateString("fr-FR")}</span>
                  <span className="font-mono text-[11px] font-bold uppercase text-teal">{r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </StickerCard>

        <StickerCard className="gap-3 p-6">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-coral" />
            <span className="font-display font-bold text-ink">Effacement ({deletions.count ?? 0})</span>
          </div>
          {delRows.length === 0 ? (
            <p className="text-sm text-mute">Aucune suppression en attente.</p>
          ) : (
            <ul className="space-y-2">
              {delRows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border-2 border-line p-2 text-sm">
                  <span className="font-mono text-xs text-mute">{maskUser(r.user_id)}</span>
                  <span className="text-mute">
                    {r.scheduled_for
                      ? `échéance ${new Date(r.scheduled_for).toLocaleDateString("fr-FR")}`
                      : new Date(r.requested_at).toLocaleDateString("fr-FR")}
                  </span>
                  <span className="font-mono text-[11px] font-bold uppercase text-coral">{r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </StickerCard>
      </section>

      {pendingTotal === 0 && (
        <NivEmpty
          mood="calm"
          title="Aucune demande en attente"
          description="Les demandes d'accès et d'effacement des utilisateurs apparaîtront ici, triées par échéance."
        />
      )}
    </div>
  )
}
