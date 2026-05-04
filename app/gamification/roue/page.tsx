/**
 * TEENS PARTY MOROCCO - Fortune Wheel Page
 * =========================================
 * Page fonctionnelle de la Roue de la Fortune
 */

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { FortuneWheelClient } from "./fortune-wheel-client"
import { Compass, Trophy, Flame, Gift, Crown } from "lucide-react"

export const metadata = {
  title: "Roue de la Fortune | Teens Party Morocco",
  description: "Tourne la roue chaque jour et gagne des XP, des coins et des récompenses exclusives !",
}

export default async function FortuneWheelPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/gamification/roue")
  }

  // Récupérer les segments de la roue
  const { data: segments } = await supabase
    .from("wheel_segments")
    .select("*")
    .eq("is_active", true)
    .order("segment_index")

  // Récupérer les stats de la roue pour l'utilisateur via RPC
  const { data: wheelStats } = await supabase.rpc("get_wheel_stats", {
    p_user_id: user.id,
  })

  // Récupérer le jackpot actuel
  const { data: jackpot } = await supabase
    .from("wheel_jackpots")
    .select("current_pool, min_pool")
    .eq("is_active", true)
    .is("winner_id", null)
    .single()

  // Récupérer si l'utilisateur peut tourner via RPC
  const { data: canSpinData } = await supabase.rpc("can_spin_wheel", {
    p_user_id: user.id,
  })

  const canSpin = {
    can_spin_daily: canSpinData?.can_spin_daily ?? true,
    bonus_spins: canSpinData?.bonus_spins ?? 0,
    current_streak: canSpinData?.current_streak ?? 0,
    streak_multiplier: canSpinData?.streak_multiplier ?? 1.0,
    next_spin_at: canSpinData?.next_spin_at ?? null,
  }

  // Segments par défaut si pas encore configurés
  const defaultSegments = segments?.length ? segments : [
    { id: "1", name: "50 XP", color: "#06b6d4", icon: "zap", reward_type: "xp", reward_value: { xp: 50 }, probability: 25, segment_index: 0 },
    { id: "2", name: "100 XP", color: "#22c55e", icon: "zap", reward_type: "xp", reward_value: { xp: 100 }, probability: 20, segment_index: 1 },
    { id: "3", name: "250 XP", color: "#eab308", icon: "zap", reward_type: "xp", reward_value: { xp: 250 }, probability: 15, segment_index: 2 },
    { id: "4", name: "Spin Bonus", color: "#a855f7", icon: "rotate-cw", reward_type: "bonus_spin", reward_value: { spins: 1 }, probability: 10, segment_index: 3 },
    { id: "5", name: "500 XP", color: "#f97316", icon: "zap", reward_type: "xp", reward_value: { xp: 500 }, probability: 10, segment_index: 4 },
    { id: "6", name: "100 Coins", color: "#ec4899", icon: "trending-up", reward_type: "coins", reward_value: { coins: 100 }, probability: 8, segment_index: 5 },
    { id: "7", name: "Jackpot", color: "#fbbf24", icon: "crown", reward_type: "jackpot", reward_value: {}, probability: 2, segment_index: 6 },
    { id: "8", name: "Rien", color: "#71717a", icon: "x", reward_type: "nothing", reward_value: {}, probability: 10, segment_index: 7 },
  ]

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <div className="pt-32 pb-20">
        <div className="container mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-6">
              <Compass className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 mb-4">
              Roue de la Fortune
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Tourne la roue chaque jour et gagne des XP, des coins et des récompenses exclusives !
            </p>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto">
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{wheelStats?.total_spins || 0}</p>
              <p className="text-xs text-zinc-500">Spins totaux</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Flame className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{wheelStats?.current_streak || 0}</p>
              <p className="text-xs text-zinc-500">Série actuelle</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Gift className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{wheelStats?.total_xp_earned || 0}</p>
              <p className="text-xs text-zinc-500">XP gagnés</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Crown className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{wheelStats?.jackpots_won || 0}</p>
              <p className="text-xs text-zinc-500">Jackpots gagnés</p>
            </div>
          </div>

          {/* Wheel Component */}
          <div className="flex justify-center">
            <FortuneWheelClient
              segments={defaultSegments}
              canSpin={canSpin}
              jackpotAmount={jackpot?.current_pool || 5000}
            />
          </div>

          {/* Règles */}
          <div className="mt-16 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Comment ça marche ?</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
                <h3 className="font-bold text-cyan-400 mb-2">Spin Quotidien</h3>
                <p className="text-sm text-zinc-400">
                  Tu peux tourner la roue gratuitement une fois par jour. Reviens chaque jour !
                </p>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
                <h3 className="font-bold text-orange-400 mb-2">Série de Jours</h3>
                <p className="text-sm text-zinc-400">
                  Connecte-toi plusieurs jours de suite pour augmenter ton multiplicateur de gains !
                </p>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
                <h3 className="font-bold text-purple-400 mb-2">Spins Bonus</h3>
                <p className="text-sm text-zinc-400">
                  Gagne des spins bonus en complétant des missions ou en tombant sur la bonne case !
                </p>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
                <h3 className="font-bold text-yellow-400 mb-2">Jackpot</h3>
                <p className="text-sm text-zinc-400">
                  Le jackpot grossit avec chaque spin. Tombe dessus pour tout remporter !
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
