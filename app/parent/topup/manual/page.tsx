/**
 * Wave Ops-D — Parent files a manual top-up request.
 *
 * Manual MVP UX: parent transfers DH via Cash Plus / Wafacash / M2T outside
 * the app, then comes here with the operator's transaction reference + (ideally)
 * a screenshot. Admin reviews via /admin/topups and credits via top_up_teen.
 *
 * When PSP_AUTO_TOPUP_ENABLED=true the founder can repurpose this page to
 * surface the auto-credit instructions instead.
 */
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { ManualTopupForm } from "./manual-topup-form"

export const dynamic = "force-dynamic"

async function getLinkedTeens(parentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("parent_teen_links")
    .select("teen_id, teens:teen_id(id, full_name, email)")
    .eq("parent_id", parentId)
    .eq("status", "active")
  if (error) {
    console.error("[parent/topup/manual] teens fetch error", error)
    return []
  }
  return (data ?? []).map((row: any) => ({
    id: row.teen_id,
    name: row.teens?.full_name ?? "Teen",
  }))
}

async function getRecentRequests(parentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("manual_topup_requests")
    .select("id, amount_dh, provider, provider_ref, status, rejection_reason, created_at")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false })
    .limit(10)
  if (error) {
    console.error("[parent/topup/manual] recent requests error", error)
    return []
  }
  return data ?? []
}

export default async function ParentManualTopupPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  const [teens, recent] = await Promise.all([
    getLinkedTeens(userInfo.profileId),
    getRecentRequests(userInfo.profileId),
  ])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="container mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/parent/topup"
          className="mb-6 inline-block text-sm text-zinc-400 hover:text-white"
        >
          ← Retour
        </Link>

        <h1 className="mb-2 text-3xl font-black">Recharge manuelle (PSP)</h1>
        <p className="mb-8 text-zinc-400">
          Vous avez transféré des DH via Cash Plus, Wafacash ou M2T ? Renseignez
          la référence de votre virement et un admin créditera les coins sous 24h.
        </p>

        <div className="mb-8 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-5 text-sm">
          <p className="font-semibold text-cyan-300">Comment procéder</p>
          <ol className="ml-4 mt-2 list-decimal space-y-1 text-zinc-300">
            <li>Effectuez le virement DH au compte Nivy via votre opérateur.</li>
            <li>
              Conservez la référence de transaction (souvent un numéro de 8 à 12 chiffres
              imprimé sur le reçu).
            </li>
            <li>Soumettez le formulaire ci-dessous.</li>
            <li>L'admin Nivy vérifie et crédite les coins du teen.</li>
          </ol>
        </div>

        {teens.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
            <p className="text-zinc-300">Aucun teen lié à votre compte.</p>
            <Link
              href="/parent/teens/add"
              className="mt-4 inline-block rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black"
            >
              Ajouter un teen
            </Link>
          </div>
        ) : (
          <ManualTopupForm teens={teens} />
        )}

        {recent.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-4 text-xl font-bold text-white">Vos demandes récentes</h2>
            <div className="space-y-2">
              {recent.map((r: any) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
                >
                  <div>
                    <p className="text-sm text-zinc-300">
                      <span className="font-semibold text-white">
                        {Number(r.amount_dh).toFixed(2)} DH
                      </span>
                      {" "}via {r.provider} • réf. <code>{r.provider_ref}</code>
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(r.created_at).toLocaleString("fr-FR")}
                    </p>
                    {r.rejection_reason && (
                      <p className="mt-1 text-xs text-rose-400">
                        Rejeté : {r.rejection_reason}
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      r.status === "confirmed"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : r.status === "rejected"
                        ? "bg-rose-500/20 text-rose-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {r.status === "confirmed"
                      ? "Crédité"
                      : r.status === "rejected"
                      ? "Rejeté"
                      : "En attente"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
