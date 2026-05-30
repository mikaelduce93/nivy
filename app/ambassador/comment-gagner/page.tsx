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
    color: "from-teal to-teal",
  },
  {
    icon: Video,
    title: "Crée du contenu TikTok",
    description: "Poste une vidéo sur TikTok avec le hashtag #NivyMaroc",
    points: 50,
    per: "vidéo validée",
    bonus: "+50 si la vidéo dépasse 10k vues",
    color: "from-pink to-pink",
  },
  {
    icon: Camera,
    title: "Crée du contenu Instagram",
    description: "Story ou post avec mention @nivy.ma",
    points: 30,
    per: "contenu validé",
    bonus: "+20 si Reels avec plus de 5k vues",
    color: "from-pink to-pink",
  },
  {
    icon: Calendar,
    title: "Participe aux événements partenaires",
    description: "Sois présent aux événements de notre réseau partenaire",
    points: 75,
    per: "événement",
    bonus: "x2 si tu ramènes 3+ familles",
    color: "from-coral to-gold",
  },
  {
    icon: Star,
    title: "Missions spéciales",
    description: "Complète les missions exclusives dans ton dashboard",
    points: "Variable",
    per: "mission",
    bonus: "Certaines missions donnent jusqu'à 500 pts",
    color: "from-gold to-coral",
  },
  {
    icon: Heart,
    title: "Engagement communauté",
    description: "Aide les autres membres sur Discord/WhatsApp",
    points: 10,
    per: "aide validée",
    bonus: "Badge 'Helper' après 50 aides",
    color: "from-destructive to-pink",
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
        <h1 className="text-3xl font-black text-ink">Comment gagner avec Nivy</h1>
        <p className="text-mute">
          Cash sur chaque famille parrainée, plus des points bonus pour les
          actions marketing — choisis ton mix.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-pink/20 to-pink/20 border-pink/30">
          <CardContent className="p-4 text-center">
            <Zap className="h-8 w-8 mx-auto text-pink mb-2" />
            <p className="text-2xl font-bold text-ink">100+</p>
            <p className="text-sm text-pink">Points par parrainage</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-teal/20 to-teal/20 border-teal/30">
          <CardContent className="p-4 text-center">
            <Gift className="h-8 w-8 mx-auto text-teal mb-2" />
            <p className="text-2xl font-bold text-ink">30+</p>
            <p className="text-sm text-teal">Cadeaux disponibles</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gold/20 to-coral/20 border-gold/30">
          <CardContent className="p-4 text-center">
            <Trophy className="h-8 w-8 mx-auto text-gold mb-2" />
            <p className="text-2xl font-bold text-ink">50 pts</p>
            <p className="text-sm text-gold">Minimum pour un cadeau</p>
          </CardContent>
        </Card>
      </div>

      {/* Earning Methods */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-ink">Actions qui rapportent</h2>

        <div className="grid md:grid-cols-2 gap-4">
          {EARNING_METHODS.map((method, i) => (
            <Card key={i} className="overflow-hidden">
              <div className={`h-1 bg-gradient-to-r ${method.color}`} />
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center flex-shrink-0`}
                  >
                    <method.icon className="h-6 w-6 text-ink" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-ink mb-1">{method.title}</h3>
                    <p className="text-sm text-mute mb-3">{method.description}</p>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-pink/20 text-pink border-pink/30">
                        +{method.points} pts / {method.per}
                      </Badge>
                      {method.bonus && (
                        <Badge variant="outline" className="text-gold border-gold/30">
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
            <Zap className="h-5 w-5 text-coral" />
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
                className="text-center p-4 rounded-xl bg-gradient-to-br from-coral/10 to-gold/10 border border-coral/20"
              >
                <p className="text-3xl font-black text-coral">{streak.days}</p>
                <p className="text-xs text-mute mb-2">jours</p>
                <Badge className="bg-coral/20 text-coral">{streak.bonus}</Badge>
                <p className="text-xs text-mute mt-2">{streak.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Level System */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold" />
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
                className="flex items-center justify-between p-4 rounded-lg bg-card border border-ink"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    className={`
                    ${level.level === "Bronze" && "bg-coral/30 text-coral"}
                    ${level.level === "Silver" && "bg-muted text-ink-2"}
                    ${level.level === "Gold" && "bg-gold/30 text-gold"}
                    ${level.level === "Platinum" && "bg-pink/30 text-pink"}
                  `}
                  >
                    {level.level}
                  </Badge>
                  <span className="text-mute">{level.points} pts</span>
                </div>
                <span className="text-sm text-ink">{level.perks}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pro Tips */}
      <Card className="bg-gradient-to-br from-teal/10 to-pink/10 border-teal/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-teal" />
            Conseils de pro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Share2 className="h-5 w-5 text-teal mt-0.5" />
            <p className="text-sm text-ink-2">
              <strong>Partage ton code parrainage</strong> dans ta bio Instagram et TikTok pour des
              parrainages passifs
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Video className="h-5 w-5 text-pink mt-0.5" />
            <p className="text-sm text-ink-2">
              <strong>Les TikToks rapportent plus</strong> car ils ont plus de potentiel viral.
              N'hésite pas à montrer l'ambiance des events !
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-coral mt-0.5" />
            <p className="text-sm text-ink-2">
              <strong>Viens aux events avec des amis</strong> pour multiplier tes points par 2
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-gold mt-0.5" />
            <p className="text-sm text-ink-2">
              <strong>Reste actif chaque jour</strong> pour les bonus de série - ça s'accumule vite
              !
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button asChild size="lg" className="bg-pink hover:bg-pink">
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
