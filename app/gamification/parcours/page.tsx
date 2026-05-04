"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Map,
  Trophy,
  Star,
  Zap,
  Target,
  Lock,
  CheckCircle2,
  ChevronRight,
  Crown,
  Sparkles,
  Gift,
  BookOpen,
  Dumbbell,
  Music,
  Camera,
  Palette,
  Code,
  Gamepad2,
  Heart,
  Users,
  Award,
  Play,
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Milestone {
  id: string
  name: string
  description: string
  xpRequired: number
  completed: boolean
  current: boolean
  rewards: string[]
}

interface Path {
  id: string
  name: string
  description: string
  icon: any
  color: string
  progress: number
  totalSteps: number
  completedSteps: number
  xpEarned: number
  milestones: Milestone[]
}

export default function GamificationParcoursPage() {
  const [selectedPath, setSelectedPath] = useState<Path | null>(null)

  const userStats = {
    totalXP: 21250,
    level: 24,
    pathsCompleted: 2,
    totalPaths: 6,
    currentStreak: 15,
    badgesEarned: 18
  }

  const paths: Path[] = [
    {
      id: "academic",
      name: "Champion Académique",
      description: "Maîtrise les défis scolaires et deviens un expert",
      icon: BookOpen,
      color: "blue",
      progress: 75,
      totalSteps: 20,
      completedSteps: 15,
      xpEarned: 12500,
      milestones: [
        { id: "1", name: "Débutant", description: "Complète 5 défis", xpRequired: 500, completed: true, current: false, rewards: ["Badge Étudiant", "50 XP bonus"] },
        { id: "2", name: "Apprenti", description: "Atteins niveau 5", xpRequired: 2000, completed: true, current: false, rewards: ["Badge Apprenti", "Réduction 5%"] },
        { id: "3", name: "Érudit", description: "Maîtrise 2 matières", xpRequired: 5000, completed: true, current: false, rewards: ["Badge Érudit", "Avatar exclusif"] },
        { id: "4", name: "Expert", description: "Complète 50 défis", xpRequired: 10000, completed: false, current: true, rewards: ["Badge Expert", "Réduction 10%"] },
        { id: "5", name: "Champion", description: "Atteins niveau 30", xpRequired: 20000, completed: false, current: false, rewards: ["Badge Champion", "VIP 1 semaine"] }
      ]
    },
    {
      id: "fitness",
      name: "Athlète Élite",
      description: "Repousse tes limites physiques et sportives",
      icon: Dumbbell,
      color: "orange",
      progress: 40,
      totalSteps: 25,
      completedSteps: 10,
      xpEarned: 8750,
      milestones: [
        { id: "1", name: "Débutant", description: "Complète 5 défis sportifs", xpRequired: 500, completed: true, current: false, rewards: ["Badge Sportif", "50 XP bonus"] },
        { id: "2", name: "En forme", description: "7 jours consécutifs", xpRequired: 2000, completed: true, current: false, rewards: ["Badge Motivation", "Réduction 5%"] },
        { id: "3", name: "Athlète", description: "Brûle 5000 calories", xpRequired: 5000, completed: false, current: true, rewards: ["Badge Athlète", "Avatar exclusif"] },
        { id: "4", name: "Champion", description: "Complète 100 défis", xpRequired: 15000, completed: false, current: false, rewards: ["Badge Champion", "Réduction 15%"] },
        { id: "5", name: "Légende", description: "Top 10 classement", xpRequired: 25000, completed: false, current: false, rewards: ["Badge Légende", "VIP 1 mois"] }
      ]
    },
    {
      id: "social",
      name: "Star Sociale",
      description: "Connecte-toi et participe aux événements",
      icon: Users,
      color: "pink",
      progress: 60,
      totalSteps: 15,
      completedSteps: 9,
      xpEarned: 6200,
      milestones: [
        { id: "1", name: "Nouveau", description: "Participe à 1 événement", xpRequired: 300, completed: true, current: false, rewards: ["Badge Social", "30 XP bonus"] },
        { id: "2", name: "Actif", description: "5 amis ajoutés", xpRequired: 1000, completed: true, current: false, rewards: ["Badge Populaire", "Emoji exclusif"] },
        { id: "3", name: "Influenceur", description: "10 événements", xpRequired: 3000, completed: true, current: false, rewards: ["Badge Influenceur", "Réduction 10%"] },
        { id: "4", name: "Star", description: "50 amis", xpRequired: 8000, completed: false, current: true, rewards: ["Badge Star", "Avatar VIP"] },
        { id: "5", name: "Légende", description: "Ambassador status", xpRequired: 15000, completed: false, current: false, rewards: ["Badge Ambassador", "Revenus partagés"] }
      ]
    },
    {
      id: "creative",
      name: "Artiste Digital",
      description: "Exprime ta créativité et partage tes talents",
      icon: Palette,
      color: "purple",
      progress: 20,
      totalSteps: 20,
      completedSteps: 4,
      xpEarned: 2100,
      milestones: [
        { id: "1", name: "Créatif", description: "Partage 3 créations", xpRequired: 500, completed: true, current: false, rewards: ["Badge Créatif", "50 XP bonus"] },
        { id: "2", name: "Artiste", description: "50 likes reçus", xpRequired: 2000, completed: false, current: true, rewards: ["Badge Artiste", "Filtre exclusif"] },
        { id: "3", name: "Talentueux", description: "Featured sur la plateforme", xpRequired: 5000, completed: false, current: false, rewards: ["Badge Talentueux", "Mise en avant"] },
        { id: "4", name: "Virtuose", description: "1000 likes total", xpRequired: 10000, completed: false, current: false, rewards: ["Badge Virtuose", "Réduction 15%"] },
        { id: "5", name: "Maître", description: "Reconnaissance officielle", xpRequired: 20000, completed: false, current: false, rewards: ["Badge Maître", "Collab officielle"] }
      ]
    },
    {
      id: "gaming",
      name: "Pro Gamer",
      description: "Domine les tournois et compétitions gaming",
      icon: Gamepad2,
      color: "green",
      progress: 100,
      totalSteps: 15,
      completedSteps: 15,
      xpEarned: 15000,
      milestones: [
        { id: "1", name: "Joueur", description: "Participe à 1 tournoi", xpRequired: 500, completed: true, current: false, rewards: ["Badge Gamer", "50 XP bonus"] },
        { id: "2", name: "Compétiteur", description: "Top 50% tournoi", xpRequired: 2000, completed: true, current: false, rewards: ["Badge Compétiteur", "Skin exclusif"] },
        { id: "3", name: "Challenger", description: "Top 10 tournoi", xpRequired: 5000, completed: true, current: false, rewards: ["Badge Challenger", "Réduction 10%"] },
        { id: "4", name: "Pro", description: "Gagne un tournoi", xpRequired: 10000, completed: true, current: false, rewards: ["Badge Pro", "Place VIP"] },
        { id: "5", name: "Légende", description: "3 tournois gagnés", xpRequired: 15000, completed: true, current: false, rewards: ["Badge Légende", "Sponsor officiel"] }
      ]
    },
    {
      id: "music",
      name: "DJ Master",
      description: "Apprends le DJing et performe sur scène",
      icon: Music,
      color: "cyan",
      progress: 30,
      totalSteps: 20,
      completedSteps: 6,
      xpEarned: 3500,
      milestones: [
        { id: "1", name: "Novice", description: "Complète le tutoriel", xpRequired: 300, completed: true, current: false, rewards: ["Badge DJ", "30 XP bonus"] },
        { id: "2", name: "Mixer", description: "Premier mix uploadé", xpRequired: 1500, completed: true, current: false, rewards: ["Badge Mixer", "Sample pack"] },
        { id: "3", name: "Performer", description: "50 écoutes", xpRequired: 4000, completed: false, current: true, rewards: ["Badge Performer", "Cours avancé"] },
        { id: "4", name: "Star DJ", description: "Performance live", xpRequired: 10000, completed: false, current: false, rewards: ["Badge Star DJ", "Slot événement"] },
        { id: "5", name: "Legend", description: "Headline un événement", xpRequired: 20000, completed: false, current: false, rewards: ["Badge Legend", "Résidence DJ"] }
      ]
    }
  ]

  const getColorClasses = (color: string, type: "bg" | "text" | "border") => {
    const colors: Record<string, Record<string, string>> = {
      blue: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
      orange: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
      pink: { bg: "bg-pink-500/20", text: "text-pink-400", border: "border-pink-500/30" },
      purple: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
      green: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
      cyan: { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/30" }
    }
    return colors[color]?.[type] || ""
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-white mb-4 flex items-center justify-center gap-3">
            <Map className="w-10 h-10 text-emerald-400" />
            Mon Parcours
          </h1>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Progresse dans différents domaines et débloque des récompenses exclusives!
          </p>
        </div>

        {/* Global Stats */}
        <Card className="mb-8 bg-gradient-to-br from-emerald-500/20 via-cyan-500/20 to-blue-500/20 border-emerald-500/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                  <span className="text-4xl font-black text-white">{userStats.level}</span>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                  <Crown className="w-3 h-3 inline mr-1" />
                  {userStats.pathsCompleted}/{userStats.totalPaths}
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-black text-white mb-1">Niveau Global {userStats.level}</h2>
                <p className="text-zinc-400 mb-2">{userStats.totalXP.toLocaleString()} XP total</p>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <span className="text-white">{userStats.pathsCompleted} parcours complétés</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-400" />
                    <span className="text-white">{userStats.badgesEarned} badges gagnés</span>
                  </div>
                </div>
              </div>

              <div className="text-center p-4 rounded-lg bg-white/5">
                <Sparkles className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-2xl font-black text-white">{userStats.currentStreak}</p>
                <p className="text-xs text-zinc-400">Jours actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paths Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {paths.map(path => {
            const Icon = path.icon
            const isComplete = path.progress === 100
            return (
              <Card
                key={path.id}
                className={`bg-zinc-900 border-zinc-800 cursor-pointer transition-all hover:scale-[1.02] ${
                  isComplete ? "ring-2 ring-green-500/50" : ""
                }`}
                onClick={() => setSelectedPath(path)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${getColorClasses(path.color, "bg")} border ${getColorClasses(path.color, "border")}`}>
                      <Icon className={`w-7 h-7 ${getColorClasses(path.color, "text")}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white">{path.name}</h3>
                        {isComplete && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                      </div>
                      <p className="text-sm text-zinc-400">{path.description}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Progression</span>
                      <span className={getColorClasses(path.color, "text")}>{path.progress}%</span>
                    </div>
                    <Progress value={path.progress} className="h-2" />

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">{path.completedSteps}/{path.totalSteps} étapes</span>
                      <span className="text-purple-400 font-bold">{path.xpEarned.toLocaleString()} XP</span>
                    </div>
                  </div>

                  {/* Current Milestone Preview */}
                  {path.milestones.find(m => m.current) && (
                    <div className="mt-4 p-3 rounded-lg bg-zinc-800/50">
                      <div className="flex items-center gap-2 text-sm">
                        <Target className="w-4 h-4 text-yellow-400" />
                        <span className="text-zinc-400">Prochain objectif:</span>
                      </div>
                      <p className="text-white font-medium mt-1">
                        {path.milestones.find(m => m.current)?.name}
                      </p>
                    </div>
                  )}

                  <Button
                    className={`w-full mt-4 ${getColorClasses(path.color, "bg")} ${getColorClasses(path.color, "text")} hover:opacity-90`}
                    variant="outline"
                  >
                    Voir le parcours <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Selected Path Details */}
        {selectedPath && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-3">
                  <selectedPath.icon className={`w-6 h-6 ${getColorClasses(selectedPath.color, "text")}`} />
                  {selectedPath.name}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPath(null)}>
                  Fermer
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Milestones Timeline */}
              <div className="relative">
                {/* Progress Line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-zinc-800" />
                <div
                  className={`absolute left-6 top-0 w-0.5 ${getColorClasses(selectedPath.color, "bg").replace('/20', '')}`}
                  style={{ height: `${selectedPath.progress}%` }}
                />

                <div className="space-y-6">
                  {selectedPath.milestones.map((milestone, index) => (
                    <div key={milestone.id} className="relative flex gap-4">
                      {/* Node */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center z-10 ${
                        milestone.completed
                          ? `${getColorClasses(selectedPath.color, "bg")} border-2 ${getColorClasses(selectedPath.color, "border")}`
                          : milestone.current
                          ? "bg-yellow-500/20 border-2 border-yellow-500/50"
                          : "bg-zinc-800 border-2 border-zinc-700"
                      }`}>
                        {milestone.completed ? (
                          <CheckCircle2 className={`w-6 h-6 ${getColorClasses(selectedPath.color, "text")}`} />
                        ) : milestone.current ? (
                          <Play className="w-6 h-6 text-yellow-400" />
                        ) : (
                          <Lock className="w-5 h-5 text-zinc-600" />
                        )}
                      </div>

                      {/* Content */}
                      <div className={`flex-1 pb-6 ${
                        !milestone.completed && !milestone.current ? "opacity-50" : ""
                      }`}>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-bold text-white">{milestone.name}</h4>
                          {milestone.current && (
                            <Badge className="bg-yellow-500/20 text-yellow-400">En cours</Badge>
                          )}
                        </div>
                        <p className="text-sm text-zinc-400 mb-2">{milestone.description}</p>
                        <p className="text-xs text-purple-400 mb-3">{milestone.xpRequired.toLocaleString()} XP requis</p>

                        {/* Rewards */}
                        <div className="flex flex-wrap gap-2">
                          {milestone.rewards.map((reward, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              <Gift className="w-3 h-3 mr-1" />
                              {reward}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-6 border-t border-zinc-800">
                <Button className={`w-full bg-gradient-to-r from-${selectedPath.color}-500 to-${selectedPath.color}-600`}>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Continuer le parcours
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="mt-8 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Sparkles className="w-8 h-8 text-purple-400 mt-1" />
              <div>
                <h3 className="font-bold text-white mb-2">Comment ça marche?</h3>
                <ul className="text-sm text-zinc-400 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Choisis un ou plusieurs parcours selon tes intérêts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Complète des défis pour gagner des XP et progresser
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Débloque des étapes et gagne des récompenses exclusives
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Complète tous les parcours pour devenir une Légende!
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
