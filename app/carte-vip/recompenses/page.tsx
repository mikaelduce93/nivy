import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Percent, ShoppingBag, ArrowRight } from "lucide-react"
import Link from "next/link"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { NivEmpty } from "@/components/brand"

export default async function RecompensesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/carte-vip/recompenses")
  }

  // #355 — le programme de points de fidélité (gain + échange) n'est PAS encore
  // câblé : aucun `award_loyalty_points`, aucune redemption, et la table
  // `rewards` du catalogue n'existe pas en base (phantom — confirmé par le
  // typage généré). On ne montre donc NI solde de points NI catalogue théâtre :
  // on présente honnêtement la valeur réellement disponible (réduction VIP
  // automatique + boutique XP) et un empty state « bientôt ».

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-paper">
        <div className="container mx-auto px-6 py-28">
          <Link href="/carte-vip" className="mb-6 inline-block font-mono text-sm font-semibold text-pink hover:underline">
            ← Retour au programme
          </Link>

          <div className="mb-10">
            <p className="eyebrow tracking-[0.16em]">Carte VIP</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
              Le programme de <em className="font-semibold italic text-pink">points</em> arrive
            </h1>
            <p className="mt-3 max-w-2xl text-mute">
              On construit un programme de points de fidélité échangeables contre des récompenses.
              En attendant, ta carte VIP te fait déjà gagner — voici comment.
            </p>
          </div>

          {/* Valeur réellement disponible aujourd'hui — pas de théâtre */}
          <div className="mb-12 grid gap-4 md:grid-cols-2">
            <StickerCard className="gap-3 p-6">
              <span className="grid size-12 place-items-center rounded-2xl border-2 border-ink bg-teal">
                <Percent className="size-6 text-ink" aria-hidden="true" />
              </span>
              <h2 className="font-display text-xl font-extrabold text-ink">Réductions automatiques</h2>
              <p className="text-sm leading-relaxed text-mute">
                Ta carte VIP applique ta remise directement au paiement de tes events, clubs et
                partenaires — rien à échanger, c'est automatique.
              </p>
              <Button asChild variant="pink" className="mt-1 w-fit">
                <Link href="/carte-vip">
                  Voir mes avantages VIP
                  <ArrowRight className="ml-1.5 size-4" aria-hidden="true" />
                </Link>
              </Button>
            </StickerCard>

            <StickerCard className="gap-3 p-6">
              <span className="grid size-12 place-items-center rounded-2xl border-2 border-ink bg-gold">
                <ShoppingBag className="size-6 text-ink" aria-hidden="true" />
              </span>
              <h2 className="font-display text-xl font-extrabold text-ink">Boutique XP</h2>
              <p className="text-sm leading-relaxed text-mute">
                Ton XP se dépense dès maintenant dans la boutique : entrées, skins, expériences.
                C'est la récompense de ton effort, disponible tout de suite.
              </p>
              <Button asChild variant="lime" className="mt-1 w-fit">
                <Link href="/teen/wallet?tab=shop">
                  Ouvrir la boutique
                  <ArrowRight className="ml-1.5 size-4" aria-hidden="true" />
                </Link>
              </Button>
            </StickerCard>
          </div>

          <NivEmpty
            mood="calm"
            title="Bientôt des récompenses"
            description="On prépare le catalogue de récompenses échangeables contre tes points. Reviens vite !"
          />
        </div>
      </div>
      <Footer />
    </>
  )
}
