"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dumbbell,
  Flame,
  Trophy,
  Timer,
  Target,
  Zap,
  Medal,
  TrendingUp,
  CheckCircle2,
  Play,
  Star,
  Award,
  Crown,
  Loader2,
  Calendar
} from "lucide-react"
import { toast } from "sonner"
import { submitChallengeResult } from "@/gamification-system/features/pillars/actions"

interface Challenge {
  id: string
  title: string
  description: string
  category: "strength" | "cardio" | "flexibility" | "endurance" | "speed"
  difficulty: "beginner" | "intermediate" | "advanced"
  xpReward: number
  metric: string
  unit: string
  targetValue: number
  completed: boolean
  personalBest?: number
  attempts: number
}

interface PersonalRecord {
  id: string
  challengeId: string
  challengeTitle: string
  value: number
  unit: string
  date: string
  isAllTimeBest: boolean
}

const categoryIcons = {
  strength: Dumbbell,
  cardio: Flame,
  flexibility: Target,
  endurance: Timer,
  speed: Zap
}

const categoryColors = {
  strength: "from-red-500 to-orange-500",
  cardio: "from-pink-500 to-rose-500",
  flexibility: "from-purple-500 to-violet-500",
  endurance: "from-blue-500 to-cyan-500",
  speed: "from-amber-500 to-yellow-500"
}

