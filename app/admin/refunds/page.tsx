import type { Metadata } from "next"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NivEmpty } from "@/components/brand/niv-usage"
import { StatHero } from "@/components/brand/niv"
import { StatCard } from "@/components/admin/stat-card"
import { RotateCcw, Clock } from "lucide-react"

export const metadata: Metadata = { title: "Remboursements — Admin" }
export const dynamic = "force-dynamic"

const TYPE_LABEL: Record<string, string> = {
  marketplace: "Marketplace",
  food: "Food",
  ride: "Trajet",
}

// Refonte V1.5 (#107) + V3 (#196) — file des remboursements câblée sur le réel.
// Les remboursements sont émis à la demande via POST /api/admin/refunds, qui
// journalise chaque opération dans audit_log (action='refund.issue'). Il n'y a
// pas de file « en attente » dans le modèle — on affiche donc l'historique réel
// des remboursements émis plutôt que des zéros codés en dur.
export default async function AdminRefundsPage() {
  const sr = createServiceRoleClient()
  const { data: rows } = await sr
    .from("audit_log")
    .select("id, resource_type, resource_id, metadata, created_at")
    .eq("action", "refund.issue")
    .order("created_at", { ascending: false })
    .limit(100)

  const refunds = rows ?? []
  const totalDh = refunds.reduce(
    (sum, r) => sum + Number((r.metadata as Record<string, unknown> | null)?.amount_dh ?? 0),
    0,
  )

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="eyebrow">Modération · Finances</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
          Historique des <em className="font-semibold italic text-pink">remboursements</em>
        </h1>
        <p className="text-mute">Remboursements émis (marketplace, food, trajets), du plus récent au plus ancien.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <StatHero
          eyebrow="Remboursements émis"
          value={refunds.length}
          tone="coral"
          icon={<Clock className="h-6 w-6" />}
          meta={refunds.length === 0 ? "Aucun remboursement émis" : "Sur les 100 derniers"}
        />
        <StatCard
          label="Total remboursé"
          value={`${totalDh.toLocaleString("fr-FR")} DH`}
          tone="coral"
          mono
          icon={<RotateCcw className="h-5 w-5" />}
          hint="Somme des montants remboursés"
        />
      </section>

      {refunds.length === 0 ? (
        <NivEmpty
          mood="calm"
          title="Aucun remboursement émis"
          description="Les remboursements traités apparaîtront ici."
        />
      ) : (
        <ul className="space-y-3">
          {refunds.map((r) => {
            const meta = (r.metadata as Record<string, unknown> | null) ?? {}
            const amountDh = Number(meta.amount_dh ?? 0)
            const amountCoins = Number(meta.amount_coins ?? 0)
            return (
              <li
                key={r.id}
                className="flex items-center justify-between gap-4 rounded-xl border-2 border-ink bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="font-bold text-ink">
                    {TYPE_LABEL[r.resource_type ?? ""] ?? r.resource_type ?? "Remboursement"}
                  </p>
                  <p className="truncate font-mono text-xs text-mute">
                    #{r.resource_id} · {new Date(r.created_at).toLocaleString("fr-FR")}
                  </p>
                  {typeof meta.reason === "string" && meta.reason && (
                    <p className="mt-1 text-sm text-mute">{meta.reason}</p>
                  )}
                </div>
                <div className="shrink-0 text-right font-mono tabular-nums">
                  {amountDh > 0 && <p className="font-bold text-coral">{amountDh.toLocaleString("fr-FR")} DH</p>}
                  {amountCoins > 0 && <p className="text-xs text-mute">⊙ {amountCoins.toLocaleString("fr-FR")}</p>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
