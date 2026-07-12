import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { Niv, DarkSurface } from "@/components/brand"
import {
  ArrowLeft,
  Coins,
  History,
  ShieldCheck,
} from "lucide-react"
import Link from "next/link"
import { TopupForm } from "@/components/parent/topup-form"
import { TOPUP_PACKAGES as FALLBACK_PACKAGES, type TopupPackage } from "@/lib/payments/topup-packages"

// #351 — packs lus depuis la table serveur `topup_packages` (source autoritaire).
// Fallback sur le miroir partagé si la table est illisible (résilience).
async function getTopupPackages(): Promise<TopupPackage[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("topup_packages")
    .select("id, coins, bonus_coins, price_dh, is_popular")
    .eq("is_active", true)
    .order("sort_order")

  if (error || !data || data.length === 0) {
    if (error) console.error("Error fetching topup packages:", error)
    return FALLBACK_PACKAGES
  }

  return data.map((p: any) => ({
    id: p.id,
    coins: p.coins,
    bonus: p.bonus_coins,
    price: Number(p.price_dh),
    popular: p.is_popular,
  }))
}

async function getLinkedTeens(parentId: string) {
  const supabase = await createClient()

  const { data: teens, error } = await supabase
    .from("parent_teens_overview")
    .select("*")
    .eq("parent_id", parentId)

  if (error) {
    console.error("Error fetching teens:", error)
    return []
  }

  return teens || []
}

async function getParentSignature(parentId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("e_signatures")
    .select("id, created_at, parent_full_name")
    .eq("parent_id", parentId)
    .eq("terms_accepted", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("Error fetching parent signature:", error)
    return null
  }

  return data
}

async function getTopupHistory(parentId: string) {
  const supabase = await createClient()

  // coin_transactions has no source_user_id column — schema is
  // (teen_id, transaction_type, amount, ...). We resolve linked teens first
  // then read their top-up transactions. Whitepaper §5: every parent top-up
  // writes a `topup` row with source_type = 'parent_topup'.
  const { data: linkedTeens } = await supabase
    .from("parent_teen_links")
    .select("teen_id, teens:teen_id(profiles:user_id(full_name))")
    .eq("parent_id", parentId)
    .eq("status", "active")

  const teenIds = (linkedTeens ?? []).map((l: any) => l.teen_id)
  if (teenIds.length === 0) return []

  const teenNameMap = new Map<string, string>(
    (linkedTeens ?? []).map((l: any) => [
      l.teen_id,
      l.teens?.profiles?.full_name ?? "Teen",
    ])
  )

  const { data: history, error } = await supabase
    .from("coin_transactions")
    .select("id, teen_id, amount, transaction_type, description, created_at")
    .in("teen_id", teenIds)
    .eq("transaction_type", "topup")
    .order("created_at", { ascending: false })
    .limit(10)

  if (error) {
    console.error("Error fetching topup history:", error)
    return []
  }

  return (history ?? []).map((row: any) => ({
    ...row,
    teen: { full_name: teenNameMap.get(row.teen_id) ?? "Teen" },
  }))
}

