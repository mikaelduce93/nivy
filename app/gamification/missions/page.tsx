/**
 * TEENS PARTY MOROCCO - Missions Page
 * ====================================
 * Page fonctionnelle des missions quotidiennes et hebdomadaires
 */

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { MissionsClient } from "./missions-client"
import { Target, CheckCircle, Clock, Zap } from "lucide-react"

export const metadata = {
  title: "Missions | Teens Party Morocco",
  description: "Complete des missions quotidiennes et hebdomadaires pour gagner des XP !",
}

export default async function MissionsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/gamification/missions")
  }

  // Assigner les missions de la période si nécessaire
  await supabase.rpc("assign_missions_for_period", {
    p_user_id: user.id,
    p_period_type: "daily",
  })

  await supabase.rpc("assign_missions_for_period", {
    p_user_id: user.id,
    p_period_type: "weekly",
  })

  // Récupérer les missions de l'utilisateur
  const { data: missions } = await supabase.rpc("get_user_missions", {
    p_user_id: user.id,
    p_type: null,
    p_status: null,
    p_include_expired: false,
  })

  // Récupérer les stats
  const { data: statsData } = await supabase.rpc("get_mission_stats", {
    p_user_id: user.id,
  })

  const stats = statsData?.[0] || {
    total_completed: 0,
    total_xp_earned: 0,
    current_daily_streak: 0,
  }

  const missionsList = missions || []
  const activeMissions = missionsList.filter((m: any) => m.status === "active")
  const completedMissions = missionsList.filter((m: any) => m.status === "completed")
  const claimedMissions = missionsList.filter((m: any) => m.status === "claimed")

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <div className="pt-32 pb-20">
        <div className="container mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 mb-6">
              <Target className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 mb-4">
              Missions
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Complete des missions quotidiennes et hebdomadaires pour gagner des XP bonus !
            </p>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto">
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Target className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{activeMissions.length}</p>
              <p className="text-xs text-zinc-500">En cours</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{completedMissions.length}</p>
              <p className="text-xs text-zinc-500">A réclamer</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Clock className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{stats.current_daily_streak || 0}</p>
              <p className="text-xs text-zinc-500">Série de jours</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-center">
              <Zap className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{stats.total_xp_earned || 0}</p>
              <p className="text-xs text-zinc-500">XP gagnés</p>
            </div>
          </div>

          {/* Main Content */}
          <MissionsClient
            missions={missionsList}
            stats={stats}
          />
        </div>
      </div>

      <Footer />
    </div>
  )
}
