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
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach, NivEmpty } from "@/components/brand"
import { ManualTopupForm } from "./manual-topup-form"

const STEPS = [
  "Effectue le virement DH au compte Nivy via ton opérateur.",
  "Garde la référence de transaction (un numéro de 8 à 12 chiffres sur le reçu).",
  "Soumets le formulaire ci-dessous.",
  "L'admin Nivy vérifie et crédite les coins du teen.",
]

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
    <div className="min-h-screen bg-background text-ink">
      <div className="container mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/parent/topup"
          className="mb-6 inline-block text-sm text-mute hover:text-ink"
        >
          ← Retour
        </Link>

        <header className="mb-6">
          <p className="eyebrow">Recharge manuelle</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
            Recharge via{" "}
            <em className="font-semibold italic text-pink">opérateur</em>
          </h1>
          <p className="mt-2 text-mute">
            Tu as transféré des DH via Cash Plus, Wafacash ou M2T ? Renseigne la
            référence de ton virement et un admin crédite les coins.
          </p>
        </header>

        <NivCoach
          className="mb-8"
          mood="calm"
          message="Garde ton reçu sous la main, un admin valide ta recharge sous 24h."
        />

        <StickerCard className="mb-8 gap-3 p-5">
          <p className="eyebrow">Comment procéder</p>
          <ol className="space-y-3">
            {STEPS.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-ink bg-ink font-mono text-sm font-bold text-paper">
                  {i + 1}
                </span>
                <span className="text-sm text-ink-2">{step}</span>
              </li>
            ))}
          </ol>
        </StickerCard>

        {teens.length === 0 ? (
          <NivEmpty
            title="Aucun teen lié"
            description="Lie d'abord un teen à ton compte pour pouvoir le recharger."
            action={
              <Button asChild variant="pink">
                <Link href="/parent/teens/add">Ajouter un teen</Link>
              </Button>
            }
          />
        ) : (
          <ManualTopupForm teens={teens} />
        )}

        {recent.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-4 font-display text-xl font-extrabold text-ink">
              Tes demandes récentes
            </h2>
            <div className="space-y-2">
              {recent.map((r: any) => (
                <StickerCard
                  key={r.id}
                  className="flex-row items-center justify-between gap-3 p-4"
                >
                  <div>
                    <p className="text-sm text-ink-2">
                      <span className="font-mono font-bold text-ink">
                        {Number(r.amount_dh).toFixed(2)} DH
                      </span>{" "}
                      via {r.provider} • réf.{" "}
                      <code className="font-mono text-ink">{r.provider_ref}</code>
                    </p>
                    <p className="font-mono text-xs text-mute">
                      {new Date(r.created_at).toLocaleString("fr-FR")}
                    </p>
                    {r.rejection_reason && (
                      <p className="mt-1 text-xs text-pink">
                        Rejeté : {r.rejection_reason}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full border-2 border-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.12em] ${
                      r.status === "confirmed"
                        ? "bg-lime/20 text-ink"
                        : r.status === "rejected"
                        ? "bg-pink/20 text-pink"
                        : "bg-gold/20 text-ink"
                    }`}
                  >
                    {r.status === "confirmed"
                      ? "Crédité ✓"
                      : r.status === "rejected"
                      ? "Rejeté"
                      : "En attente"}
                  </span>
                </StickerCard>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
