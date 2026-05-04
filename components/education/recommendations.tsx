"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Sparkles,
  BookOpen,
  PlayCircle,
  Target,
  TrendingUp,
  ChevronRight,
  Zap,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface Recommendation {
  id: string
  type: "quiz" | "tutorial" | "challenge" | "resource"
  title: string
  description: string
  reason: string
  priority: "high" | "medium" | "low"
  subject?: string
  xpReward?: number
  link?: string
  metadata?: Record<string, unknown>
}

interface WeakSubject {
  subject: string
  label: string
  average: number
}

interface Insights {
  weakSubjects: WeakSubject[]
  pillarScores: {
    school_score: number
    sport_score: number
    crea_score: number
  } | null
}

/* ==========================================================================
   RECOMMENDATION CARD
   ========================================================================== */

interface RecommendationCardProps {
  recommendation: Recommendation
  onClick: () => void
}

function RecommendationCard({ recommendation, onClick }: RecommendationCardProps) {
  const typeConfig = {
    quiz: {
      icon: BookOpen,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      label: "Quiz",
    },
    tutorial: {
      icon: PlayCircle,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      label: "Tutoriel",
    },
    challenge: {
      icon: Target,
      color: "text-green-400",
      bg: "bg-green-500/10",
      label: "Defi",
    },
    resource: {
      icon: Sparkles,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      label: "Ressource",
    },
  }

  const priorityConfig = {
    high: { color: "text-red-400", bg: "bg-red-500/10", label: "Prioritaire" },
    medium: { color: "text-yellow-400", bg: "bg-yellow-500/10", label: "Recommande" },
    low: { color: "text-zinc-400", bg: "bg-zinc-500/10", label: "Suggere" },
  }

  const type = typeConfig[recommendation.type]
  const priority = priorityConfig[recommendation.priority]
  const Icon = type.icon

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className="p-4 bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
        <div className="flex items-start gap-4">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", type.bg)}>
            <Icon className={cn("w-6 h-6", type.color)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", type.bg, type.color)}>
                {type.label}
              </span>
              {recommendation.priority === "high" && (
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", priority.bg, priority.color)}>
                  {priority.label}
                </span>
              )}
            </div>

            <h4 className="font-bold text-white line-clamp-1">{recommendation.title}</h4>
            <p className="text-sm text-zinc-500 line-clamp-2 mb-2">{recommendation.description}</p>

            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-600 line-clamp-1">{recommendation.reason}</p>
              {recommendation.xpReward && (
                <span className="flex items-center gap-1 text-cyan-400 text-xs">
                  <Zap className="w-3 h-3" />
                  +{recommendation.xpReward} XP
                </span>
              )}
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-zinc-600 flex-shrink-0" />
        </div>
      </Card>
    </motion.div>
  )
}

/* ==========================================================================
   WEAK SUBJECTS ALERT
   ========================================================================== */

interface WeakSubjectsAlertProps {
  subjects: WeakSubject[]
}

