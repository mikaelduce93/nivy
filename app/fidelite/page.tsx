import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Trophy, Star, Gift, TrendingUp, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default async function FidelitePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/fidelite")
  }

  const { data: userPoints } = await supabase.from("user_points").select("*").eq("profile_id", user.id).single()

  const { data: transactions } = await supabase
    .from("points_transactions")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10)

  const { data: rewards } = await supabase.from("rewards").select("*").eq("is_active", true).order("points_cost")

  const { data: userBadges } = await supabase
    .from("user_badges")
    .select(`
      *,
      badges (
        name,
        description,
        icon_name,
        points_reward
      )
    `)
    .eq("profile_id", user.id)

  const { data: allBadges } = await supabase.from("badges").select("*").eq("is_active", true)

  const currentPoints = userPoints?.total_points || 0
  const currentTier = userPoints?.current_tier || "Nouveau"
  const pointsToNext = userPoints?.points_to_next_tier || 100

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-zinc-950">
        <div className="container mx-auto px-6 py-32">
          <div className="text-center mb-16">
            <div className="inline-block relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-3xl blur-2xl opacity-20 animate-pulse" />
              <h1 className="relative text-5xl md:text-7xl font-black text-white mb-6">Programme de Fidélité</h1>
            </div>
            <p className="text-xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
              Gagne des points et débloques des récompenses
            </p>
          </div>

          <div className="max-w-6xl mx-auto space-y-8">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-3xl blur-xl opacity-75" />
                  <div className="relative bg-zinc-950 rounded-3xl p-8 border border-zinc-800">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className="text-zinc-400 text-sm mb-2">Tes points</p>
                        <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                          {currentPoints}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-zinc-400 text-sm mb-2">Niveau</p>
                        <div
                          className={`px-6 py-3 rounded-full text-2xl font-black ${
                            currentTier === "Gold"
                              ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                              : currentTier === "Silver"
                                ? "bg-gradient-to-r from-gray-400 to-gray-500"
                                : currentTier === "Bronze"
                                  ? "bg-gradient-to-r from-orange-700 to-orange-800"
                                  : "bg-gradient-to-r from-zinc-700 to-zinc-800"
                          } text-white`}
                        >
                          {currentTier}
                        </div>
                      </div>
                    </div>

                    {pointsToNext > 0 && (
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-zinc-400">Prochain niveau</span>
                          <span className="text-cyan-400">{pointsToNext} pts restants</span>
                        </div>
                        <div className="w-full bg-zinc-900 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                            style={{
                              width: `${pointsToNext > 0 ? Math.max(10, 100 - (pointsToNext / (currentTier === "Nouveau" ? 100 : currentTier === "Bronze" ? 500 : 1000)) * 100) : 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-8 border border-zinc-800">
                <h3 className="text-xl font-bold text-white mb-6">Comment gagner des points?</h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <Gift className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">10 pts par 100 DH</p>
                      <p className="text-zinc-500 text-xs">Sur chaque réservation</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <Star className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">50 pts</p>
                      <p className="text-zinc-500 text-xs">Pour un avis après événement</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">100 pts</p>
                      <p className="text-zinc-500 text-xs">Parraine un ami</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-8 border border-zinc-800">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Récompenses disponibles</h2>
                <Button
                  asChild
                  variant="outline"
                  className="border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-white bg-transparent"
                >
                  <Link href="/fidelite/recompenses">Voir tout</Link>
                </Button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rewards?.slice(0, 3).map((reward) => {
                  const canAfford = currentPoints >= reward.points_cost
                  const isOutOfStock = reward.available_quantity !== null && reward.available_quantity <= 0

                  return (
                    <div
                      key={reward.id}
                      className={`relative rounded-2xl overflow-hidden border ${
                        canAfford && !isOutOfStock
                          ? "border-cyan-500/50 bg-gradient-to-br from-cyan-500/10 to-blue-500/10"
                          : "border-zinc-800 bg-zinc-900"
                      }`}
                    >
                      <div className="relative h-40 bg-zinc-800 flex items-center justify-center">
                        <Gift className="w-16 h-16 text-zinc-700" />
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <p className="text-white font-bold">Rupture de stock</p>
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <h3 className="text-lg font-bold text-white mb-2">{reward.title}</h3>
                        <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{reward.description}</p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-cyan-400" />
                            <span className="text-cyan-400 font-bold">{reward.points_cost} pts</span>
                          </div>

                          <Button
                            asChild
                            size="sm"
                            disabled={!canAfford || isOutOfStock}
                            className={
                              canAfford && !isOutOfStock
                                ? "bg-cyan-500 hover:bg-cyan-600 text-white border-0"
                                : "bg-zinc-800 text-zinc-500 border-0"
                            }
                          >
                            <Link href={`/fidelite/recompenses/${reward.id}`}>Échanger</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-8 border border-zinc-800">
                <h2 className="text-2xl font-bold text-white mb-6">Historique récent</h2>

                {transactions && transactions.length > 0 ? (
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800"
                      >
                        <div>
                          <p className="text-white font-semibold">
                            {transaction.reason || transaction.transaction_type}
                          </p>
                          <p className="text-zinc-500 text-xs">
                            {new Date(transaction.created_at).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                        <div
                          className={`text-xl font-bold ${
                            transaction.transaction_type === "earned" || transaction.transaction_type === "bonus"
                              ? "text-green-400"
                              : transaction.transaction_type === "redeemed"
                                ? "text-red-400"
                                : "text-zinc-500"
                          }`}
                        >
                          {transaction.transaction_type === "earned" || transaction.transaction_type === "bonus"
                            ? "+"
                            : "-"}
                          {transaction.points}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-center py-8">Aucune transaction pour le moment</p>
                )}
              </div>

              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-8 border border-zinc-800">
                <h2 className="text-2xl font-bold text-white mb-6">Mes badges</h2>

                <div className="grid grid-cols-3 gap-4">
                  {allBadges?.map((badge) => {
                    const earned = userBadges?.some((ub) => ub.badges?.name === badge.name)

                    return (
                      <div
                        key={badge.id}
                        className={`relative rounded-2xl p-4 text-center ${
                          earned
                            ? "bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30"
                            : "bg-zinc-900 border border-zinc-800 opacity-50"
                        }`}
                      >
                        <div className="text-4xl mb-2">{badge.icon_name || "🏆"}</div>
                        <p className="text-white text-xs font-semibold line-clamp-2">{badge.name}</p>
                        {earned && (
                          <div className="absolute top-2 right-2">
                            <Award className="w-4 h-4 text-cyan-400" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
