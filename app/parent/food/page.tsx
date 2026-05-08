/**
 * /parent/food — view active food orders + nutrition_challenges for the parent's teens.
 */

import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

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

function formatStatus(raw: string | null | undefined): string {
  if (!raw) return "Inconnu"
  return ORDER_STATUS_LABELS[raw] ?? raw.replace(/_/g, " ")
}

// V1.4 a11y: render nutrition_targets as a definition list instead of raw JSON.
function NutritionTargets({ targets }: { targets: unknown }) {
  if (!targets || typeof targets !== "object") {
    return (
      <p className="mt-1 text-xs text-zinc-400">Aucun objectif configuré.</p>
    )
  }
  const entries = Object.entries(targets as Record<string, unknown>)
  if (entries.length === 0) {
    return (
      <p className="mt-1 text-xs text-zinc-400">Aucun objectif configuré.</p>
    )
  }
  return (
    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-300">
      {entries.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-medium capitalize text-zinc-400">
            {k.replace(/_/g, " ")}
          </dt>
          <dd className="text-right tabular-nums text-zinc-100">
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
    <main className="min-h-screen mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Food (parent)</h1>

      {loadError && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {loadError}
        </div>
      )}

      <section className="mb-8" aria-labelledby="orders-heading">
        <h2 id="orders-heading" className="text-lg font-semibold mb-2">
          Commandes récentes
        </h2>
        {orders.length === 0 ? (
          <div role="status" className="space-y-2">
            <p className="text-sm text-zinc-400">Aucune commande.</p>
            <a
              href="/parent/teens"
              className="inline-block text-xs text-emerald-400 hover:underline"
            >
              Configurer les autorisations de mes teens →
            </a>
          </div>
        ) : (
          <ul className="space-y-2">
            {orders.map((o) => (
              <li key={o.id} className="rounded border p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(o.partners as any)?.company_name}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-zinc-300">
                    {formatStatus(o.status)}
                  </span>
                </div>
                <div className="text-xs text-zinc-400">
                  {o.total_coins} coins · {o.total_dh} DH
                  {o.parent_approval_id ? " · approbation requise" : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="challenges-heading">
        <h2 id="challenges-heading" className="text-lg font-semibold mb-2">
          Défis nutrition actifs
        </h2>
        {challenges.length === 0 ? (
          <p role="status" className="text-sm text-zinc-400">
            Aucun défi configuré.
          </p>
        ) : (
          <ul className="space-y-2">
            {challenges.map((c) => (
              <li key={c.id} className="rounded border p-3 text-sm">
                <h3 className="font-medium text-base">{c.title}</h3>
                <div className="text-xs text-zinc-400">
                  {c.is_active ? "actif" : "inactif"} · {c.valid_from} → {c.valid_until ?? "∞"}
                </div>
                <NutritionTargets targets={c.nutrition_targets} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
