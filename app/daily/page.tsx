"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Trophy, Flame, Zap, Target, Clock, CheckCircle2, XCircle,
  Sparkles, Upload, Camera, BookOpen, Dumbbell, Palette,
  Award, Star, TrendingUp, Calendar, Loader2, ChevronRight,
  SkipForward
} from 'lucide-react'
import { toast } from "sonner"
import {
  getTeenGamificationStats,
  getDailyChallenges,
  completeChallenge,
  skipChallenge,
  type ChallengeCategory
} from "@/features/gamification"
import { getMyTeens } from "@/features/teens"

export default function DailyChallengesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Selected teen
  const [teens, setTeens] = useState<any[]>([])
  const [selectedTeenId, setSelectedTeenId] = useState<string>("")

  // Gamification data
  const [stats, setStats] = useState<any>(null)
  const [challenges, setChallenges] = useState<any[]>([])

  // Validation data
  const [validationData, setValidationData] = useState<Record<string, any>>({})

  // Load teens on mount
  useEffect(() => {
    async function loadTeens() {
      const result = await getMyTeens()
      if (result.success && result.data && result.data.length > 0) {
        setTeens(result.data)
        setSelectedTeenId(result.data[0].id) // Select first teen by default
      } else {
        toast.error("Aucun profil enfant trouvé. Créez-en un d'abord !")
        router.push('/profile/enfants/ajouter')
      }
    }

    loadTeens()
  }, [router])

  // Load stats and challenges when teen is selected
  useEffect(() => {
    if (!selectedTeenId) return

    async function loadData() {
      setLoading(true)
      try {
        const [statsResult, challengesResult] = await Promise.all([
          getTeenGamificationStats(selectedTeenId),
          getDailyChallenges(selectedTeenId)
        ])

        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data)
        }

        if (challengesResult.success && challengesResult.data) {
          setChallenges(challengesResult.data)
        }
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error("Erreur lors du chargement des données")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [selectedTeenId])

  const selectedTeen = teens.find(t => t.id === selectedTeenId)

  const completedCount = challenges.filter(c => c.status === 'completed').length
  const pendingCount = challenges.filter(c => c.status === 'pending').length

  const getCategoryIcon = (category: ChallengeCategory) => {
    switch (category) {
      case 'school': return BookOpen
      case 'sport': return Dumbbell
      case 'crea': return Palette
      default: return Target
    }
  }

  const getCategoryColor = (category: ChallengeCategory) => {
    switch (category) {
      case 'school': return 'text-blue-500 bg-blue-500/10'
      case 'sport': return 'text-green-500 bg-green-500/10'
      case 'crea': return 'text-purple-500 bg-purple-500/10'
      default: return 'text-gray-500 bg-gray-500/10'
    }
  }

  const handleCompleteChallenge = async (challengeId: string) => {
    setSubmitting(true)
    try {
      const result = await completeChallenge({
        challengeId,
        teenId: selectedTeenId,
        validationData: validationData[challengeId]
      })

      if (result.success === false) {
        toast.error(result.error)
        return
      }

      toast.success(`🎉 Défi complété ! +${result.data?.challenge?.xp_reward || 0} XP`)

      // Reload data
      const [statsResult, challengesResult] = await Promise.all([
        getTeenGamificationStats(selectedTeenId),
        getDailyChallenges(selectedTeenId)
      ])

      if (statsResult.success) setStats(statsResult.data)
      if (challengesResult.success) setChallenges(challengesResult.data)

      // Clear validation data for this challenge
      setValidationData(prev => {
        const newData = { ...prev }
        delete newData[challengeId]
        return newData
      })
    } catch (error) {
      console.error('Error completing challenge:', error)
      toast.error("Erreur lors de la validation")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkipChallenge = async (challengeId: string) => {
    try {
      const result = await skipChallenge(challengeId, selectedTeenId)

      if (result.success) {
        toast("Défi passé", { description: "Tu peux le faire demain !" })

        // Reload challenges
        const challengesResult = await getDailyChallenges(selectedTeenId)
        if (challengesResult.success) setChallenges(challengesResult.data)
      } else {
        toast.error("Erreur")
      }
    } catch (error) {
      console.error('Error skipping challenge:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement de tes défis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[30vh] flex items-center justify-center overflow-hidden pt-20 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center py-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4 backdrop-blur-sm">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Défis Quotidiens</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 leading-tight">
            Tes Défis du Jour
            <br />
            <span className="text-gradient">@{selectedTeen?.pseudo || 'Champion'}</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Complète tes défis pour gagner XP, monter en niveau et maintenir ton streak 🔥
          </p>

          {/* Teen Selector if multiple */}
          {teens.length > 1 && (
            <div className="max-w-xs mx-auto">
              <select
                className="w-full p-3 rounded-lg border bg-background"
                value={selectedTeenId}
                onChange={(e) => setSelectedTeenId(e.target.value)}
              >
                {teens.map((teen: any) => (
                  <option key={teen.id} value={teen.id}>
                    {teen.pseudo || `${teen.first_name} ${teen.last_name}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* XP & Level */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Niveau</p>
                  <p className="text-2xl font-black">{stats?.xp?.level || 1}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">XP</span>
                  <span className="font-bold">{stats?.xp?.total_xp || 0} / {stats?.xp?.xp_to_next_level || 100}</span>
                </div>
                <Progress
                  value={((stats?.xp?.total_xp || 0) / (stats?.xp?.xp_to_next_level || 100)) * 100}
                  className="h-2"
                />
              </div>
            </Card>

            {/* Streak */}
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Série</p>
                  <p className="text-2xl font-black">{stats?.streak?.current_streak || 0} jours</p>
                </div>
              </div>
              {stats?.streak?.longest_streak > 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                  Record: {stats.streak.longest_streak} jours 🏆
                </p>
              )}
            </Card>

            {/* Total Challenges */}
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Défis complétés</p>
                  <p className="text-2xl font-black">{stats?.total_challenges_completed || 0}</p>
                </div>
              </div>
            </Card>

            {/* Today Progress */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aujourd'hui</p>
                  <p className="text-2xl font-black">{completedCount}/3</p>
                </div>
              </div>
              <Progress value={(completedCount / 3) * 100} className="h-2" />
            </Card>
          </div>
        </div>
      </section>

      {/* Challenges Section */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black mb-2">Tes 3 Défis du Jour</h2>
            <p className="text-muted-foreground">
              {pendingCount === 0 ? "🎉 Tous les défis complétés ! Reviens demain." : `${pendingCount} défi${pendingCount > 1 ? 's' : ''} en attente`}
            </p>
          </div>

          <div className="space-y-6">
            {challenges.map((userChallenge) => {
              const challenge = userChallenge.challenge
              const CategoryIcon = getCategoryIcon(challenge.category)
              const categoryColor = getCategoryColor(challenge.category)
              const isCompleted = userChallenge.status === 'completed'
              const isSkipped = userChallenge.status === 'skipped'

              return (
                <Card
                  key={userChallenge.id}
                  className={`p-6 ${isCompleted ? 'bg-green-500/5 border-green-500/20' : isSkipped ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-16 h-16 rounded-2xl ${categoryColor} flex items-center justify-center flex-shrink-0`}>
                      <CategoryIcon className="w-8 h-8" />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${categoryColor}`}>
                              {challenge.category}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              +{challenge.xp_reward} XP
                            </span>
                          </div>
                          <h3 className="text-xl font-bold">{challenge.title}</h3>
                          {challenge.description && (
                            <p className="text-sm text-muted-foreground mt-1">{challenge.description}</p>
                          )}
                        </div>

                        {isCompleted && (
                          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-white" />
                          </div>
                        )}
                        {isSkipped && (
                          <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center">
                            <XCircle className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Validation Form */}
                      {!isCompleted && !isSkipped && (
                        <div className="mt-4 space-y-4">
                          {/* Timer */}
                          {challenge.validation_type === 'timer' && (
                            <div className="space-y-2">
                              <Label>Temps passé (minutes)</Label>
                              <Input
                                type="number"
                                placeholder="Ex: 30"
                                value={validationData[userChallenge.id]?.duration || ''}
                                onChange={(e) => setValidationData(prev => ({
                                  ...prev,
                                  [userChallenge.id]: { duration: parseInt(e.target.value) }
                                }))}
                              />
                            </div>
                          )}

                          {/* Self Report */}
                          {challenge.validation_type === 'self_report' && (
                            <div className="space-y-2">
                              <Label>Comment ça s'est passé ?</Label>
                              <Textarea
                                placeholder="Raconte-nous ce que tu as fait..."
                                rows={3}
                                value={validationData[userChallenge.id]?.report || ''}
                                onChange={(e) => setValidationData(prev => ({
                                  ...prev,
                                  [userChallenge.id]: { report: e.target.value }
                                }))}
                              />
                            </div>
                          )}

                          {/* Upload Photo */}
                          {challenge.validation_type === 'upload_photo' && (
                            <div className="space-y-2">
                              <Label>Prends une photo de preuve 📸</Label>
                              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                                <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">
                                  Clique pour uploader une photo
                                </p>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                      setValidationData(prev => ({
                                        ...prev,
                                        [userChallenge.id]: { photo: file.name }
                                      }))
                                      toast.success("Photo ajoutée !")
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Checklist */}
                          {challenge.validation_type === 'checklist' && challenge.validation_data?.checklist && (
                            <div className="space-y-2">
                              <Label>Coche les étapes complétées</Label>
                              <div className="space-y-2">
                                {challenge.validation_data.checklist.map((item: string, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id={`check-${userChallenge.id}-${idx}`}
                                      className="w-4 h-4 rounded"
                                      checked={validationData[userChallenge.id]?.checklist?.[idx] || false}
                                      onChange={(e) => {
                                        const newChecklist = [...(validationData[userChallenge.id]?.checklist || [])]
                                        newChecklist[idx] = e.target.checked
                                        setValidationData(prev => ({
                                          ...prev,
                                          [userChallenge.id]: { checklist: newChecklist }
                                        }))
                                      }}
                                    />
                                    <Label htmlFor={`check-${userChallenge.id}-${idx}`} className="text-sm font-normal">
                                      {item}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-3">
                            <Button
                              onClick={() => handleCompleteChallenge(userChallenge.id)}
                              disabled={submitting}
                              className="flex-1"
                            >
                              {submitting ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Validation...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Valider (+{challenge.xp_reward} XP)
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleSkipChallenge(userChallenge.id)}
                              disabled={submitting}
                            >
                              <SkipForward className="w-4 h-4 mr-2" />
                              Passer
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Completed Info */}
                      {isCompleted && userChallenge.completed_at && (
                        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <p className="text-sm text-green-700 dark:text-green-400">
                            ✅ Complété {new Date(userChallenge.completed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} • +{challenge.xp_reward} XP gagné
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Empty State */}
          {challenges.length === 0 && (
            <Card className="p-12 text-center">
              <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucun défi pour aujourd'hui</h3>
              <p className="text-muted-foreground mb-6">
                Les défis sont assignés automatiquement chaque jour
              </p>
              <Button onClick={() => window.location.reload()}>
                Actualiser
              </Button>
            </Card>
          )}

          {/* All Completed State */}
          {challenges.length > 0 && completedCount === 3 && (
            <Card className="p-8 mt-8 text-center bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-black mb-2">🎉 Tous les défis complétés !</h3>
              <p className="text-muted-foreground mb-6">
                Tu as gagné {challenges.reduce((sum, c) => sum + (c.challenge?.xp_reward || 0), 0)} XP aujourd'hui
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => router.push('/evenements')}>
                  Voir les événements
                </Button>
                <Button onClick={() => router.push('/profile')}>
                  Mon profil
                </Button>
              </div>
            </Card>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}
