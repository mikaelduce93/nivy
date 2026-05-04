"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  PartyPopper, Sparkles, Trophy, Star, Heart, Zap,
  ArrowRight, CheckCircle2, Calendar, Users, Crown,
  Award, Coins
} from 'lucide-react'
import Confetti from 'react-confetti'
import { useWindowSize } from '@/hooks/use-window-size'
import { BADGE_DISPLAY_INFO } from '@/gamification-system/features/onboarding/schema'

interface GamificationData {
  totalXP: number
  earnedBadges: string[]
  bonusCoins: number
}

interface CompletionStepProps {
  userType: 'parent' | 'teen' | null
  onNext: () => void
  gamificationData?: GamificationData
}

export function CompletionStep({ userType, onNext, gamificationData }: CompletionStepProps) {
  const [showConfetti, setShowConfetti] = useState(true)
  const { width, height } = useWindowSize()
  const prefersReducedMotion = useReducedMotion()

  // Default gamification data if not provided
  const xp = gamificationData?.totalXP || 0
  const badges = gamificationData?.earnedBadges || []
  const coins = gamificationData?.bonusCoins || 0

  useEffect(() => {
    // Stop confetti after 5 seconds
    const timer = setTimeout(() => {
      setShowConfetti(false)
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

  const parentNextSteps = [
    {
      icon: Users,
      title: "Ajouter un profil enfant",
      description: "Créez le profil de votre premier enfant",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Calendar,
      title: "Explorer les événements",
      description: "Découvrez les activités disponibles",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Crown,
      title: "Découvrir les Pass VIP",
      description: "Économisez avec un abonnement",
      color: "from-yellow-500 to-orange-500"
    }
  ]

  const teenNextSteps = [
    {
      icon: Star,
      title: "Personnalise ton profil",
      description: "Choisis ton avatar et ton pseudo unique",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Calendar,
      title: "Découvre les events",
      description: "Trouve des activités qui te plaisent",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Trophy,
      title: "Relève des défis",
      description: "Gagne des badges et monte en niveau",
      color: "from-yellow-500 to-orange-500"
    }
  ]

  const nextSteps = userType === 'parent' ? parentNextSteps : teenNextSteps

  return (
    <div className="relative space-y-8">
      {/* Confetti - respects reduced motion */}
      {showConfetti && !prefersReducedMotion && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
        />
      )}

      {/* Main Content */}
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={prefersReducedMotion ? { duration: 0.2 } : { type: "spring", duration: 0.8 }}
        className="text-center"
      >
        {/* Celebration Icon */}
        <motion.div
          animate={prefersReducedMotion ? {} : {
            rotate: [0, -10, 10, -10, 10, 0],
            scale: [1, 1.1, 1, 1.1, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1
          }}
          className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-primary via-purple-500 to-pink-500 mb-6 shadow-2xl"
          aria-hidden="true"
        >
          <PartyPopper className="w-16 h-16 text-white" />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 leading-tight">
            {userType === 'parent' ? (
              <>
                Bienvenue dans
                <br />
                <span className="text-gradient bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  la famille Teen Club !
                </span>
              </>
            ) : (
              <>
                C'est parti pour
                <br />
                <span className="text-gradient bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  l'aventure !
                </span>
              </>
            )}
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            {userType === 'parent'
              ? "Votre compte est créé ! Vous pouvez maintenant gérer les activités de vos enfants."
              : "Dès que tes parents valideront ton compte, tu pourras commencer à t'amuser !"
            }
          </p>
        </motion.div>

        {/* Achievement Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: "spring" }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold shadow-lg mt-8"
        >
          <Trophy className="w-5 h-5" />
          {userType === 'parent' ? 'Membre Teen Club' : 'Futur Teen Club Star'}
          <Sparkles className="w-5 h-5" />
        </motion.div>
      </motion.div>

      {/* Gamification Rewards Summary */}
      {(xp > 0 || badges.length > 0 || coins > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="p-6 bg-gradient-to-br from-zinc-900/50 to-zinc-800/50 border-cyan-500/20">
            <h3 className="text-lg font-bold text-center mb-4 text-white">
              Récompenses gagnées
            </h3>

            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* XP */}
              <motion.div
                className="text-center bg-zinc-800/50 rounded-xl p-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.9, type: "spring" }}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl font-bold text-cyan-400 tabular-nums">{xp}</p>
                <p className="text-xs text-zinc-500">XP gagnés</p>
              </motion.div>

              {/* Badges */}
              <motion.div
                className="text-center bg-zinc-800/50 rounded-xl p-4"
                initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={prefersReducedMotion ? { delay: 0.1 } : { delay: 1, type: "spring" }}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-2" aria-hidden="true">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl font-bold text-purple-400 tabular-nums">{badges.length}</p>
                <p className="text-xs text-zinc-500">Badges</p>
              </motion.div>

              {/* Coins */}
              <motion.div
                className="text-center bg-zinc-800/50 rounded-xl p-4"
                initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={prefersReducedMotion ? { delay: 0.2 } : { delay: 1.1, type: "spring" }}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center mx-auto mb-2" aria-hidden="true">
                  <Coins className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl font-bold text-yellow-400 tabular-nums">{coins}</p>
                <p className="text-xs text-zinc-500">Coins bonus</p>
              </motion.div>
            </div>

            {/* Badge names */}
            {badges.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 pt-2 border-t border-zinc-700">
                {badges.map((badge, i) => {
                  const info = BADGE_DISPLAY_INFO[badge]
                  return (
                    <motion.span
                      key={badge}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 + i * 0.1 }}
                      className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium"
                    >
                      {info?.name || badge}
                    </motion.span>
                  )
                })}
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {/* Next Steps */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="max-w-4xl mx-auto"
      >
        <h2 className="text-2xl font-black text-center mb-6">Prochaines étapes</h2>

        <div className="grid sm:grid-cols-3 gap-4">
          {nextSteps.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + index * 0.1 }}
              >
                <Card className="p-6 hover:shadow-lg transition-all hover:scale-105 cursor-pointer border-2 hover:border-primary/50 h-full">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
        className="text-center pt-8"
      >
        {userType === 'parent' ? (
          <Button
            size="lg"
            onClick={onNext}
            className="bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 text-white px-8 py-6 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
          >
            Accéder à mon tableau de bord
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <ArrowRight className="w-5 h-5 ml-2" />
            </motion.div>
          </Button>
        ) : (
          <div className="space-y-4">
            <Card className="p-6 bg-blue-500/10 border-blue-500/20 max-w-2xl mx-auto">
              <div className="flex items-start gap-3">
                <Heart className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                <div className="text-left">
                  <p className="font-bold text-blue-600 dark:text-blue-400 mb-2">
                    Un email a été envoyé à tes parents
                  </p>
                  <p className="text-sm text-blue-600/80 dark:text-blue-400/80">
                    Ils vont recevoir un lien pour créer leur compte et valider ton inscription.
                    Tu recevras une notification dès que c'est fait !
                  </p>
                </div>
              </div>
            </Card>

            <Button
              size="lg"
              variant="outline"
              onClick={onNext}
              className="gap-2"
            >
              Retour à l'accueil
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </motion.div>

      {/* Floating Icons Animation - hidden for reduced motion */}
      {!prefersReducedMotion && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {[Star, Heart, Zap, Trophy, Sparkles].map((Icon, index) => (
            <motion.div
              key={index}
              className="absolute"
              initial={{
                x: Math.random() * 100 + '%',
                y: Math.random() * 100 + '%',
                opacity: 0
              }}
              animate={{
                y: [
                  Math.random() * 100 + '%',
                  Math.random() * 100 + '%',
                  Math.random() * 100 + '%'
                ],
                opacity: [0, 0.3, 0],
                rotate: [0, 360]
              }}
              transition={{
                duration: 5 + Math.random() * 5,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            >
              <Icon className="w-8 h-8 text-primary" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