export default async function ParentTopupPage({
  searchParams,
}: {
  // Next 16: searchParams is async. Mirrors fix already shipped on /parent/e-signature.
  searchParams: Promise<{ teen?: string }>
}) {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  const [teens, history, parentSignature, params, topupPackages] = await Promise.all([
    getLinkedTeens(userInfo.profileId),
    getTopupHistory(userInfo.profileId),
    getParentSignature(userInfo.profileId),
    searchParams,
    getTopupPackages(),
  ])
  const selectedTeenId = params.teen || ""
  const hasSigned = !!parentSignature

  // La vue parent_teens_overview expose `coins` (nullable), pas `total_coins`
  // — on normalise une fois vers la forme attendue par TopupForm + sidebar.
  const teenRows = (teens ?? [])
    .filter((t: any) => t.teen_id)
    .map((t: any) => ({
      teen_id: t.teen_id as string,
      teen_name: (t.teen_name as string | null) ?? "Teen",
      total_coins: (t.coins as number | null) ?? 0,
    }))

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Recharge</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
              Recharge les{" "}
              <em className="font-semibold italic text-pink">coins</em>
            </h1>
            <p className="mt-2 font-mono text-sm font-semibold text-mute">
              1 DH = 100 coins <span className="text-coral">⊙</span>
            </p>
          </div>
          <Niv mood="hype" size={88} className="hidden shrink-0 sm:block" />
        </div>

        {teenRows.length === 0 ? (
          <StickerCard className="items-center gap-3 p-10 text-center" role="status">
            <Niv mood="calm" size={80} />
            <h3 className="font-display text-xl font-extrabold text-ink">
              Aucun teen lié
            </h3>
            <p className="max-w-sm text-sm text-mute">
              Lie d'abord un teen à ton compte pour pouvoir le recharger.
            </p>
            <Button asChild variant="pink" className="mt-1">
              <Link href="/parent/teens/add">Ajouter un teen</Link>
            </Button>
          </StickerCard>
        ) : !hasSigned ? (
          <StickerCard className="items-center gap-3 p-8 text-center">
            <Niv mood="calm" size={80} />
            <h3 className="font-display text-xl font-extrabold text-ink">
              Autorisation parentale requise
            </h3>
            <p className="max-w-xl text-sm text-ink-2">
              Avant de recharger des coins pour tes teens, on recueille ta
              signature électronique et on vérifie ton identité.
            </p>
            <p className="max-w-xl text-xs text-mute">
              Étape obligatoire (loi 09-08 et CNDP). Elle n'est demandée qu'une
              seule fois.
            </p>
            <Button asChild variant="pink" className="mt-1">
              <Link
                href={`/parent/e-signature?redirect=${encodeURIComponent(
                  selectedTeenId
                    ? `/parent/topup?teen=${selectedTeenId}`
                    : "/parent/topup"
                )}${selectedTeenId ? `&teen=${selectedTeenId}` : ""}`}
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Signer l'autorisation
              </Link>
            </Button>
          </StickerCard>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Teen Selection & Packages */}
              <StickerCard className="gap-4 p-6">
                <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
                  <Coins className="h-5 w-5 text-gold" />
                  Choisir un pack
                </h2>
                <TopupForm
                  teens={teenRows}
                  packages={topupPackages}
                  selectedTeenId={selectedTeenId}
                  parentId={userInfo.profileId}
                />
              </StickerCard>

              {/* Packages Display */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {topupPackages.map((pack) => (
                  <StickerCard
                    key={pack.id}
                    variant="hover"
                    className="relative items-center gap-1 p-5 text-center"
                  >
                    {pack.popular && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full border-2 border-ink bg-pink px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink">
                        Populaire
                      </span>
                    )}
                    <p className="font-display text-3xl font-extrabold text-ink">
                      {pack.coins}
                      <span className="ml-1 align-baseline text-xl text-coral">⊙</span>
                    </p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
                      coins
                    </p>
                    {pack.bonus > 0 && (
                      <span className="rounded-full border-2 border-ink bg-lime/20 px-2 py-0.5 font-mono text-[11px] font-bold text-ink">
                        +{pack.bonus}
                      </span>
                    )}
                    <p className="mt-1 font-mono text-lg font-bold text-ink">
                      {pack.price} DH
                    </p>
                  </StickerCard>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Teen Balances — surface sombre ponctuelle (pattern « solde ») */}
              <div className="space-y-3">
                <p className="eyebrow">Soldes actuels</p>
                {teenRows.map((teen) => (
                  <DarkSurface key={teen.teen_id} tone="coral" shadow className="p-5">
                    <p className="eyebrow tracking-[0.16em] text-paper/60">
                      {teen.teen_name}
                    </p>
                    <p className="mt-1 font-display text-4xl font-extrabold leading-none tabular-nums text-coral">
                      {teen.total_coins || 0}
                      <span className="ml-1.5 align-baseline text-2xl">⊙</span>
                    </p>
                    <p className="mt-1 font-mono text-xs text-paper/60">coins</p>
                  </DarkSurface>
                ))}
              </div>

              {/* Recent Topups */}
              <StickerCard className="gap-3 p-5">
                <h2 className="flex items-center gap-2 font-display text-base font-extrabold text-ink">
                  <History className="h-4 w-4 text-teal" />
                  Dernières recharges
                </h2>
                {history.length > 0 ? (
                  <div className="space-y-2">
                    {history.slice(0, 5).map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border-2 border-line bg-paper-2 p-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-ink">
                            {item.teen?.full_name || "Teen"}
                          </p>
                          <p className="font-mono text-xs text-mute">
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-lime">
                          +{item.amount} <span className="text-coral">⊙</span>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-2 text-center text-sm text-mute">
                    Aucune recharge récente
                  </p>
                )}
              </StickerCard>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
