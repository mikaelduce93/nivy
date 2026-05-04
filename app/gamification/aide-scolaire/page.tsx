"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BookOpen,
  Trophy,
  Star,
  Zap,
  Target,
  Calendar,
  Clock,
  TrendingUp,
  Award,
  Medal,
  Crown,
  Sparkles,
  Gift,
  Lock,
  CheckCircle2,
  ChevronRight,
  Users,
  Flame
} from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  xpReward: number
  unlocked: boolean
  progress?: number
  maxProgress?: number
  rarity: "common" | "rare" | "epic" | "legendary"
  category: "streak" | "mastery" | "social" | "milestone"
}

interface LeaderboardEntry {
  rank: number
  user: {
    name: string
    avatar?: string
  }
  xp: number
  streak: number
  isCurrentUser?: boolean
}

export default function GamificationAideScolairePage() {
  const [activeTab, setActiveTab] = useState("overview")

  const userStats = {
    totalXP: 12500,
    level: 15,
    levelProgress: 65,
    currentStreak: 12,
    longestStreak: 28,
    challengesCompleted: 156,
    hoursStudied: 48,
    rank: 23,
    totalUsers: 1250
  }

  const achievements: Achievement[] = [
    {
      id: "1",
      name: "Premier Pas",
      description: "Complète ton premier défi scolaire",
      icon: "star",
      xpReward: 50,
      unlocked: true,
      rarity: "common",
      category: "milestone"
    },
    {
      id: "2",
      name: "Semaine Parfaite",
      description: "Complète des défis 7 jours d'affilée",
      icon: "flame",
      xpReward: 200,
      unlocked: true,
      rarity: "rare",
      category: "streak"
    },
    {
      id: "3",
      name: "Mathématicien",
      description: "Complète 50 défis de mathématiques",
      icon: "calculator",
      xpReward: 500,
      unlocked: true,
      progress: 50,
      maxProgress: 50,
      rarity: "epic",
      category: "mastery"
    },
    {
      id: "4",
      name: "Mentor",
      description: "Aide 10 autres teens avec leurs études",
      icon: "users",
      xpReward: 300,
      unlocked: false,
      progress: 7,
      maxProgress: 10,
      rarity: "rare",
      category: "social"
    },
    {
      id: "5",
      name: "Inarrêtable",
      description: "Maintiens une série de 30 jours",
      icon: "zap",
      xpReward: 1000,
      unlocked: false,
      progress: 12,
      maxProgress: 30,
      rarity: "epic",
      category: "streak"
    },
    {
      id: "6",
      name: "Polyglotte",
      description: "Maîtrise 3 matières différentes",
      icon: "globe",
      xpReward: 750,
      unlocked: false,
      progress: 2,
      maxProgress: 3,
      rarity: "epic",
      category: "mastery"
    },
    {
      id: "7",
      name: "Légende Académique",
      description: "Atteins le niveau 50",
      icon: "crown",
      xpReward: 5000,
      unlocked: false,
      progress: 15,
      maxProgress: 50,
      rarity: "legendary",
      category: "milestone"
    },
    {
      id: "8",
      name: "100 Défis",
      description: "Complète 100 défis au total",
      icon: "trophy",
      xpReward: 400,
      unlocked: true,
      rarity: "rare",
      category: "milestone"
    }
  ]

  const weeklyLeaderboard: LeaderboardEntry[] = [
    { rank: 1, user: { name: "Sara M.", avatar: "/avatars/sara.jpg" }, xp: 2850, streak: 21 },
    { rank: 2, user: { name: "Ahmed B.", avatar: "/avatars/ahmed.jpg" }, xp: 2720, streak: 18 },
    { rank: 3, user: { name: "Lina C.", avatar: "/avatars/lina.jpg" }, xp: 2650, streak: 15 },
    { rank: 4, user: { name: "Karim T.", avatar: "/avatars/karim.jpg" }, xp: 2480, streak: 14 },
    { rank: 5, user: { name: "Yasmine E.", avatar: "/avatars/yasmine.jpg" }, xp: 2350, streak: 12, isCurrentUser: true },
    { rank: 6, user: { name: "Mehdi A.", avatar: "/avatars/mehdi.jpg" }, xp: 2200, streak: 11 },
    { rank: 7, user: { name: "Nadia R.", avatar: "/avatars/nadia.jpg" }, xp: 2100, streak: 10 },
    { rank: 8, user: { name: "Omar H.", avatar: "/avatars/omar.jpg" }, xp: 1980, streak: 9 },
    { rank: 9, user: { name: "Fatima Z.", avatar: "/avatars/fatima.jpg" }, xp: 1850, streak: 8 },
    { rank: 10, user: { name: "Youssef K.", avatar: "/avatars/youssef.jpg" }, xp: 1720, streak: 7 }
  ]

  const rewards = [
    {
      id: "1",
      name: "-10% Soirée",
      description: "Réduction sur ton prochain billet",
      cost: 2000,
      icon: "ticket",
      available: true
    },
    {
      id: "2",
      name: "Badge Exclusif",
      description: "Badge 'Génie' sur ton profil",
      cost: 5000,
      icon: "badge",
      available: true
    },
    {
      id: "3",
      name: "VIP Pass 1 mois",
      description: "Accès VIP pendant 1 mois",
      cost: 15000,
      icon: "crown",
      available: false
    },
    {
      id: "4",
      name: "Entrée gratuite",
      description: "Une entrée offerte à un événement",
      cost: 10000,
      icon: "gift",
      available: true
    }
  ]

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common": return "text-zinc-400 border-zinc-500/30"
      case "rare": return "text-blue-400 border-blue-500/30"
      case "epic": return "text-purple-400 border-purple-500/30"
      case "legendary": return "text-yellow-400 border-yellow-500/30"
      default: return "text-zinc-400 border-zinc-500/30"
    }
  }

  const getRarityBg = (rarity: string) => {
    switch (rarity) {
      case "common": return "bg-zinc-500/10"
      case "rare": return "bg-blue-500/10"
      case "epic": return "bg-purple-500/10"
      case "legendary": return "bg-gradient-to-br from-yellow-500/20 to-orange-500/20"
      default: return "bg-zinc-500/10"
    }
  }

  const getAchievementIcon = (icon: string) => {
    switch (icon) {
      case "star": return Star
      case "flame": return Flame
      case "calculator": return BookOpen
      case "users": return Users
      case "zap": return Zap
      case "globe": return Target
      case "crown": return Crown
      case "trophy": return Trophy
      default: return Star
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />
    if (rank === 2) return <Medal className="w-5 h-5 text-zinc-400" />
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />
    return <span className="text-zinc-400 font-bold">{rank}</span>
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-white mb-4 flex items-center justify-center gap-3">
            <BookOpen className="w-10 h-10 text-blue-400" />
            Académie XP
          </h1>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Gagne des XP en complétant des défis scolaires et débloque des récompenses exclusives!
          </p>
        </div>

        {/* User Level Card */}
        <Card className="mb-8 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <span className="text-4xl font-black text-white">{userStats.level}</span>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                  TOP {Math.round((userStats.rank / userStats.totalUsers) * 100)}%
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-black text-white mb-1">Niveau {userStats.level}</h2>
                <p className="text-zinc-400 mb-4">{userStats.totalXP.toLocaleString()} XP total</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Niveau {userStats.level + 1}</span>
                    <span className="text-blue-400">{userStats.levelProgress}%</span>
                  </div>
                  <Progress value={userStats.levelProgress} className="h-3" />
                  <p className="text-xs text-zinc-500">
                    {1000 - (userStats.levelProgress * 10)} XP restants pour le niveau suivant
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <Flame className="w-6 h-6 text-orange-400 mx-auto mb-1" />
                  <p className="text-2xl font-black text-white">{userStats.currentStreak}</p>
                  <p className="text-xs text-zinc-400">Jours d'affilée</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="w-6 h-6 text-green-400 mx-auto mb-1" />
                  <p className="text-2xl font-black text-white">{userStats.challengesCompleted}</p>
                  <p className="text-xs text-zinc-400">Défis complétés</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-zinc-900 mb-8">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="achievements">Succès</TabsTrigger>
            <TabsTrigger value="leaderboard">Classement</TabsTrigger>
            <TabsTrigger value="rewards">Récompenses</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Stats */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4 text-center">
                      <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                      <p className="text-2xl font-black text-white">#{userStats.rank}</p>
                      <p className="text-xs text-zinc-400">Classement</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4 text-center">
                      <Flame className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                      <p className="text-2xl font-black text-white">{userStats.longestStreak}</p>
                      <p className="text-xs text-zinc-400">Record série</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4 text-center">
                      <Clock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                      <p className="text-2xl font-black text-white">{userStats.hoursStudied}h</p>
                      <p className="text-xs text-zinc-400">Temps étudié</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4 text-center">
                      <Award className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                      <p className="text-2xl font-black text-white">{achievements.filter(a => a.unlocked).length}</p>
                      <p className="text-xs text-zinc-400">Succès débloqués</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Achievements */}
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-purple-400" />
                        Succès récents
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab("achievements")}>
                        Voir tout <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {achievements.filter(a => a.unlocked).slice(0, 3).map(achievement => {
                        const Icon = getAchievementIcon(achievement.icon)
                        return (
                          <div
                            key={achievement.id}
                            className={`flex items-center gap-4 p-3 rounded-lg ${getRarityBg(achievement.rarity)}`}
                          >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${getRarityColor(achievement.rarity)}`}>
                              <Icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-white">{achievement.name}</p>
                              <p className="text-xs text-zinc-400">{achievement.description}</p>
                            </div>
                            <Badge className={getRarityColor(achievement.rarity)}>
                              +{achievement.xpReward} XP
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Mini Leaderboard */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-400" />
                      Top 5 cette semaine
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab("leaderboard")}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {weeklyLeaderboard.slice(0, 5).map((entry) => (
                      <div
                        key={entry.rank}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          entry.isCurrentUser ? "bg-blue-500/10 border border-blue-500/30" : "bg-zinc-800/50"
                        }`}
                      >
                        <div className="w-8 flex justify-center">
                          {getRankIcon(entry.rank)}
                        </div>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={entry.user.avatar} />
                          <AvatarFallback>{entry.user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{entry.user.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-400">{entry.xp.toLocaleString()}</p>
                          <p className="text-xs text-zinc-500">XP</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map(achievement => {
                const Icon = getAchievementIcon(achievement.icon)
                return (
                  <Card
                    key={achievement.id}
                    className={`bg-zinc-900 border-zinc-800 ${!achievement.unlocked ? "opacity-60" : ""}`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${
                          achievement.unlocked ? getRarityColor(achievement.rarity) : "border-zinc-700"
                        } ${getRarityBg(achievement.rarity)}`}>
                          {achievement.unlocked ? (
                            <Icon className={`w-7 h-7 ${getRarityColor(achievement.rarity).split(' ')[0]}`} />
                          ) : (
                            <Lock className="w-7 h-7 text-zinc-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white">{achievement.name}</h3>
                            {achievement.unlocked && (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          <p className="text-sm text-zinc-400 mb-2">{achievement.description}</p>

                          {achievement.progress !== undefined && achievement.maxProgress && (
                            <div className="mb-2">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-zinc-500">Progression</span>
                                <span className="text-zinc-400">{achievement.progress}/{achievement.maxProgress}</span>
                              </div>
                              <Progress value={(achievement.progress / achievement.maxProgress) * 100} className="h-2" />
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <Badge className={getRarityColor(achievement.rarity)}>
                              {achievement.rarity === "common" ? "Commun" :
                               achievement.rarity === "rare" ? "Rare" :
                               achievement.rarity === "epic" ? "Épique" : "Légendaire"}
                            </Badge>
                            <span className="text-sm font-bold text-purple-400">+{achievement.xpReward} XP</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Classement hebdomadaire</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {weeklyLeaderboard.map((entry) => (
                    <div
                      key={entry.rank}
                      className={`flex items-center gap-4 p-4 rounded-lg ${
                        entry.isCurrentUser
                          ? "bg-blue-500/10 border border-blue-500/30"
                          : entry.rank <= 3
                          ? "bg-gradient-to-r from-yellow-500/10 to-transparent"
                          : "bg-zinc-800/50"
                      }`}
                    >
                      <div className="w-10 flex justify-center">
                        {getRankIcon(entry.rank)}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={entry.user.avatar} />
                        <AvatarFallback>{entry.user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white">
                          {entry.user.name}
                          {entry.isCurrentUser && <span className="text-blue-400 ml-2">(Toi)</span>}
                        </p>
                        <p className="text-xs text-zinc-400 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-400" />
                          {entry.streak} jours d'affilée
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-blue-400">{entry.xp.toLocaleString()}</p>
                        <p className="text-xs text-zinc-500">XP cette semaine</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards">
            <div className="mb-6">
              <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-zinc-400">Tes XP disponibles</p>
                      <p className="text-4xl font-black text-white">{userStats.totalXP.toLocaleString()} XP</p>
                    </div>
                    <Sparkles className="w-12 h-12 text-purple-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {rewards.map(reward => (
                <Card key={reward.id} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-5 text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-4">
                      <Gift className="w-8 h-8 text-purple-400" />
                    </div>
                    <h3 className="font-bold text-white mb-1">{reward.name}</h3>
                    <p className="text-sm text-zinc-400 mb-4">{reward.description}</p>
                    <p className="text-xl font-black text-purple-400 mb-4">{reward.cost.toLocaleString()} XP</p>
                    <Button
                      className={reward.available && userStats.totalXP >= reward.cost
                        ? "w-full bg-purple-500 hover:bg-purple-600"
                        : "w-full"
                      }
                      disabled={!reward.available || userStats.totalXP < reward.cost}
                    >
                      {!reward.available ? "Bientôt" :
                       userStats.totalXP < reward.cost ? "XP insuffisants" : "Échanger"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* CTA */}
        <Card className="mt-8 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/30">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-black text-white mb-2">Prêt à gagner plus d'XP?</h3>
            <p className="text-zinc-400 mb-4">Continue tes défis scolaires pour monter en niveau!</p>
            <Button asChild className="bg-blue-500 hover:bg-blue-600">
              <Link href="/teen/aide-scolaire">
                <BookOpen className="w-4 h-4 mr-2" />
                Voir les défis
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
