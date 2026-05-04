import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Trophy, Gift, Tag, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default async function RecompensesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/fidelite/recompenses")
  }

  const { data: userPoints } = await supabase.from("user_points").select("*").eq("profile_id", user.id).single()

  const { data: rewards } = await supabase.from("rewards").select("*").eq("is_active", true).order("points_cost")

  const currentPoints = userPoints?.total_points || 0

  const rewardTypes = {
    discount: { label: "Réductions", icon: Tag, color: "cyan" },
    free_entry: { label: "Entrées gratuites", icon: Sparkles, color: "purple" },
    vip_upgrade: { label: "Upgrades VIP", icon: Trophy, color: "yellow" },
    merchandise: { label: "Goodies", icon: Gift, color: "pink" },
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-zinc-950">
        <div className="container mx-auto px-6 py-32">
          <div className="mb-12">
            <Link href="/fidelite" className="text-cyan-400 hover:text-cyan-300 mb-4 inline-block">
              ← Retour au programme
            </Link>
            <div className="flex items-center justify-between">
              <h1 className="text-4xl md:text-6xl font-black text-white">Récompenses</h1>
              <div className="text-right">
                <p className="text-zinc-400 text-sm mb-1">Tes points</p>
                <p className="text-4xl font-black text-cyan-400">{currentPoints}</p>
              </div>
            </div>
          </div>

          {rewards && rewards.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {rewards.map((reward) => {
                const canAfford = currentPoints >= reward.points_cost
                const isOutOfStock = reward.available_quantity !== null && reward.available_quantity <= 0
                const typeInfo = rewardTypes[reward.reward_type as keyof typeof rewardTypes] || rewardTypes.discount

                return (
                  <div
                    key={reward.id}
                    className={`relative rounded-3xl overflow-hidden border ${
                      canAfford && !isOutOfStock
                        ? "border-cyan-500/50 bg-gradient-to-br from-cyan-500/10 to-blue-500/10"
                        : "border-zinc-800 bg-zinc-900"
                    }`}
                  >
                    <div className="relative h-52 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                      <div
                        className={`w-24 h-24 rounded-full bg-${typeInfo.color}-500/20 flex items-center justify-center`}
                      >
                        <typeInfo.icon className={`w-12 h-12 text-${typeInfo.color}-400`} />
                      </div>
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                          <p className="text-white font-bold text-lg">Rupture de stock</p>
                        </div>
                      )}
                      <div className="absolute top-4 left-4">
                        <div
                          className={`bg-${typeInfo.color}-500/90 backdrop-blur text-white font-bold text-xs px-3 py-1 rounded-full`}
                        >
                          {typeInfo.label}
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <h3 className="text-2xl font-bold text-white mb-3">{reward.title}</h3>
                      <p className="text-zinc-400 text-sm mb-4 leading-relaxed">{reward.description}</p>

                      {reward.available_quantity !== null && (
                        <p className="text-xs text-zinc-500 mb-4">Stock: {reward.available_quantity} restants</p>
                      )}

                      {reward.valid_until && (
                        <p className="text-xs text-zinc-500 mb-4">
                          Valide jusqu'au {new Date(reward.valid_until).toLocaleDateString("fr-FR")}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-6 h-6 text-cyan-400" />
                          <span className="text-cyan-400 font-black text-xl">{reward.points_cost} pts</span>
                        </div>

                        <Button
                          asChild
                          disabled={!canAfford || isOutOfStock}
                          className={
                            canAfford && !isOutOfStock
                              ? "bg-cyan-500 hover:bg-cyan-600 text-white border-0"
                              : "bg-zinc-800 text-zinc-500 border-0"
                          }
                        >
                          <Link href={`/fidelite/recompenses/${reward.id}`}>
                            {canAfford && !isOutOfStock
                              ? "Échanger"
                              : !canAfford
                                ? "Pas assez de points"
                                : "Indisponible"}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <Gift className="w-20 h-20 text-zinc-700 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">Bientôt des récompenses</h3>
              <p className="text-zinc-400">Nous préparons de superbes récompenses pour toi</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
