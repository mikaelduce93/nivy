/**
 * Wave Ops-D — Admin manual top-up dashboard.
 *
 * Lists pending manual_topup_requests submitted by parents (parent says
 * "I sent 200 DH via Cash Plus, ref XXX"). Admin verifies the screenshot and
 * cash arrival, then clicks "Confirm & credit" → POST /api/admin/topups/[id]/confirm
 * which calls top_up_teen RPC.
 *
 * Banner appears when manual_topup_threshold_status returns
 * should_activate_auto=true (100 families OR 4 weeks since first top-up).
 */
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { TopupRequestRow } from "./topup-request-row"

export const dynamic = "force-dynamic"

const ADMIN_ROLES = new Set(["admin", "super_admin", "moderator"])

interface ProfileLite {
  full_name: string | null
  email?: string | null
  phone?: string | null
}

interface TopupRequest {
  id: string
  parent_id: string
  teen_id: string
  amount_dh: number | string
  provider: string
  provider_ref: string
  screenshot_path: string | null
  status: string
  payment_transaction_id: string | null
  rejection_reason: string | null
  decided_by: string | null
  decided_at: string | null
  created_at: string
  updated_at: string
  parent: ProfileLite | null
  teen: ProfileLite | null
}

export default async function AdminTopupsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const sp = await searchParams
  const status = ["pending", "confirmed", "rejected"].includes(sp.status ?? "")
    ? (sp.status as string)
    : "pending"

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?redirect=/admin/topups")

  const sr = createServiceRoleClient()
  const { data: role } = await sr
    .from("admin_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!role || !ADMIN_ROLES.has(role.role)) redirect("/")

  const [requestsRes, thresholdRes] = await Promise.all([
    sr
      .from("manual_topup_requests")
      .select(`
        id, parent_id, teen_id, amount_dh, provider, provider_ref,
        screenshot_path, status, payment_transaction_id, rejection_reason,
        decided_by, decided_at, created_at, updated_at,
        parent:profiles!manual_topup_requests_parent_id_fkey(full_name, email, phone),
        teen:profiles!manual_topup_requests_teen_id_fkey(full_name, email)
      `)
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(100),
    sr.rpc("manual_topup_threshold_status"),
  ])

  const requests = (requestsRes.data ?? []) as unknown as TopupRequest[]
  const threshold = (thresholdRes.data ?? null) as
    | {
        families_topped_up: number
        first_topup_at: string | null
        weeks_since_first: number | string
        should_activate_auto: boolean
      }
    | null

  const autoEnabled = process.env.PSP_AUTO_TOPUP_ENABLED === "true"

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="container mx-auto px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">Recharges manuelles</h1>
            <p className="text-zinc-400">
              Validation des virements PSP (Cash Plus / Wafacash / M2T) hors-app.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              autoEnabled
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-amber-500/20 text-amber-300"
            }`}
          >
            Mode webhook auto: {autoEnabled ? "ACTIF" : "INACTIF"}
          </span>
        </div>

        {threshold?.should_activate_auto && !autoEnabled && (
          <div className="mb-6 rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-cyan-300">
                  Seuil atteint — il est temps d'activer le mode automatique.
                </p>
                <p className="mt-1 text-sm text-zinc-300">
                  {threshold.families_topped_up} familles ont rechargé •
                  {" "}
                  {Number(threshold.weeks_since_first ?? 0).toFixed(1)} semaines depuis la première recharge.
                </p>
                <p className="mt-2 text-xs text-zinc-400">
                  Voir le runbook docs/vision/ops-runbooks/05-psp-activation.md.
                </p>
              </div>
            </div>
          </div>
        )}

        {threshold && !threshold.should_activate_auto && (
          <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
            <span className="text-zinc-400">
              {threshold.families_topped_up} / 100 familles •{" "}
              {Number(threshold.weeks_since_first ?? 0).toFixed(1)} / 4 semaines
            </span>
          </div>
        )}

        <div className="mb-6 flex gap-2">
          {(["pending", "confirmed", "rejected"] as const).map((s) => (
            <Link
              key={s}
              href={`/admin/topups?status=${s}`}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                status === s
                  ? "bg-emerald-500 text-black"
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              {s === "pending" ? "En attente" : s === "confirmed" ? "Confirmées" : "Rejetées"}
            </Link>
          ))}
        </div>

        {requests.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-12 text-center text-zinc-500">
            Aucune demande {status === "pending" ? "en attente" : status === "confirmed" ? "confirmée" : "rejetée"}.
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <TopupRequestRow key={req.id} request={req} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
