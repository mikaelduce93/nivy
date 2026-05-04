/**
 * TEENS PARTY MOROCCO - Challenges Page
 * ======================================
 * Page fonctionnelle des défis entre amis
 */

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ChallengesClient } from "./challenges-client"
import { Swords, Trophy, Users, Zap } from "lucide-react"

export const metadata = {
  title: "Défis entre Amis | Teens Party Morocco",
  description: "Lance des défis à tes amis et gagne des XP bonus !",
}

export default async function ChallengesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/gamification/defis")
  }

  // Récupérer les types de défis disponibles
  const { data: challengeTypes } = await supabase
    .from("challenge_types")
    .select("*")
    .eq("is_active", true)
    .order("mode")

  // Récupérer les défis de l'utilisateur via RPC
  const { data: userChallenges } = await supabase.rpc("get_user_challenges", {
    p_user_id: user.id,
    p_status: null,
  })

  // Récupérer les amis pour inviter
  const { data: friends } = await supabase
    .from("friendships")
    .select(`
      friend:friend_id (
        id,
        pseudo,
        avatar_url
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "accepted")

  const friendsList = friends?.map((f: any) => f.friend).filter(Boolean) || []

  // Statistiques
  const challenges = userChallenges || []
  const activeChallenges = challenges.filter((c: any) => c.status === "active")
  const pendingChallenges = challenges.filter((c: any) => c.status === "pending")
  const completedChallenges = challenges.filter((c: any) => c.status === "completed")
  const wonChallenges = completedChallenges.filter((c: any) => c.winner_id === user.id)

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <div className="pt-32 pb-20">
        <div className="container mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 mb-6">
              <Swords className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 mb-4">
              Défis entre Amis
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Lance des défis à tes amis et prouve que tu es le meilleur !
            </p>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto">
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Zap className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{activeChallenges.length}</p>
              <p className="text-xs text-zinc-500">En cours</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Users className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{pendingChallenges.length}</p>
              <p className="text-xs text-zinc-500">En attente</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Trophy className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{wonChallenges.length}</p>
              <p className="text-xs text-zinc-500">Victoires</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Swords className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{completedChallenges.length}</p>
              <p className="text-xs text-zinc-500">Terminés</p>
            </div>
          </div>

          {/* Main Content */}
          <ChallengesClient
            challengeTypes={challengeTypes || []}
            challenges={challenges}
            friends={friendsList}
            userId={user.id}
          />
        </div>
      </div>

      <Footer />
    </div>
  )
}
