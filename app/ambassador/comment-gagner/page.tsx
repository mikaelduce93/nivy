// V1.2 TODO: This page mixes the legacy points/level model with the
// whitepaper §12 commission model (cash track + xp_only track). Once the
// `ambassador_commissions` schema lands, restructure as:
//   1) Commission rates by tier (bronze 10% / silver 12% / gold 15%)
//   2) XP-only track explainer for under-18 ambassadors
//   3) Marketing actions as supplementary points (current content)
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  Video,
  Camera,
  Calendar,
  Star,
  Trophy,
  Gift,
  ArrowRight,
  Zap,
  Heart,
  Share2,
  MessageCircle,
} from "lucide-react"
import Link from "next/link"

const EARNING_METHODS = [
  {
    icon: Users,
    title: "Parraine des familles",
    description: "Invite des parents et ados à rejoindre Nivy avec ton code parrainage",
    points: 100,
    per: "famille inscrite",
    bonus: "+ commission cash sur chaque top-up parental",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Video,
    title: "Crée du contenu TikTok",
    description: "Poste une vidéo sur TikTok avec le hashtag #NivyMaroc",
    points: 50,
    per: "vidéo validée",
    bonus: "+50 si la vidéo dépasse 10k vues",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Camera,
    title: "Crée du contenu Instagram",
    description: "Story ou post avec mention @nivy.ma",
    points: 30,
    per: "contenu validé",
    bonus: "+20 si Reels avec plus de 5k vues",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Calendar,
    title: "Participe aux événements partenaires",
    description: "Sois présent aux événements de notre réseau partenaire",
    points: 75,
    per: "événement",
    bonus: "x2 si tu ramènes 3+ familles",
    color: "from-orange-500 to-amber-500",
  },
  {
    icon: Star,
    title: "Missions spéciales",
    description: "Complète les missions exclusives dans ton dashboard",
    points: "Variable",
    per: "mission",
    bonus: "Certaines missions donnent jusqu'à 500 pts",
    color: "from-yellow-500 to-orange-500",
  },
  {
    icon: Heart,
    title: "Engagement communauté",
    description: "Aide les autres membres sur Discord/WhatsApp",
    points: 10,
    per: "aide validée",
    bonus: "Badge 'Helper' après 50 aides",
    color: "from-red-500 to-pink-500",
  },
]

const BONUS_STREAKS = [
  { days: 7, bonus: "+50 pts", label: "1 semaine active" },
  { days: 14, bonus: "+150 pts", label: "2 semaines active" },
  { days: 30, bonus: "+500 pts", label: "1 mois actif" },
  { days: 90, bonus: "+2000 pts", label: "3 mois actif" },
]

const LEVEL_REWARDS = [
  { level: "Bronze", points: "0-499", perks: "Accès boutique basic" },
  { level: "Silver", points: "500-1499", perks: "Réductions -10% sur events" },
  { level: "Gold", points: "1500-2999", perks: "Accès anticipé aux billets" },
  { level: "Platinum", points: "3000+", perks: "Invitations VIP + cadeaux exclusifs" },
]

export default function CommentGagnerPage() {
  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white">Comment gagner avec Nivy</h1>
        <p className="text-zinc-400">
          Cash sur chaque famille parrainée, plus des points bonus pour les
          actions marketing — choisis ton mix.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <CardContent className="p-4 text-center">
            <Zap className="h-8 w-8 mx-auto text-purple-400 mb-2" />
            <p className="text-2xl font-bold text-white">100+</p>
            <p className="text-sm text-purple-300">Points par parrainage</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30">
          <CardContent className="p-4 text-center">
            <Gift className="h-8 w-8 mx-auto text-cyan-400 mb-2" />
            <p className="text-2xl font-bold text-white">30+</p>
            <p className="text-sm text-cyan-300">Cadeaux disponibles</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
          <CardContent className="p-4 text-center">
            <Trophy className="h-8 w-8 mx-auto text-yellow-400 mb-2" />
            <p className="text-2xl font-bold text-white">50 pts</p>
            <p className="text-sm text-yellow-300">Minimum pour un cadeau</p>
          </CardContent>
        </Card>
      </div>

      {/* Earning Methods */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Actions qui rapportent</h2>

        <div className="grid md:grid-cols-2 gap-4">
          {EARNING_METHODS.map((method, i) => (
            <Card key={i} className="overflow-hidden">
              <div className={`h-1 bg-gradient-to-r ${method.color}`} />
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center flex-shrink-0`}
                  >
                    <method.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white mb-1">{method.title}</h3>
                    <p className="text-sm text-zinc-400 mb-3">{method.description}</p>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                        +{method.points} pts / {method.per}
                      </Badge>
                      {method.bonus && (
                        <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">
                          {method.bonus}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Streak Bonuses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-400" />
            Bonus de série
          </CardTitle>
          <CardDescription>
            Reste actif plusieurs jours consécutifs pour des bonus supplémentaires
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {BONUS_STREAKS.map((streak, i) => (
              <div
                key={i}
                className="text-center p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20"
              >
                <p className="text-3xl font-black text-orange-400">{streak.days}</p>
                <p className="text-xs text-zinc-400 mb-2">jours</p>
                <Badge className="bg-orange-500/20 text-orange-300">{streak.bonus}</Badge>
                <p className="text-xs text-zinc-500 mt-2">{streak.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Level System */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            Niveaux ambassadeur
          </CardTitle>
          <CardDescription>
            Monte de niveau pour débloquer des avantages exclusifs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {LEVEL_REWARDS.map((level, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-lg bg-zinc-900 border border-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    className={`
                    ${level.level === "Bronze" && "bg-orange-600/30 text-orange-300"}
                    ${level.level === "Silver" && "bg-zinc-400/30 text-zinc-200"}
                    ${level.level === "Gold" && "bg-yellow-500/30 text-yellow-300"}
                    ${level.level === "Platinum" && "bg-purple-500/30 text-purple-300"}
                  `}
                  >
                    {level.level}
                  </Badge>
                  <span className="text-zinc-400">{level.points} pts</span>
                </div>
                <span className="text-sm text-white">{level.perks}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pro Tips */}
      <Card className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-cyan-400" />
            Conseils de pro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Share2 className="h-5 w-5 text-cyan-400 mt-0.5" />
            <p className="text-sm text-zinc-300">
              <strong>Partage ton code parrainage</strong> dans ta bio Instagram et TikTok pour des
              parrainages passifs
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Video className="h-5 w-5 text-pink-400 mt-0.5" />
            <p className="text-sm text-zinc-300">
              <strong>Les TikToks rapportent plus</strong> car ils ont plus de potentiel viral.
              N'hésite pas à montrer l'ambiance des events !
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-orange-400 mt-0.5" />
            <p className="text-sm text-zinc-300">
              <strong>Viens aux events avec des amis</strong> pour multiplier tes points par 2
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-yellow-400 mt-0.5" />
            <p className="text-sm text-zinc-300">
              <strong>Reste actif chaque jour</strong> pour les bonus de série - ça s'accumule vite
              !
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button asChild size="lg" className="bg-purple-500 hover:bg-purple-600">
          <Link href="/ambassador/boutique">
            <Gift className="h-5 w-5 mr-2" />
            Voir les cadeaux
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/ambassador/missions">
            <Star className="h-5 w-5 mr-2" />
            Voir les missions
          </Link>
        </Button>
      </div>
    </div>
  )
}
