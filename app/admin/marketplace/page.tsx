/**
 * /admin/marketplace — moderation queue + disputes (admin only).
 */

import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { ModerateRow } from "./moderate-row"
import { StatCard } from "@/components/admin/stat-card"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"
import { NivEmpty } from "@/components/brand"

const DISPUTE_STATUS_VARIANT: Record<string, StatusVariant> = {
  open: "pending",
  investigating: "warning",
}

const DISPUTE_STATUS_LABEL: Record<string, string> = {
  open: "Ouvert",
  investigating: "En cours",
}

export const dynamic = "force-dynamic"

export default async function AdminMarketplacePage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (!["admin","super_admin","moderator"].includes(userInfo.role)) {
    return (
      <main className="min-h-screen p-8">
        <p>Accès refusé (admin only).</p>
      </main>
    )
  }

  // Polish-F: wrap both queries — the previous bare awaits would 500 the
  // route on any RLS / network failure. Now the page degrades to "File vide"
  // and surfaces a banner instead.
  const sb = createServiceRoleClient()
  let pending: Array<{
    id: string
    title: string
    category: string
    price_coins: number | null
    seller_user_id: string
    created_at: string
  }> = []
  let disputes: Array<{
    id: string
    transaction_id: string | null
    reason: string | null
    status: string | null
    created_at: string | null
  }> = []
  let loadError: string | null = null
  try {
    const [p, d] = await Promise.all([
      sb
        .from("marketplace_listings")
        .select("id, title, category, price_coins, seller_user_id, created_at")
        .eq("status", "pending_moderation")
        .order("created_at", { ascending: true })
        .limit(50),
      sb
        .from("marketplace_disputes")
        .select("id, transaction_id, reason, status, created_at")
        .in("status", ["open","investigating"])
        .order("created_at", { ascending: true }),
    ])
    if (p.error) {
      console.error("[admin/marketplace] listings error:", p.error)
      loadError = "Impossible de charger les annonces."
    } else {
      pending = (p.data ?? []) as typeof pending
    }
    if (d.error) {
      console.error("[admin/marketplace] disputes error:", d.error)
      loadError = loadError ?? "Impossible de charger les litiges."
    } else {
      disputes = (d.data ?? []) as typeof disputes
    }
  } catch (err) {
    console.error("[admin/marketplace] queries threw:", err)
    loadError = "Une erreur est survenue lors du chargement."
  }

  return (
    <main className="min-h-screen mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8">
        <p className="eyebrow tracking-[0.16em]">Marketplace · Modération</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
          Annonces &amp; <em className="font-semibold italic text-pink">litiges</em>
        </h1>
        <p className="mt-2 text-sm text-mute">
          Modérez les nouvelles annonces et arbitrez les litiges en cours.
        </p>
      </header>

      {loadError && (
        <div
          role="alert"
          className="mb-6 rounded-2xl border-2 border-ink bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive shadow-stkr-sm"
        >
          {loadError}
        </div>
      )}

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Annonces en attente" value={pending.length} tone="gold" />
        <StatCard label="Litiges ouverts" value={disputes.length} tone="coral" />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-semibold text-ink">Annonces en attente ({pending.length})</h2>
        {pending.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="File vide"
            description="Aucune annonce en attente de modération."
          />
        ) : (
          <ul className="space-y-2">
            {pending.map((l) => (
              <ModerateRow key={l.id} listing={l} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-ink">Litiges ouverts ({disputes.length})</h2>
        {disputes.length === 0 ? (
          <NivEmpty
            mood="proud"
            title="Aucun litige"
            description="Tout roule — aucun litige ouvert à arbitrer."
          />
        ) : (
          <ul className="space-y-2">
            {disputes.map((d) => (
              <li
                key={d.id}
                className="flex flex-col gap-1 rounded-2xl border-2 border-ink bg-white p-3 text-ink shadow-stkr-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-mute">
                    tx {d.transaction_id}
                  </span>
                  {d.status && (
                    <StatusBadge
                      variant={DISPUTE_STATUS_VARIANT[d.status] ?? "neutral"}
                      label={DISPUTE_STATUS_LABEL[d.status] ?? d.status}
                      size="sm"
                      className="font-mono uppercase tracking-[0.16em]"
                    />
                  )}
                </div>
                <div className="text-sm">{d.reason}</div>
                <div className="font-mono text-xs text-mute">
                  {d.created_at ? new Date(d.created_at).toLocaleString("fr-FR") : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
