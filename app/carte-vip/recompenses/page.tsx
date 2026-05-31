import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Trophy, Gift, Tag, Sparkles } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty, DarkSurface } from "@/components/brand"
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

  const { data: userPoints } = await supabase.from("user_points").select("*").eq("profile_id", user.id).single()

  const { data: rewards } = await supabase.from("rewards").select("*").eq("is_active", true).order("points_cost")

  const currentPoints = userPoints?.total_points || 0

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-paper">
        <div className="container mx-auto px-6 py-28">
          <Link href="/carte-vip" className="mb-6 inline-block font-mono text-sm font-semibold text-pink hover:underline">
            ← Retour au programme
          </Link>

          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow tracking-[0.16em]">Carte VIP</p>
              <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
                Tes <em className="font-semibold italic text-pink">récompenses</em>
              </h1>
            </div>
            <DarkSurface tone="teal" shadow className="px-5 py-3 text-center">
              <p className="eyebrow tracking-[0.16em] text-paper/60">Tes points</p>
              <p className="font-display text-3xl font-extrabold tabular-nums text-teal">{currentPoints}</p>
            </DarkSurface>
          </div>

          {rewards && rewards.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {rewards.map((reward) => {
                const canAfford = currentPoints >= reward.points_cost
                const isOutOfStock = reward.available_quantity !== null && reward.available_quantity <= 0
                const typeInfo = rewardTypes[reward.reward_type as keyof typeof rewardTypes] || rewardTypes.discount
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
                      {isOutOfStock && (
                        <div className="absolute inset-0 grid place-items-center bg-ink/70">
                          <p className="font-display text-lg font-bold text-paper">Rupture de stock</p>
                        </div>
                      )}
                    </div>

                    <div className="p-6">
                      <h3 className="mb-3 font-display text-2xl font-bold text-ink">{reward.title}</h3>
                      <p className="mb-4 text-sm leading-relaxed text-mute">{reward.description}</p>

                      {reward.available_quantity !== null && (
                        <p className="mb-4 font-mono text-xs text-mute">Stock : {reward.available_quantity} restants</p>
                      )}
                      {reward.valid_until && (
                        <p className="mb-4 font-mono text-xs text-mute">
                          Valide jusqu'au {new Date(reward.valid_until).toLocaleDateString("fr-FR")}
                        </p>
                      )}

                      <div className="flex items-center justify-between border-t-2 border-dashed border-line pt-4">
                        <div className="flex items-center gap-2">
                          <Trophy className="size-6 text-teal" aria-hidden="true" />
                          <span className="font-display text-xl font-extrabold tabular-nums text-teal">{reward.points_cost} pts</span>
                        </div>

                        <Button variant={canAfford && !isOutOfStock ? "pink" : "outline"} disabled>
                          {canAfford && !isOutOfStock ? "Échange bientôt" : !canAfford ? "Pas assez de points" : "Indisponible"}
                        </Button>
                      </div>
                    </div>
                  </StickerCard>
                )
              })}
            </div>
          ) : (
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
