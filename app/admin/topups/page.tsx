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
import { NivEmpty, StatHero } from "@/components/brand"
import BackButton from "@/components/admin/BackButton"

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
    <main className="container mx-auto max-w-5xl px-6 py-8">
      <BackButton href="/admin" />

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow tracking-[0.16em] text-mute">Recharges manuelles</span>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink">
            Virements <em className="font-semibold italic text-pink">à valider</em>
          </h1>
          <p className="mt-1 text-sm text-mute">
            Validation des virements PSP (Cash Plus / Wafacash / M2T) hors-app.
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-xl border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] ${
            autoEnabled ? "bg-lime text-ink" : "bg-white text-mute"
          }`}
        >
          Webhook auto : {autoEnabled ? "actif" : "inactif"}
        </span>
      </header>

      {threshold?.should_activate_auto && !autoEnabled && (
        <StatHero
          tone="teal"
          eyebrow="Seuil atteint"
          value={threshold.families_topped_up}
          unit="familles"
          className="mb-6"
          meta={
            <div className="space-y-2">
              <p className="text-paper/80">
                Il est temps d&apos;activer le mode automatique —{" "}
                <span className="font-mono tabular-nums">
                  {Number(threshold.weeks_since_first ?? 0).toFixed(1)}
                </span>{" "}
                semaines depuis la première recharge.
              </p>
              <Link
                href="/admin"
                className="inline-flex items-center rounded-xl border-2 border-paper/40 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-paper transition-colors hover:bg-paper/10"
              >
                Voir la procédure d&apos;activation
              </Link>
            </div>
          }
        />
      )}

      {threshold && !threshold.should_activate_auto && (
        <div className="mb-6 rounded-2xl border-2 border-ink bg-white p-4 shadow-stkr-sm">
          <span className="font-mono text-sm tabular-nums text-mute">
            {threshold.families_topped_up} / 100 familles ·{" "}
            {Number(threshold.weeks_since_first ?? 0).toFixed(1)} / 4 semaines
          </span>
        </div>
      )}

      {/* Onglets statut — navigation par lien, look sticker-tab (actif = fond ink + texte paper + ombre rose). */}
      <div className="mb-6 inline-flex gap-1 rounded-2xl border-2 border-ink bg-white p-1.5">
        {(["pending", "confirmed", "rejected"] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/topups?status=${s}`}
            className={`inline-flex items-center rounded-xl px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.12em] transition-all ${
              status === s
                ? "-translate-x-0.5 -translate-y-0.5 bg-ink text-paper shadow-stkr-pink"
                : "text-mute hover:text-ink"
            }`}
          >
            {s === "pending" ? "En attente" : s === "confirmed" ? "Confirmées" : "Rejetées"}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <NivEmpty
          mood="calm"
          title="Aucune demande"
          description={`Aucune demande ${status === "pending" ? "en attente" : status === "confirmed" ? "confirmée" : "rejetée"} pour le moment.`}
        />
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <TopupRequestRow key={req.id} request={req} />
          ))}
        </div>
      )}
    </main>
  )
}
