/**
 * TEENS PARTY MOROCCO - Gamification Hub
 * =======================================
 * Page principale de la gamification avec accès à toutes les fonctionnalités
 */

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  Trophy,
  Zap,
  Target,
  Compass,
  ShoppingBag,
  Users,
  Swords,
  Crown,
  Medal,
  Flame,
  ChevronRight,
  Sparkles,
  Layers,
} from "lucide-react"

export const metadata = {
  title: "Gamification | Teens Party Morocco",
  description: "Gagne des XP, débloque des badges et grimpe dans le classement !",
}

export default async function GamificationPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/gamification")
  }

  // Récupérer les stats utilisateur
  const { data: userXp } = await supabase
    .from("user_xp")
    .select("total_xp, current_level, weekly_xp")
    .eq("teen_id", user.id)
    .limit(1)
    .maybeSingle()

  // Récupérer le nombre de badges débloqués
  const { count: badgesCount } = await supabase
    .from("user_achievements")
    .select("*", { count: "exact", head: true })
    .eq("teen_id", user.id)
    .eq("is_unlocked", true)

  // Récupérer les missions actives
  const { data: missions } = await supabase.rpc("get_user_missions", {
    p_mission_type: null,
    p_status: "active",
    p_teen_id: user.id,
  })

  // Récupérer le rang
  const { data: leaderboard } = await supabase
    .from("user_xp")
    .select("teen_id")
    .order("total_xp", { ascending: false })
    .limit(100)

  const myRank = leaderboard?.findIndex((e) => e.teen_id === user.id) ?? -1
  const rank = myRank !== -1 ? myRank + 1 : null

  // Récupérer le crew
  const { data: userCrew } = await supabase.rpc("get_user_crew", {
    p_user_id: user.id,
  })

  // Vérifier si peut tourner la roue
  const { data: canSpin } = await supabase.rpc("can_spin_wheel", {
    p_user_id: user.id,
  })

  const features = [
    {
      href: "/gamification/missions",
      icon: Target,
      label: "Missions",
      description: "Complete des objectifs quotidiens",
      color: "#22c55e",
      badge: missions?.length || null,
    },
    {
      href: "/gamification/roue",
      icon: Compass,
      label: "Roue de la Fortune",
      description: "Tourne et gagne des récompenses",
      color: "#a855f7",
      badge: canSpin?.can_spin_daily ? "!" : null,
    },
    {
      href: "/gamification/defis",
      icon: Swords,
      label: "Défis",
      description: "Affronte tes amis",
      color: "#f97316",
      badge: null,
    },
    {
      href: "/teen/wallet?tab=shop",
      icon: ShoppingBag,
      label: "Boutique",
      description: "Dépense tes XP",
      color: "#ec4899",
      badge: null,
    },
    {
      href: "/gamification/crews",
      icon: Users,
      label: "Crews",
      description: userCrew?.crew ? userCrew.crew.name : "Rejoins un crew",
      color: "#3b82f6",
      badge: null,
    },
    {
      href: "/gamification/leaderboard",
      icon: Trophy,
      label: "Leaderboard",
      description: rank ? `Tu es #${rank}` : "Découvre ton rang",
      color: "#eab308",
      badge: null,
    },
    {
      href: "/gamification/collections",
      icon: Layers,
      label: "Collections",
      description: "Collectionne des items rares",
      color: "#f59e0b",
      badge: null,
    },
  ]

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 mb-6" aria-hidden="true">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mb-4 text-balance">
              Gamification
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto text-balance">
              Gagne des XP, débloque des badges et deviens le meilleur !
            </p>
          </header>

          {/* User Stats */}
          <section aria-label="Tes statistiques" className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12 max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-4 text-center">
              <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-2" aria-hidden="true" />
              <p className="text-2xl md:text-3xl font-black text-white tabular-nums">{userXp?.total_xp?.toLocaleString() || 0}</p>
              <p className="text-xs text-yellow-400/80">XP Total</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-4 text-center">
              <Crown className="w-8 h-8 text-purple-400 mx-auto mb-2" aria-hidden="true" />
              <p className="text-2xl md:text-3xl font-black text-white tabular-nums">{userXp?.current_level || 1}</p>
              <p className="text-xs text-purple-400/80">Niveau</p>
            </div>
            <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-2xl p-4 text-center">
              <Medal className="w-8 h-8 text-cyan-400 mx-auto mb-2" aria-hidden="true" />
              <p className="text-2xl md:text-3xl font-black text-white tabular-nums">{badgesCount || 0}</p>
              <p className="text-xs text-cyan-400/80">Badges</p>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-4 text-center">
              <Flame className="w-8 h-8 text-green-400 mx-auto mb-2" aria-hidden="true" />
              <p className="text-2xl md:text-3xl font-black text-white tabular-nums">{userXp?.weekly_xp?.toLocaleString() || 0}</p>
              <p className="text-xs text-green-400/80">XP Semaine</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-2xl p-4 text-center col-span-2 md:col-span-1">
              <Trophy className="w-8 h-8 text-orange-400 mx-auto mb-2" aria-hidden="true" />
              <p className="text-2xl md:text-3xl font-black text-white tabular-nums">#{rank || "–"}</p>
              <p className="text-xs text-orange-400/80">Classement</p>
            </div>
          </section>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Link
                  key={feature.href}
                  href={feature.href}
                  className="group relative p-6 rounded-2xl border transition-all hover:scale-[1.02] hover:shadow-xl"
                  style={{
                    backgroundColor: `${feature.color}10`,
                    borderColor: `${feature.color}30`,
                  }}
                >
                  {/* Badge */}
                  {feature.badge && (
                    <div className="absolute top-4 right-4">
                      <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                        {feature.badge}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${feature.color}20` }}
                    >
                      <Icon className="w-7 h-7" style={{ color: feature.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-lg mb-1">{feature.label}</h3>
                      <p className="text-sm text-zinc-400">{feature.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:translate-x-1 transition-transform shrink-0 mt-2" />
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="mt-12 max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-white mb-4 text-center">Actions rapides</h2>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/gamification/roue"
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:from-purple-400 hover:to-pink-400 transition-colors"
              >
                Tourner la Roue
              </Link>
              <Link
                href="/gamification/leaderboard"
                className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-xl hover:from-yellow-400 hover:to-orange-400 transition-colors"
              >
                Voir le Classement
              </Link>
            </div>
          </div>
      </div>
    </div>
  )
}
