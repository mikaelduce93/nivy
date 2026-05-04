/**
 * TEENS PARTY MOROCCO - Leaderboard Page
 * =======================================
 * Page fonctionnelle du classement
 */

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { LeaderboardClient } from "./leaderboard-client"
import { Trophy, Medal, Crown, TrendingUp } from "lucide-react"

export const metadata = {
  title: "Leaderboard | Teens Party Morocco",
  description: "Découvre qui sont les meilleurs joueurs et crews !",
}

export default async function LeaderboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/gamification/leaderboard")
  }

  // Leaderboard global (tous les temps)
  const { data: allTimeLeaderboard } = await supabase
    .from("user_xp")
    .select(`
      teen_id,
      total_xp,
      current_level,
      teens!inner(pseudo, avatar_url)
    `)
    .order("total_xp", { ascending: false })
    .limit(50)

  // Leaderboard hebdomadaire
  const { data: weeklyLeaderboard } = await supabase
    .from("user_xp")
    .select(`
      teen_id,
      weekly_xp,
      current_level,
      teens!inner(pseudo, avatar_url)
    `)
    .order("weekly_xp", { ascending: false })
    .limit(50)

  // Leaderboard des crews
  const { data: crewLeaderboard } = await supabase
    .from("crews")
    .select("id, name, slug, color, avatar_url, total_xp, current_level")
    .order("total_xp", { ascending: false })
    .limit(20)

  // Rang de l'utilisateur
  const { data: userRank } = await supabase
    .from("user_xp")
    .select("total_xp, current_level")
    .eq("teen_id", user.id)
    .single()

  // Calculer le rang
  let myRank = 0
  if (userRank && allTimeLeaderboard) {
    const index = allTimeLeaderboard.findIndex((e: any) => e.teen_id === user.id)
    myRank = index !== -1 ? index + 1 : 0
  }

  // Transformer les données
  const transformedAllTime = allTimeLeaderboard?.map((entry: any) => ({
    id: entry.teen_id,
    pseudo: entry.teens.pseudo,
    avatar_url: entry.teens.avatar_url,
    xp: entry.total_xp,
    level: entry.current_level,
  })) || []

  const transformedWeekly = weeklyLeaderboard?.map((entry: any) => ({
    id: entry.teen_id,
    pseudo: entry.teens.pseudo,
    avatar_url: entry.teens.avatar_url,
    xp: entry.weekly_xp,
    level: entry.current_level,
  })) || []

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <div className="pt-32 pb-20">
        <div className="container mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 mb-6">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 mb-4">
              Leaderboard
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Découvre qui sont les meilleurs joueurs !
            </p>
          </div>

          {/* User Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto">
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">#{myRank || "-"}</p>
              <p className="text-xs text-zinc-500">Ton rang</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Medal className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{userRank?.current_level || 1}</p>
              <p className="text-xs text-zinc-500">Ton niveau</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{userRank?.total_xp?.toLocaleString() || 0}</p>
              <p className="text-xs text-zinc-500">Ton XP</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Crown className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{transformedAllTime.length}</p>
              <p className="text-xs text-zinc-500">Joueurs actifs</p>
            </div>
          </div>

          {/* Main Content */}
          <LeaderboardClient
            allTimeLeaderboard={transformedAllTime}
            weeklyLeaderboard={transformedWeekly}
            crewLeaderboard={crewLeaderboard || []}
            userId={user.id}
            myRank={myRank}
          />
        </div>
      </div>

      <Footer />
    </div>
  )
}
