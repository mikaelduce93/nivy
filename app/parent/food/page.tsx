/**
 * /parent/food — view active food orders + nutrition_challenges for the parent's teens.
 */

import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"
import { NivCoach, NivEmpty } from "@/components/brand"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

// V1.4 a11y: human labels for raw enum statuses (was: "pending_payment" etc.).
const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Paiement en attente",
  paid: "Payée",
  preparing: "En préparation",
  ready: "Prête",
  delivered: "Livrée",
  cancelled: "Annulée",
  refunded: "Remboursée",
}

// Charte : statut DB → variante <StatusBadge> humanisée.
const ORDER_STATUS_VARIANT: Record<string, StatusVariant> = {
  pending_payment: "pending",
  paid: "success",
  preparing: "info",
  ready: "success",
  delivered: "success",
  cancelled: "danger",
  refunded: "neutral",
}

function formatStatus(raw: string | null | undefined): string {
  if (!raw) return "Inconnu"
  return ORDER_STATUS_LABELS[raw] ?? raw.replace(/_/g, " ")
}

function statusVariant(raw: string | null | undefined): StatusVariant {
  if (!raw) return "neutral"
  return ORDER_STATUS_VARIANT[raw] ?? "neutral"
}

// V1.4 a11y: render nutrition_targets as a definition list instead of raw JSON.
function NutritionTargets({ targets }: { targets: unknown }) {
  if (!targets || typeof targets !== "object") {
    return (
      <p className="mt-1 text-xs text-mute">Aucun objectif configuré.</p>
    )
  }
  const entries = Object.entries(targets as Record<string, unknown>)
  if (entries.length === 0) {
    return (
      <p className="mt-1 text-xs text-mute">Aucun objectif configuré.</p>
    )
  }
  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
      {entries.map(([k, v]) => (
        <div
          key={k}
          className="flex items-center justify-between rounded-xl border-2 border-ink bg-paper px-3 py-2"
        >
          <dt className="eyebrow text-[10px] text-mute">{k.replace(/_/g, " ")}</dt>
          <dd className="font-mono font-semibold tabular-nums text-ink">
            {typeof v === "number" || typeof v === "string"
              ? String(v)
              : JSON.stringify(v)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export default async function ParentFoodPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/connexion")
  }
  const parentId = userInfo!.profileId
  const sb = createServiceRoleClient()

  // Polish-F: wrap both reads — the previous bare awaits would 500 the route
  // on any RLS / network failure. Now the page degrades to its empty state
  // and surfaces an inline error banner instead.
  type OrderRow = {
    id: string
    status: string | null
    total_coins: number | null
    total_dh: number | null
    partner_id: string | null
    teen_id: string | null
    created_at: string | null
    parent_approval_id: string | null
    partners: { company_name?: string } | { company_name?: string }[] | null
  }
  type ChallengeRow = {
    id: string
    title: string
    is_active: boolean
    valid_from: string
    valid_until: string | null
    nutrition_targets: unknown
  }

  let orders: OrderRow[] = []
  let challenges: ChallengeRow[] = []
  let loadError: string | null = null

  try {
    const [ordersRes, challengesRes] = await Promise.all([
      sb
        .from("food_orders")
        .select("id, status, total_coins, total_dh, partner_id, teen_id, created_at, parent_approval_id, partners!inner(company_name)")
        .eq("parent_id", parentId)
        .order("created_at", { ascending: false })
        .limit(50),
      sb
        .from("nutrition_challenges")
        .select("*")
        .eq("parent_id", parentId)
        .order("created_at", { ascending: false }),
    ])
    if (ordersRes.error) {
      console.error("[parent/food] food_orders error:", ordersRes.error)
      loadError = "Impossible de charger l'historique."
    } else {
      orders = (ordersRes.data ?? []) as OrderRow[]
    }
    if (challengesRes.error) {
      console.error("[parent/food] nutrition_challenges error:", challengesRes.error)
      loadError = loadError ?? "Impossible de charger les défis."
    } else {
      challenges = (challengesRes.data ?? []) as ChallengeRow[]
    }
  } catch (err) {
    console.error("[parent/food] queries threw:", err)
    loadError = "Une erreur est survenue lors du chargement."
  }

  return (
    <main className="min-h-screen mx-auto max-w-3xl px-4 py-10">
      {/* Header éditorial */}
      <header className="mb-8">
        <p className="eyebrow text-pink">FOOD · CANTINE</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Ce que <em className="font-semibold italic text-pink">ton ado</em> commande
        </h1>
      </header>

      <NivCoach
        mood="happy"
        tone="paper"
        className="mb-8"
        message="Je garde un œil sur les commandes et les défis nutrition de ton crew."
      />

      {loadError && (
        <div
          role="alert"
          className="mb-6 rounded-xl border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {loadError}
        </div>
      )}

      <section className="mb-10" aria-labelledby="orders-heading">
        <h2 id="orders-heading" className="eyebrow mb-3 text-mute">
          Commandes récentes
        </h2>
        {orders.length === 0 ? (
          <NivEmpty
            title="Aucune commande pour l'instant"
            description="Ton ado mange sainement 🥗 Les commandes passées chez les partenaires s'afficheront ici."
            action={
              <Button asChild variant="pink">
                <a href="/parent/teens">Configurer les autorisations</a>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id}>
                <StickerCard variant="hover" className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-base font-bold text-ink">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {(o.partners as any)?.company_name}
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-ink">
                        {o.total_dh} DH
                        <span className="ml-2 text-coral">⊙ {o.total_coins}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge
                        variant={statusVariant(o.status)}
                        label={formatStatus(o.status)}
                        size="sm"
                      />
                      {o.parent_approval_id ? (
                        <StatusBadge variant="pending" label="Approbation requise" size="sm" />
                      ) : null}
                    </div>
                  </div>
                </StickerCard>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="challenges-heading">
        <h2 id="challenges-heading" className="eyebrow mb-3 text-mute">
          Défis nutrition actifs
        </h2>
        {challenges.length === 0 ? (
          <NivEmpty
            title="Aucun défi configuré"
            description="Lance un défi nutrition pour motiver ton crew à manger mieux 💪"
          />
        ) : (
          <ul className="space-y-3">
            {challenges.map((c) => (
              <li key={c.id}>
                <StickerCard className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-base font-bold text-ink">{c.title}</h3>
                    <StatusBadge
                      variant={c.is_active ? "success" : "neutral"}
                      label={c.is_active ? "Actif" : "Inactif"}
                      size="sm"
                    />
                  </div>
                  <p className="mt-1 font-mono text-xs text-mute">
                    {c.valid_from} → {c.valid_until ?? "∞"}
                  </p>
                  <NutritionTargets targets={c.nutrition_targets} />
                </StickerCard>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
