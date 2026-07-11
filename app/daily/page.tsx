"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Trophy, Flame, Zap, Target, Camera, BookOpen, Dumbbell, Palette, Calendar, Loader2, SkipForward, Check } from 'lucide-react'
import { toast } from "sonner"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import { CheckRound } from "@/components/ui/check-round"
import { SelectSticker, SelectStickerItem } from "@/components/ui/select-sticker"
import { NivCoach, NivEmpty, NivCelebration } from "@/components/brand"
import { MeshBackground } from "@/components/ui/effects/mesh-background"
import { cn } from "@/lib/utils"
import {
  getTeenGamificationStats,
  getDailyChallenges,
  completeChallenge,
  skipChallenge,
  type ChallengeCategory
} from "@/features/gamification"
import { getMyTeens, getMyTeenSelf } from "@/features/teens"

const CATEGORY_LABELS: Record<string, string> = {
  school: "École",
  sport: "Sport",
  crea: "Créa",
}

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
        return
      }

      // D2 (audit 2026-07-11) — getMyTeens est scoped PARENT (teens.parent_id
      // = auth.uid()). Pour une session ado, auth.uid() = teens.id : on résout
      // son propre profil au lieu de l'éjecter vers l'onboarding parent.
      const self = await getMyTeenSelf()
      if (self.success && self.data) {
        setTeens([self.data])
        setSelectedTeenId(self.data.id)
        return
      }

      toast.error("Aucun profil enfant trouvé. Créez-en un d'abord !")
      router.push('/profile/enfants/ajouter')
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
      case 'school': return 'text-teal'
      case 'sport': return 'text-lime'
      case 'crea': return 'text-pink'
      default: return 'text-mute'
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
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 size-12 animate-spin text-ink" aria-hidden="true" />
          <p className="text-mute">Chargement de tes défis…</p>
        </div>
      </div>
    )
  }

  const totalXp = stats?.xp?.total_xp || 0
  const xpToNext = stats?.xp?.xp_to_next_level || 100
  const xpRatio = Math.min(1, totalXp / xpToNext)
  const allDone = challenges.length > 0 && completedCount === 3

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-24">
        <MeshBackground />
        <div className="relative z-10 container mx-auto px-4 py-10 text-center sm:px-6 lg:px-8">
          <p className="eyebrow tracking-[0.16em]">Défis du jour</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl">
            Tes défis <em className="font-semibold italic text-pink">du jour</em>
            {selectedTeen?.pseudo && <span className="block text-pink">@{selectedTeen.pseudo}</span>}
          </h1>

          <div className="mx-auto mt-5 max-w-md">
            <NivCoach
              mood="hype"
              message="Complète tes défis pour gagner de l'XP, monter en niveau et garder ton streak 🔥"
            />
          </div>

          {teens.length > 1 && (
            <div className="mx-auto mt-5 max-w-xs">
              <SelectSticker value={selectedTeenId} onValueChange={setSelectedTeenId}>
                {teens.map((teen: any) => (
                  <SelectStickerItem key={teen.id} value={teen.id}>
                    {teen.pseudo || `${teen.first_name} ${teen.last_name}`}
                  </SelectStickerItem>
                ))}
              </SelectSticker>
            </div>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="border-b-2 border-ink py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StickerCard className="gap-2 p-5">
              <div className="flex items-center gap-2">
                <Trophy className="size-5 text-teal" aria-hidden="true" />
                <p className="eyebrow">Niveau</p>
              </div>
              <p className="font-display text-3xl font-extrabold tabular-nums text-teal">{stats?.xp?.level || 1}</p>
            </StickerCard>

            <StickerCard className="gap-2 p-5">
              <div className="flex items-center gap-2">
                <Zap className="size-5 text-gold" aria-hidden="true" />
                <p className="eyebrow">XP</p>
              </div>
              <p className="font-display text-3xl font-extrabold tabular-nums text-gold">
                {totalXp}
                <span className="ml-1 font-mono text-sm font-medium text-mute">/ {xpToNext}</span>
              </p>
              <SegmentedProgress steps={10} current={Math.floor(xpRatio * 10)} />
            </StickerCard>

            <StickerCard className="gap-2 p-5">
              <div className="flex items-center gap-2">
                <Flame className="size-5 text-pink" aria-hidden="true" />
                <p className="eyebrow">Série</p>
              </div>
              <p className="font-display text-3xl font-extrabold tabular-nums text-pink">
                {stats?.streak?.current_streak || 0}
                <span className="ml-1 font-mono text-sm font-medium text-mute">jours 🔥</span>
              </p>
              {stats?.streak?.longest_streak > 0 && (
                <p className="font-mono text-xs text-mute">Record : {stats.streak.longest_streak} jours 🏆</p>
              )}
            </StickerCard>

            <StickerCard className="gap-2 p-5">
              <div className="flex items-center gap-2">
                <Calendar className="size-5 text-coral" aria-hidden="true" />
                <p className="eyebrow">Aujourd'hui</p>
              </div>
              <p className="font-display text-3xl font-extrabold tabular-nums">{completedCount}/3</p>
              <SegmentedProgress steps={3} current={completedCount} />
            </StickerCard>
          </div>
        </div>
      </section>

      {/* Challenges */}
      <section className="py-12">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight">Tes 3 défis du jour</h2>
            <p className="mt-1 text-mute">
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
                <StickerCard
                  key={userChallenge.id}
                  className={cn("p-6", isCompleted && "bg-success-soft", isSkipped && "opacity-50")}
                >
                  <div className="flex items-start gap-4">
                    <span className="grid size-16 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-paper-2">
                      <CategoryIcon className={cn("size-8", categoryColor)} aria-hidden="true" />
                    </span>

                    <div className="flex-1">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <span className="rounded-full border-2 border-ink bg-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink">
                              {CATEGORY_LABELS[challenge.category] || challenge.category}
                            </span>
                            <span className="flex items-center gap-1 font-mono text-xs font-bold text-gold">
                              <Zap className="size-3" aria-hidden="true" />
                              +{challenge.xp_reward} XP
                            </span>
                          </div>
                          <h3 className="font-display text-xl font-bold text-ink">{challenge.title}</h3>
                          {challenge.description && (
                            <p className="mt-1 text-sm text-mute">{challenge.description}</p>
                          )}
                        </div>

                        {isCompleted && (
                          <span className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-ink bg-lime">
                            <Check className="size-6 text-ink" strokeWidth={3} aria-hidden="true" />
                          </span>
                        )}
                      </div>

                      {/* Validation Form */}
                      {!isCompleted && !isSkipped && (
                        <div className="mt-4 space-y-4">
                          {challenge.validation_type === 'timer' && (
                            <div className="space-y-1.5">
                              <span className="eyebrow tracking-[0.16em]">Temps passé (minutes)</span>
                              <Input
                                type="number"
                                placeholder="Ex : 30"
                                className="border-2 border-ink focus-visible:ring-0"
                                value={validationData[userChallenge.id]?.duration || ''}
                                onChange={(e) => setValidationData(prev => ({
                                  ...prev,
                                  [userChallenge.id]: { duration: parseInt(e.target.value) }
                                }))}
                              />
                            </div>
                          )}

                          {challenge.validation_type === 'self_report' && (
                            <div className="space-y-1.5">
                              <span className="eyebrow tracking-[0.16em]">Comment ça s'est passé ?</span>
                              <Textarea
                                placeholder="Raconte ce que tu as fait…"
                                rows={3}
                                className="resize-none rounded-xl border-2 border-line bg-white focus-visible:border-ink focus-visible:ring-0"
                                value={validationData[userChallenge.id]?.report || ''}
                                onChange={(e) => setValidationData(prev => ({
                                  ...prev,
                                  [userChallenge.id]: { report: e.target.value }
                                }))}
                              />
                            </div>
                          )}

                          {challenge.validation_type === 'upload_photo' && (
                            <div className="space-y-1.5">
                              <span className="eyebrow tracking-[0.16em]">Prends une photo de preuve 📸</span>
                              <label className="block cursor-pointer rounded-xl border-2 border-ink bg-white p-8 text-center transition-colors hover:bg-paper-2">
                                <Camera className="mx-auto mb-2 size-12 text-mute" aria-hidden="true" />
                                <p className="text-sm text-mute">
                                  {validationData[userChallenge.id]?.photo || "Clique pour uploader une photo"}
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
                                      // Upload réel encore à brancher (sign-upload) — pas de
                                      // faux « ajoutée ! ». On confirme seulement la sélection.
                                      toast("Photo sélectionnée")
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          )}

                          {challenge.validation_type === 'checklist' && challenge.validation_data?.checklist && (
                            <div className="space-y-2">
                              <span className="eyebrow tracking-[0.16em]">Coche les étapes complétées</span>
                              <div className="space-y-2">
                                {challenge.validation_data.checklist.map((item: string, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <CheckRound
                                      id={`check-${userChallenge.id}-${idx}`}
                                      checked={validationData[userChallenge.id]?.checklist?.[idx] || false}
                                      onCheckedChange={(checked) => {
                                        const newChecklist = [...(validationData[userChallenge.id]?.checklist || [])]
                                        newChecklist[idx] = checked === true
                                        setValidationData(prev => ({
                                          ...prev,
                                          [userChallenge.id]: { checklist: newChecklist }
                                        }))
                                      }}
                                    />
                                    <label htmlFor={`check-${userChallenge.id}-${idx}`} className="text-sm text-ink-2">
                                      {item}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-3">
                            <Button variant="pink" onClick={() => handleCompleteChallenge(userChallenge.id)} disabled={submitting} className="flex-1">
                              {submitting ? (
                                <>
                                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                                  Validation…
                                </>
                              ) : (
                                <>
                                  <Check className="mr-2 size-4" strokeWidth={3} aria-hidden="true" />
                                  Valider (+{challenge.xp_reward} XP)
                                </>
                              )}
                            </Button>
                            <Button variant="outline" onClick={() => handleSkipChallenge(userChallenge.id)} disabled={submitting}>
                              <SkipForward className="mr-2 size-4" aria-hidden="true" />
                              Passer
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Completed Info */}
                      {isCompleted && userChallenge.completed_at && (
                        <div className="mt-4 rounded-xl border-2 border-lime bg-success-soft p-3">
                          <p className="font-mono text-sm font-medium text-ink">
                            ✅ Complété {new Date(userChallenge.completed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} • +{challenge.xp_reward} XP gagné
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </StickerCard>
              )
            })}
          </div>

          {/* Empty State */}
          {challenges.length === 0 && (
            <NivEmpty
              mood="calm"
              title="Aucun défi pour aujourd'hui"
              description="Les défis sont assignés automatiquement chaque jour. Reviens un peu plus tard !"
              action={<Button variant="pink" onClick={() => window.location.reload()}>Actualiser</Button>}
            />
          )}

          {/* All Completed — moment de pic */}
          {allDone && (
            <div className="mt-8">
              <NivCelebration
                tone="gold"
                title="Tous les défis complétés !"
                value={`+${challenges.reduce((sum, c) => sum + (c.challenge?.xp_reward || 0), 0)} XP`}
                caption="Énorme. Reviens demain pour de nouveaux défis."
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button variant="outline" onClick={() => router.push('/evenements')}>Voir les événements</Button>
                    <Button variant="pink" onClick={() => router.push('/profile')}>Mon profil</Button>
                  </div>
                }
              />
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}
