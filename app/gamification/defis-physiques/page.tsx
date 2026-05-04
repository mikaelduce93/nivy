"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dumbbell,
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
  Flame,
  Heart,
  Timer,
  Video,
  Play
} from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Challenge {
  id: string
  name: string
  description: string
  category: "cardio" | "force" | "souplesse" | "equipe"
  difficulty: "easy" | "medium" | "hard" | "extreme"
  xpReward: number
  duration?: string
  completed: boolean
  videoRequired: boolean
}

interface LeaderboardEntry {
  rank: number
  user: {
    name: string
    avatar?: string
  }
  xp: number
  challenges: number
  isCurrentUser?: boolean
}

export default function GamificationDefisPhysiquesPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [categoryFilter, setCategoryFilter] = useState("all")

  const userStats = {
    totalXP: 8750,
    level: 12,
    levelProgress: 40,
    currentStreak: 8,
    longestStreak: 15,
    challengesCompleted: 67,
    totalTime: "32h",
    caloriesBurned: 12500,
    rank: 45
  }

  const challenges: Challenge[] = [
    {
      id: "1",
      name: "100 Pompes Challenge",
      description: "Fais 100 pompes en une session",
      category: "force",
      difficulty: "hard",
      xpReward: 500,
      completed: true,
      videoRequired: true
    },
    {
      id: "2",
      name: "5km Run",
      description: "Cours 5km sans t'arrêter",
      category: "cardio",
      difficulty: "medium",
      xpReward: 400,
      duration: "30-45 min",
      completed: true,
      videoRequired: true
    },
    {
      id: "3",
      name: "Planche 3 minutes",
      description: "Tiens la position planche pendant 3 minutes",
      category: "force",
      difficulty: "hard",
      xpReward: 350,
      duration: "3 min",
      completed: false,
      videoRequired: true
    },
    {
      id: "4",
      name: "Yoga Flow",
      description: "Complete une session de yoga de 30 minutes",
      category: "souplesse",
      difficulty: "easy",
      xpReward: 200,
      duration: "30 min",
      completed: true,
      videoRequired: true
    },
    {
      id: "5",
      name: "Team Dance Battle",
      description: "Participe à un battle de danse en équipe",
      category: "equipe",
      difficulty: "medium",
      xpReward: 600,
      completed: false,
      videoRequired: true
    },
    {
      id: "6",
      name: "HIIT Warrior",
      description: "Complete une session HIIT de 20 minutes",
      category: "cardio",
      difficulty: "hard",
      xpReward: 450,
      duration: "20 min",
      completed: false,
      videoRequired: true
    }
  ]

  const achievements = [
    { id: "1", name: "Premier Effort", unlocked: true, xp: 50, icon: Star },
    { id: "2", name: "Sportif de la Semaine", unlocked: true, xp: 200, icon: Trophy },
    { id: "3", name: "Force de la Nature", unlocked: true, xp: 500, icon: Dumbbell },
    { id: "4", name: "Marathonien", unlocked: false, xp: 750, icon: Heart, progress: 15, max: 50 },
    { id: "5", name: "Légende du Sport", unlocked: false, xp: 2000, icon: Crown, progress: 67, max: 200 }
  ]

  const leaderboard: LeaderboardEntry[] = [
    { rank: 1, user: { name: "Karim T.", avatar: "/avatars/karim.jpg" }, xp: 15200, challenges: 89 },
    { rank: 2, user: { name: "Sara M.", avatar: "/avatars/sara.jpg" }, xp: 14800, challenges: 82 },
    { rank: 3, user: { name: "Ahmed B.", avatar: "/avatars/ahmed.jpg" }, xp: 13500, challenges: 78 },
    { rank: 4, user: { name: "Lina C.", avatar: "/avatars/lina.jpg" }, xp: 12200, challenges: 71 },
    { rank: 5, user: { name: "Mehdi A.", avatar: "/avatars/mehdi.jpg" }, xp: 11000, challenges: 65 },
    { rank: 6, user: { name: "Yasmine E.", avatar: "/avatars/yasmine.jpg" }, xp: 8750, challenges: 67, isCurrentUser: true }
  ]

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "cardio": return "bg-red-500/20 text-red-400 border-red-500/30"
      case "force": return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      case "souplesse": return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      case "equipe": return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      default: return "bg-zinc-500/20 text-zinc-400"
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "cardio": return Heart
      case "force": return Dumbbell
      case "souplesse": return Zap
      case "equipe": return Users
      default: return Target
    }
  }

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return <Badge className="bg-green-500/20 text-green-400">Facile</Badge>
      case "medium": return <Badge className="bg-yellow-500/20 text-yellow-400">Moyen</Badge>
      case "hard": return <Badge className="bg-orange-500/20 text-orange-400">Difficile</Badge>
      case "extreme": return <Badge className="bg-red-500/20 text-red-400">Extrême</Badge>
      default: return null
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />
    if (rank === 2) return <Medal className="w-5 h-5 text-zinc-400" />
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />
    return <span className="text-zinc-400 font-bold">{rank}</span>
  }

  const filteredChallenges = categoryFilter === "all"
    ? challenges
    : challenges.filter(c => c.category === categoryFilter)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-white mb-4 flex items-center justify-center gap-3">
            <Dumbbell className="w-10 h-10 text-orange-400" />
            Défis Physiques XP
          </h1>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Repousse tes limites et gagne des XP en complétant des défis sportifs!
          </p>
        </div>

        {/* User Stats Card */}
        <Card className="mb-8 bg-gradient-to-br from-orange-500/20 via-red-500/20 to-pink-500/20 border-orange-500/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <span className="text-4xl font-black text-white">{userStats.level}</span>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <Flame className="w-3 h-3" />{userStats.currentStreak}
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-black text-white mb-1">Niveau {userStats.level}</h2>
                <p className="text-zinc-400 mb-4">{userStats.totalXP.toLocaleString()} XP total</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Niveau {userStats.level + 1}</span>
                    <span className="text-orange-400">{userStats.levelProgress}%</span>
                  </div>
                  <Progress value={userStats.levelProgress} className="h-3" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <Heart className="w-5 h-5 text-red-400 mx-auto mb-1" />
                  <p className="text-lg font-black text-white">{userStats.caloriesBurned}</p>
                  <p className="text-xs text-zinc-400">Calories</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Timer className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <p className="text-lg font-black text-white">{userStats.totalTime}</p>
                  <p className="text-xs text-zinc-400">Temps total</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto mb-1" />
                  <p className="text-lg font-black text-white">{userStats.challengesCompleted}</p>
                  <p className="text-xs text-zinc-400">Défis</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                  <p className="text-lg font-black text-white">#{userStats.rank}</p>
                  <p className="text-xs text-zinc-400">Rang</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-zinc-900 mb-8">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="challenges">Défis</TabsTrigger>
            <TabsTrigger value="leaderboard">Classement</TabsTrigger>
            <TabsTrigger value="achievements">Succès</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Category Progress */}
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-white">Progression par catégorie</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { name: "Cardio", category: "cardio", completed: 18, total: 30 },
                        { name: "Force", category: "force", completed: 25, total: 35 },
                        { name: "Souplesse", category: "souplesse", completed: 12, total: 20 },
                        { name: "Équipe", category: "equipe", completed: 12, total: 15 }
                      ].map(cat => {
                        const Icon = getCategoryIcon(cat.category)
                        return (
                          <div key={cat.category} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Icon className={`w-5 h-5 ${getCategoryColor(cat.category).split(' ')[1]}`} />
                                <span className="text-white font-medium">{cat.name}</span>
                              </div>
                              <span className="text-sm text-zinc-400">{cat.completed}/{cat.total}</span>
                            </div>
                            <Progress value={(cat.completed / cat.total) * 100} className="h-2" />
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Challenges */}
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <span>Défis récents</span>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab("challenges")}>
                        Voir tout <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {challenges.slice(0, 3).map(challenge => {
                        const Icon = getCategoryIcon(challenge.category)
                        return (
                          <div
                            key={challenge.id}
                            className={`flex items-center gap-4 p-3 rounded-lg ${
                              challenge.completed ? "bg-green-500/10" : "bg-zinc-800/50"
                            }`}
                          >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getCategoryColor(challenge.category)}`}>
                              <Icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-white">{challenge.name}</p>
                                {challenge.completed && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                              </div>
                              <p className="text-xs text-zinc-400">{challenge.description}</p>
                            </div>
                            <Badge className="bg-purple-500/20 text-purple-400">
                              +{challenge.xpReward} XP
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
                      Top Sportifs
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {leaderboard.slice(0, 5).map((entry) => (
                      <div
                        key={entry.rank}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          entry.isCurrentUser ? "bg-orange-500/10 border border-orange-500/30" : "bg-zinc-800/50"
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
                          <p className="font-bold text-orange-400">{entry.xp.toLocaleString()}</p>
                          <p className="text-xs text-zinc-500">XP</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Challenges Tab */}
          <TabsContent value="challenges">
            <div className="flex gap-2 mb-6 flex-wrap">
              {["all", "cardio", "force", "souplesse", "equipe"].map(cat => (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter(cat)}
                  className={categoryFilter === cat ? "bg-orange-500 hover:bg-orange-600" : ""}
                >
                  {cat === "all" ? "Tous" :
                   cat === "cardio" ? "Cardio" :
                   cat === "force" ? "Force" :
                   cat === "souplesse" ? "Souplesse" : "Équipe"}
                </Button>
              ))}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChallenges.map(challenge => {
                const Icon = getCategoryIcon(challenge.category)
                return (
                  <Card key={challenge.id} className="bg-zinc-900 border-zinc-800 overflow-hidden">
                    <div className={`h-2 ${
                      challenge.category === "cardio" ? "bg-red-500" :
                      challenge.category === "force" ? "bg-orange-500" :
                      challenge.category === "souplesse" ? "bg-purple-500" : "bg-blue-500"
                    }`} />
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${getCategoryColor(challenge.category)}`}>
                          <Icon className="w-7 h-7" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white">{challenge.name}</h3>
                            {challenge.completed && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          </div>
                          <p className="text-sm text-zinc-400 mb-3">{challenge.description}</p>

                          <div className="flex items-center gap-2 mb-3">
                            {getDifficultyBadge(challenge.difficulty)}
                            {challenge.duration && (
                              <Badge variant="outline" className="text-zinc-400">
                                <Clock className="w-3 h-3 mr-1" />{challenge.duration}
                              </Badge>
                            )}
                            {challenge.videoRequired && (
                              <Badge variant="outline" className="text-zinc-400">
                                <Video className="w-3 h-3 mr-1" />Vidéo
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-lg font-black text-purple-400">+{challenge.xpReward} XP</span>
                            {!challenge.completed && (
                              <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                                <Play className="w-4 h-4 mr-1" />
                                Commencer
                              </Button>
                            )}
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
                <CardTitle className="text-white">Classement Global</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboard.map((entry) => (
                    <div
                      key={entry.rank}
                      className={`flex items-center gap-4 p-4 rounded-lg ${
                        entry.isCurrentUser
                          ? "bg-orange-500/10 border border-orange-500/30"
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
                          {entry.isCurrentUser && <span className="text-orange-400 ml-2">(Toi)</span>}
                        </p>
                        <p className="text-xs text-zinc-400">{entry.challenges} défis complétés</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-orange-400">{entry.xp.toLocaleString()}</p>
                        <p className="text-xs text-zinc-500">XP total</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map(achievement => {
                const Icon = achievement.icon
                return (
                  <Card
                    key={achievement.id}
                    className={`bg-zinc-900 border-zinc-800 ${!achievement.unlocked ? "opacity-60" : ""}`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${
                          achievement.unlocked
                            ? "bg-orange-500/20 border-orange-500/50"
                            : "bg-zinc-800 border-zinc-700"
                        }`}>
                          {achievement.unlocked ? (
                            <Icon className="w-7 h-7 text-orange-400" />
                          ) : (
                            <Lock className="w-7 h-7 text-zinc-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white">{achievement.name}</h3>
                            {achievement.unlocked && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          </div>

                          {achievement.progress !== undefined && achievement.max && (
                            <div className="mb-2">
                              <Progress value={(achievement.progress / achievement.max) * 100} className="h-2" />
                              <p className="text-xs text-zinc-500 mt-1">{achievement.progress}/{achievement.max}</p>
                            </div>
                          )}

                          <Badge className="bg-purple-500/20 text-purple-400">+{achievement.xp} XP</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* CTA */}
        <Card className="mt-8 bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/30">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-black text-white mb-2">Prêt pour un nouveau défi?</h3>
            <p className="text-zinc-400 mb-4">Va voir les défis disponibles et gagne des XP!</p>
            <Button asChild className="bg-orange-500 hover:bg-orange-600">
              <Link href="/teen/defis-physiques">
                <Dumbbell className="w-4 h-4 mr-2" />
                Voir les défis
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