export function TeenChallengesClient({ initialData, teenId }: { initialData: any, teenId: string }) {
  const [activeTab, setActiveTab] = useState("challenges")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const [challenges, setChallenges] = useState<Challenge[]>(
    (initialData.challenges as any[]).map(c => ({
        id: c.id,
        title: c.name,
        description: c.description,
        category: c.sport_category,
        difficulty: c.difficulty,
        xpReward: c.xp_reward,
        metric: c.objective_type,
        unit: c.objective_unit,
        targetValue: c.objective_value,
        completed: c.completed,
        personalBest: undefined,
        attempts: 0
    }))
  )

  const [records, setRecords] = useState<PersonalRecord[]>(
    (initialData.records as any[]).map(r => ({
        id: r.id,
        challengeId: r.record_type,
        challengeTitle: r.record_type,
        value: r.value,
        unit: r.unit,
        date: r.achieved_at,
        isAllTimeBest: true
    }))
  )

  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [showChallengeDialog, setShowChallengeDialog] = useState(false)
  const [resultValue, setResultValue] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const stats = {
    totalXP: initialData.stats.totalXP,
    completedChallenges: initialData.stats.challengesCompleted,
    totalAttempts: 0,
    streakDays: 0
  }

  const filteredChallenges = selectedCategory
    ? challenges.filter(c => c.category === selectedCategory)
    : challenges

  const handleStartChallenge = (challenge: Challenge) => {
    setSelectedChallenge(challenge)
    setResultValue("")
    setShowChallengeDialog(true)
  }

  const handleSubmitResult = async () => {
    if (!selectedChallenge || !resultValue) {
      toast.error("Entrez votre résultat")
      return
    }

    const value = parseFloat(resultValue)
    if (isNaN(value) || value <= 0) {
      toast.error("Résultat invalide")
      return
    }

    setSubmitting(true)
    try {
      const result = await submitChallengeResult(teenId, {
        challengeId: selectedChallenge.id,
        value: value
      })

      if (result.success) {
        const meetsTarget = selectedChallenge.unit === "secondes" || selectedChallenge.unit === "minutes"
            ? value <= selectedChallenge.targetValue
            : value >= selectedChallenge.targetValue

        if (meetsTarget && !selectedChallenge.completed) {
            toast.success(`Défi complété! +${selectedChallenge.xpReward} XP!`)
        } else {
            toast.success("Résultat enregistré!")
        }
        setShowChallengeDialog(false)
      } else {
        toast.error("Erreur: " + result.error)
      }
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setSubmitting(false)
    }
  }

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return <span className="status-success px-2 py-0.5 rounded-full text-xs">Débutant</span>
      case "intermediate":
        return <span className="status-warning px-2 py-0.5 rounded-full text-xs">Intermédiaire</span>
      case "advanced":
        return <span className="status-destructive px-2 py-0.5 rounded-full text-xs">Avancé</span>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short"
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container-wide py-8 md:pl-72">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-foreground flex items-center gap-3">
            <Dumbbell className="h-8 w-8 text-primary" />
            Défis Physiques
          </h1>
          <p className="text-muted-foreground">Relève des défis et bats tes records!</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">XP Gagnés</p>
                  <p className="text-2xl font-black text-primary">{stats.totalXP}</p>
                </div>
                <Star className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Défis Réussis</p>
                  <p className="text-2xl font-black text-success">{stats.completedChallenges}/{challenges.length}</p>
                </div>
                <Trophy className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Tentatives</p>
                  <p className="text-2xl font-black text-info">{stats.totalAttempts}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-info" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Série Active</p>
                  <p className="text-2xl font-black text-warning">{stats.streakDays} jours</p>
                </div>
                <Flame className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/40 border border-border">
            <TabsTrigger value="challenges" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Target className="h-4 w-4 mr-2" />
              Défis
            </TabsTrigger>
            <TabsTrigger value="records" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Medal className="h-4 w-4 mr-2" />
              Mes Records
            </TabsTrigger>
          </TabsList>

          {/* Challenges Tab */}
          <TabsContent value="challenges">
            {/* Category Filter */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className={selectedCategory === null ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
              >
                Tous
              </Button>
              {Object.entries(categoryIcons).map(([key, Icon]) => (
                <Button
                  key={key}
                  variant={selectedCategory === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(key)}
                  className={selectedCategory === key ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {key === "strength" && "Force"}
                  {key === "cardio" && "Cardio"}
                  {key === "flexibility" && "Souplesse"}
                  {key === "endurance" && "Endurance"}
                  {key === "speed" && "Vitesse"}
                </Button>
              ))}
            </div>

            {/* Challenges Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {filteredChallenges.map((challenge) => {
                const CategoryIcon = categoryIcons[challenge.category]
                const progress = challenge.personalBest
                  ? (challenge.unit === "secondes" || challenge.unit === "minutes"
                    ? Math.max(0, 100 - ((challenge.personalBest - challenge.targetValue) / challenge.targetValue) * 100)
                    : (challenge.personalBest / challenge.targetValue) * 100)
                  : 0

                return (
                  <Card
                    key={challenge.id}
                    className={`overflow-hidden ${challenge.completed ? "border-success/40 bg-success/10" : "border-border"} `}
                  >
                    <div className={`h-2 bg-gradient-to-r ${categoryColors[challenge.category]}`} />
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${categoryColors[challenge.category]} flex items-center justify-center`}>
                            <CategoryIcon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-foreground">{challenge.title}</h3>
                              {challenge.completed && <CheckCircle2 className="h-4 w-4 text-success" />}
                            </div>
                            <p className="text-sm text-muted-foreground">{challenge.description}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-3 text-sm">
                        {getDifficultyBadge(challenge.difficulty)}
                        <span className="flex items-center gap-1 text-warning">
                          <Star className="h-4 w-4" />
                          +{challenge.xpReward} XP
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Objectif: {challenge.targetValue} {challenge.unit}</span>
                          <span className="text-primary font-medium">
                            {challenge.personalBest ? `Record: ${challenge.personalBest} ${challenge.unit}` : "Pas encore tenté"}
                          </span>
                        </div>
                        <Progress value={Math.min(progress, 100)} className="h-2" />
                        <p className="text-xs text-muted-foreground">{challenge.attempts} tentative{challenge.attempts !== 1 ? "s" : ""}</p>
                      </div>

                      <Button
                        onClick={() => handleStartChallenge(challenge)}
                        className={`w-full ${challenge.completed ? "bg-success hover:bg-success/90" : "bg-primary hover:bg-primary/90"}`}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {challenge.completed ? "Améliorer mon record" : "Relever le défi"}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* Records Tab */}
          <TabsContent value="records">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Medal className="h-5 w-5 text-warning" />
                  Mes Records Personnels
                </CardTitle>
              </CardHeader>
              <CardContent>
                {records.length > 0 ? (
                  <div className="space-y-3">
                    {records.map((record, index) => (
                      <div
                        key={record.id}
                        className={`flex items-center justify-between p-4 rounded-xl border ${
                          record.isAllTimeBest ? "bg-warning/10 border-warning/30" : "bg-muted/40 border-border"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            index === 0 ? "bg-warning" : index === 1 ? "bg-muted" : index === 2 ? "bg-warning/70" : "bg-muted"
                          }`}>
                            {index < 3 ? (
                              <Crown className="h-5 w-5 text-white" />
                            ) : (
                              <span className="text-white font-bold">{index + 1}</span>
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{record.challengeTitle}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDate(record.date)}
                              {record.isAllTimeBest && (
                                <span className="flex items-center gap-1 text-warning">
                                  <Award className="h-3 w-3" />
                                  Meilleur record
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-primary">{record.value}</p>
                          <p className="text-sm text-muted-foreground">{record.unit}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Medal className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-bold text-foreground mb-2">Pas encore de records</h3>
                    <p className="text-muted-foreground">Relève des défis pour établir tes premiers records!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Challenge Dialog */}
        <Dialog open={showChallengeDialog} onOpenChange={setShowChallengeDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedChallenge && (
                  <>
                    <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${categoryColors[selectedChallenge.category]} flex items-center justify-center`}>
                      <Dumbbell className="h-4 w-4 text-white" />
                    </div>
                    {selectedChallenge.title}
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedChallenge?.description}
              </DialogDescription>
            </DialogHeader>

            {selectedChallenge && (
                <div className="py-4 space-y-4">
                <div className="p-4 rounded-xl bg-muted/40 border border-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Objectif à atteindre</span>
                    <span className="font-bold text-primary">
                      {selectedChallenge.targetValue} {selectedChallenge.unit}
                    </span>
                  </div>
                  {selectedChallenge.personalBest && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Ton record actuel</span>
                      <span className="font-bold text-warning">
                        {selectedChallenge.personalBest} {selectedChallenge.unit}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Entre ton résultat ({selectedChallenge.unit})</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder={`Ex: ${selectedChallenge.targetValue}`}
                    value={resultValue}
                    onChange={(e) => setResultValue(e.target.value)}
                    className="text-center text-2xl font-bold h-14"
                  />
                </div>

                <div className="flex items-center justify-center gap-2 text-warning">
                  <Star className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Jusqu'à +{selectedChallenge.xpReward} XP à gagner!
                  </span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowChallengeDialog(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleSubmitResult}
                disabled={submitting || !resultValue}
                className="bg-primary hover:bg-primary/90"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Valider mon résultat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
