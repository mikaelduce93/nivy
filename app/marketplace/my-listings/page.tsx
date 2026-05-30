/**
 * /marketplace/my-listings — own listings (server-side).
 */

import { redirect } from "next/navigation"
import { Plus, Package } from "lucide-react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { NivEmpty } from "@/components/brand"

export const dynamic = "force-dynamic"

// Libellé + style FR des statuts (présentation — valeurs serveur inchangées).
const STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-lime text-ink" },
  sold: { label: "Vendu", cls: "bg-ink text-paper" },
  pending_moderation: { label: "En validation", cls: "bg-gold text-ink" },
  draft: { label: "Brouillon", cls: "bg-white text-ink" },
  removed: { label: "Retirée", cls: "bg-white text-mute" },
  reported: { label: "Signalée", cls: "bg-coral text-ink" },
}

export default async function MyListingsPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  const sellerId = userInfo.role === "teen" ? (userInfo.teenData?.id || userInfo.profileId) : userInfo.profileId

  const sb = createServiceRoleClient()
  const { data: listings } = await sb
    .from("marketplace_listings")
    .select("id, title, status, price_coins, created_at")
    .eq("seller_user_id", sellerId)
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-24">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow tracking-[0.18em] text-mute">Marketplace Nivy</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Mes <em className="font-semibold italic text-pink">annonces</em>
            </h1>
          </div>
          <Button asChild variant="pink" className="shadow-stkr-md">
            <Link href="/marketplace/sell">
              <Plus className="size-4" aria-hidden="true" />
              Nouvelle annonce
            </Link>
          </Button>
        </header>

        {!listings || listings.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Aucune annonce pour l'instant"
            description="Publie ton premier article et commence à vendre à ton crew."
            action={
              <Button asChild variant="pink">
                <Link href="/marketplace/sell">Créer une annonce</Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {listings.map((l) => {
              const meta = STATUS_META[l.status] ?? { label: l.status, cls: "bg-white text-ink" }
              return (
                <li key={l.id}>
                  <StickerCard variant="hover" className="p-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/marketplace/listings/${l.id}`}
                        className="flex flex-1 items-center gap-3 focus-visible:outline-none"
                      >
                        <span className="grid size-14 shrink-0 place-items-center rounded-xl border-2 border-ink bg-paper-2">
                          <Package className="size-6 text-mute" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-display font-bold text-ink">{l.title}</span>
                          <span className="mt-0.5 block font-mono text-sm font-bold tabular-nums text-coral">
                            ⊙ {l.price_coins}
                          </span>
                          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-mute">
                            {new Date(l.created_at).toLocaleDateString("fr-FR")}
                          </span>
                        </span>
                      </Link>
                      <span
                        className={`shrink-0 rounded-full border-2 border-ink px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                  </StickerCard>
                </li>
              )
            })}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  )
}
