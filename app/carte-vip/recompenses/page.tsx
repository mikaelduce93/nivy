import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Trophy, Gift, Tag, Sparkles, Percent, ShoppingBag, ArrowRight } from "lucide-react"
import Link from "next/link"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { NivEmpty } from "@/components/brand"
import { cn } from "@/lib/utils"

const rewardTypes = {
  discount: { label: "Réductions", icon: Tag, accent: "bg-teal" },
  free_entry: { label: "Entrées gratuites", icon: Sparkles, accent: "bg-pink" },
  vip_upgrade: { label: "Upgrades VIP", icon: Trophy, accent: "bg-gold" },
  merchandise: { label: "Goodies", icon: Gift, accent: "bg-coral" },
}

export default async function RecompensesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/carte-vip/recompenses")
  }

  // #355 — le programme de points de fidélité (gain + échange) n'est PAS encore
  // câblé (aucun `award_loyalty_points`, aucune redemption). On ne montre donc
  // NI solde de points NI badge « points suffisants » (théâtre trompeur pour des
  // mineurs). On présente honnêtement les récompenses comme un aperçu à venir et
  // on redirige vers la valeur réellement disponible : la réduction VIP
  // automatique et la boutique XP.
  const { data: rewards } = await supabase
    .from("rewards")
    .select("*")
    .eq("is_active", true)
    .order("points_cost")

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
              On construit un programme de points de fidélité échangeables contre les récompenses
              ci-dessous. En attendant, ta carte VIP te fait déjà gagner — voici comment.
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

          {/* Aperçu du programme de points — clairement étiqueté « bientôt » */}
          {rewards && rewards.length > 0 && (
            <>
              <div className="mb-6">
                <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">
                  Aperçu des récompenses à venir
                </h2>
                <p className="mt-1 text-sm text-mute">
                  Ces récompenses seront échangeables contre des points quand le programme ouvrira.
                </p>
              </div>
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {rewards.map((reward) => {
                  const typeInfo =
                    rewardTypes[reward.reward_type as keyof typeof rewardTypes] || rewardTypes.discount
                  const TypeIcon = typeInfo.icon

                  return (
                    <StickerCard key={reward.id} className="overflow-hidden p-0">
                      <div className="relative flex h-44 items-center justify-center border-b-2 border-ink bg-paper-2">
                        <span className={cn("grid size-24 place-items-center rounded-full border-2 border-ink", typeInfo.accent)}>
                          <TypeIcon className="size-12 text-ink" aria-hidden="true" />
                        </span>
                        <span className="absolute left-4 top-4 rounded-full border-2 border-ink bg-white px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink">
                          {typeInfo.label}
                        </span>
                        <span className="absolute right-4 top-4 rounded-full border-2 border-ink bg-gold px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink">
                          Bientôt
                        </span>
                      </div>

                      <div className="p-6">
                        <h3 className="mb-3 font-display text-2xl font-bold text-ink">{reward.title}</h3>
                        <p className="mb-4 text-sm leading-relaxed text-mute">{reward.description}</p>

                        <div className="flex items-center gap-2 border-t-2 border-dashed border-line pt-4">
                          <Trophy className="size-6 text-teal" aria-hidden="true" />
                          <span className="font-display text-xl font-extrabold tabular-nums text-teal">
                            {reward.points_cost} pts
                          </span>
                        </div>
                      </div>
                    </StickerCard>
                  )
                })}
              </div>
            </>
          )}

          {(!rewards || rewards.length === 0) && (
            <NivEmpty
              mood="calm"
              title="Bientôt des récompenses"
              description="On prépare de superbes récompenses pour toi. Reviens vite !"
            />
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
