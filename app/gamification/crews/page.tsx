/**
 * TEENS PARTY MOROCCO - Crews Page
 * ==================================
 * Page fonctionnelle des Crews
 */

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CrewsClient } from "./crews-client"
import { Users, Trophy, Zap, Crown } from "lucide-react"

export const metadata = {
  title: "Crews | Teens Party Morocco",
  description: "Rejoins ou crée un crew et domine le leaderboard ensemble !",
}

export default async function CrewsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/gamification/crews")
  }

  // Récupérer le crew de l'utilisateur
  const { data: userCrew } = await supabase.rpc("get_user_crew", {
    p_user_id: user.id,
  })

  // Récupérer tous les crews publics
  const { data: publicCrews } = await supabase
    .from("crews")
    .select(`
      *,
      members_count:crew_members(count)
    `)
    .eq("is_public", true)
    .order("total_xp", { ascending: false })
    .limit(20)

  // Récupérer le leaderboard des crews
  const { data: crewLeaderboard } = await supabase
    .from("crews")
    .select("id, name, slug, description, motto, color, avatar_url, total_xp, current_level, is_public, requires_approval")
    .order("total_xp", { ascending: false })
    .limit(10)

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <div className="pt-32 pb-20">
        <div className="container mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 mb-6">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-4">
              Crews
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Rejoins un crew ou crée le tien pour dominer le leaderboard ensemble !
            </p>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto">
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{publicCrews?.length || 0}</p>
              <p className="text-xs text-zinc-500">Crews actifs</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{userCrew?.crew_rank || "-"}</p>
              <p className="text-xs text-zinc-500">Rang de ton crew</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Zap className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{userCrew?.crew?.total_xp?.toLocaleString() || 0}</p>
              <p className="text-xs text-zinc-500">XP du crew</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Crown className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{userCrew?.crew?.current_level || 1}</p>
              <p className="text-xs text-zinc-500">Niveau crew</p>
            </div>
          </div>

          {/* Main Content */}
          <CrewsClient
            userCrew={userCrew}
            publicCrews={publicCrews || []}
            crewLeaderboard={crewLeaderboard || []}
            userId={user.id}
          />
        </div>
      </div>

      <Footer />
    </div>
  )
}