function WeakSubjectsAlert({ subjects }: WeakSubjectsAlertProps) {
  if (subjects.length === 0) return null

  return (
    <Card className="p-4 bg-yellow-500/10 border-yellow-500/20">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-yellow-400 mb-1">Matieres a ameliorer</h4>
          <p className="text-sm text-yellow-400/70 mb-3">
            Tes notes sont basses dans certaines matieres. Voici des ressources pour t'aider.
          </p>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <span
                key={s.subject}
                className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300"
              >
                {s.label}: {Math.round(s.average)}%
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

/* ==========================================================================
   RECOMMENDATIONS DASHBOARD
   ========================================================================== */

interface RecommendationsDashboardProps {
  teenId: string
  onNavigate?: (recommendation: Recommendation) => void
}

export function RecommendationsDashboard({ teenId, onNavigate }: RecommendationsDashboardProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [insights, setInsights] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>("")

  const fetchRecommendations = async () => {
    setLoading(true)
    try {
      let url = `/api/teen/education/recommendations?teenId=${teenId}&limit=15`
      if (filterType) url += `&type=${filterType}`

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setRecommendations(data.recommendations)
        setInsights(data.insights)
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecommendations()
  }, [teenId, filterType])

  const handleClick = (recommendation: Recommendation) => {
    if (onNavigate) {
      onNavigate(recommendation)
    } else {
      // Default navigation based on type
      const baseUrl = "/teen"
      switch (recommendation.type) {
        case "quiz":
          window.location.href = `${baseUrl}/aide-scolaire/quiz/${recommendation.metadata?.quizId}`
          break
        case "tutorial":
          window.location.href = `${baseUrl}/aide-scolaire/tutoriels/${recommendation.metadata?.tutorialId}`
          break
        case "challenge":
          window.location.href = `${baseUrl}/defis`
          break
        default:
          break
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-zinc-800 rounded-2xl" />
        ))}
      </div>
    )
  }

  const highPriority = recommendations.filter((r) => r.priority === "high")
  const otherRecommendations = recommendations.filter((r) => r.priority !== "high")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Recommandations</h2>
          <p className="text-sm text-zinc-500">Personnalisees pour toi</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchRecommendations}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </Button>
      </div>

      {/* Weak subjects alert */}
      {insights?.weakSubjects && (
        <WeakSubjectsAlert subjects={insights.weakSubjects} />
      )}

      {/* Pillar scores insight */}
      {insights?.pillarScores && (
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <h4 className="font-medium text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Tes scores piliers
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className={cn(
                "text-2xl font-bold",
                insights.pillarScores.school_score >= 70 ? "text-green-400" :
                insights.pillarScores.school_score >= 50 ? "text-yellow-400" :
                "text-red-400"
              )}>
                {insights.pillarScores.school_score}
              </div>
              <div className="text-xs text-zinc-500">Ecole</div>
            </div>
            <div className="text-center">
              <div className={cn(
                "text-2xl font-bold",
                insights.pillarScores.sport_score >= 70 ? "text-green-400" :
                insights.pillarScores.sport_score >= 50 ? "text-yellow-400" :
                "text-red-400"
              )}>
                {insights.pillarScores.sport_score}
              </div>
              <div className="text-xs text-zinc-500">Sport</div>
            </div>
            <div className="text-center">
              <div className={cn(
                "text-2xl font-bold",
                insights.pillarScores.crea_score >= 70 ? "text-green-400" :
                insights.pillarScores.crea_score >= 50 ? "text-yellow-400" :
                "text-red-400"
              )}>
                {insights.pillarScores.crea_score}
              </div>
              <div className="text-xs text-zinc-500">Creativite</div>
            </div>
          </div>
        </Card>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: "", label: "Tous" },
          { id: "quiz", label: "Quiz" },
          { id: "tutorial", label: "Tutoriels" },
          { id: "challenge", label: "Defis" },
        ].map((filter) => (
          <button
            key={filter.id}
            onClick={() => setFilterType(filter.id)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              filterType === filter.id
                ? "bg-cyan-500 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* High priority */}
      {highPriority.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Prioritaires
          </h3>
          {highPriority.map((rec, index) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <RecommendationCard
                recommendation={rec}
                onClick={() => handleClick(rec)}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Other recommendations */}
      {otherRecommendations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-400">Suggestions</h3>
          {otherRecommendations.map((rec, index) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (highPriority.length + index) * 0.05 }}
            >
              <RecommendationCard
                recommendation={rec}
                onClick={() => handleClick(rec)}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {recommendations.length === 0 && (
        <Card className="p-8 bg-zinc-900 border-zinc-800 text-center">
          <Sparkles className="w-12 h-12 text-cyan-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Bravo !</h3>
          <p className="text-zinc-400">
            Tu es a jour sur toutes tes activites. Continue comme ca !
          </p>
        </Card>
      )}
    </div>
  )
}

/* ==========================================================================
   COMPACT RECOMMENDATIONS WIDGET
   ========================================================================== */

interface RecommendationsWidgetProps {
  teenId: string
  limit?: number
  onSeeAll?: () => void
}

export function RecommendationsWidget({ teenId, limit = 3, onSeeAll }: RecommendationsWidgetProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await fetch(
          `/api/teen/education/recommendations?teenId=${teenId}&limit=${limit}`
        )
        const data = await response.json()
        if (data.success) {
          setRecommendations(data.recommendations)
        }
      } catch (error) {
        console.error("Error fetching recommendations:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendations()
  }, [teenId, limit])

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-zinc-800 rounded-xl" />
        ))}
      </div>
    )
  }

  if (recommendations.length === 0) {
    return null
  }

  const typeIcons = {
    quiz: BookOpen,
    tutorial: PlayCircle,
    challenge: Target,
    resource: Sparkles,
  }

  return (
    <Card className="p-4 bg-zinc-900 border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Pour toi
        </h3>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-sm text-cyan-400 hover:underline"
          >
            Voir tout
          </button>
        )}
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => {
          const Icon = typeIcons[rec.type]
          return (
            <div
              key={rec.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{rec.title}</p>
                <p className="text-xs text-zinc-500 truncate">{rec.reason}</p>
              </div>
              {rec.xpReward && (
                <span className="text-xs text-cyan-400">+{rec.xpReward} XP</span>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
