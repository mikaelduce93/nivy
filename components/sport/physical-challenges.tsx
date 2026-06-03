"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
  Target,
  Flame,
  Trophy,
  Clock,
  Camera,
  Video,
  Upload,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Zap,
  Calendar,
  Filter,
  X,
  ImageIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface Challenge {
  id: string
  name: string
  description: string
  challenge_type: "daily" | "weekly" | "monthly" | "special"
  sport_category: string
  objective_value: number
  objective_unit: string
  xp_reward: number
  difficulty: "easy" | "medium" | "hard" | "extreme"
  icon?: string
  valid_from?: string
  valid_until?: string
  progress?: {
    id: string
    current_value: number
    progress_percent: number
    completed: boolean
    completed_at?: string
    validated: boolean
    proof_url?: string
    xp_earned?: number
    started_at: string
  } | null
  is_started: boolean
  is_completed: boolean
}

interface ChallengeStats {
  total: number
  started: number
  completed: number
  totalXpEarned: number
}

/* ==========================================================================
   CHALLENGE CARD
   ========================================================================== */

interface ChallengeCardProps {
  challenge: Challenge
  onStart: () => void
  onUpdate: (value: number) => void
  onComplete: (proofUrl?: string, proofType?: string) => void
  isExpanded: boolean
  onToggle: () => void
}

function ChallengeCard({
  challenge,
  onStart,
  onUpdate,
  onComplete,
  isExpanded,
  onToggle,
}: ChallengeCardProps) {
  const [inputValue, setInputValue] = useState(challenge.progress?.current_value || 0)
  const [showProofModal, setShowProofModal] = useState(false)

  const difficultyConfig = {
    easy: { color: "text-lime", bg: "bg-lime/10", label: "Facile" },
    medium: { color: "text-gold", bg: "bg-gold/10", label: "Moyen" },
    hard: { color: "text-coral", bg: "bg-coral/10", label: "Difficile" },
    extreme: { color: "text-destructive", bg: "bg-destructive/10", label: "Extreme" },
  }

  const typeConfig = {
    daily: { color: "text-teal", bg: "bg-teal/10", label: "Quotidien", icon: Calendar },
    weekly: { color: "text-pink", bg: "bg-pink/10", label: "Hebdo", icon: Calendar },
    monthly: { color: "text-teal", bg: "bg-teal/10", label: "Mensuel", icon: Calendar },
    special: { color: "text-gold", bg: "bg-gold/10", label: "Special", icon: Trophy },
  }

  const difficulty = difficultyConfig[challenge.difficulty]
  const type = typeConfig[challenge.challenge_type]
  const TypeIcon = type.icon

  const progressPercent = challenge.progress?.progress_percent || 0

  return (
    <motion.div layout>
      <Card
        className={cn(
          "overflow-hidden transition-all",
          challenge.is_completed
            ? "bg-lime/10 border-lime/30"
            : "bg-card border-ink"
        )}
      >
        {/* Header */}
        <div
          className="p-4 cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center",
              challenge.is_completed ? "bg-lime/20" : "bg-gradient-to-br from-teal/20 to-teal/20"
            )}>
              {challenge.is_completed ? (
                <CheckCircle2 className="w-7 h-7 text-lime" />
              ) : (
                <Target className="w-7 h-7 text-teal" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", type.bg, type.color)}>
                  {type.label}
                </span>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", difficulty.bg, difficulty.color)}>
                  {difficulty.label}
                </span>
              </div>

              <h3 className="font-bold text-ink line-clamp-1">{challenge.name}</h3>
              <p className="text-sm text-mute line-clamp-1">{challenge.description}</p>

              {/* Progress bar */}
              {challenge.is_started && !challenge.is_completed && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-mute">
                      {challenge.progress?.current_value || 0} / {challenge.objective_value} {challenge.objective_unit}
                    </span>
                    <span className="text-teal">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <span className="flex items-center gap-1 text-teal text-sm font-medium">
                <Zap className="w-4 h-4" />
                +{challenge.xp_reward} XP
              </span>
              <ChevronRight className={cn(
                "w-5 h-5 text-mute transition-transform",
                isExpanded && "rotate-90"
              )} />
            </div>
          </div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-ink pt-4">
                {!challenge.is_started ? (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      onStart()
                    }}
                    className="w-full bg-gradient-to-r from-teal to-teal hover:from-teal hover:to-teal"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Commencer le defi
                  </Button>
                ) : challenge.is_completed ? (
                  <div className="text-center">
                    <CheckCircle2 className="w-12 h-12 text-lime mx-auto mb-2" />
                    <p className="text-lime font-medium">Defi complete !</p>
                    {challenge.progress?.xp_earned && (
                      <p className="text-sm text-mute">
                        +{challenge.progress.xp_earned} XP gagnes
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Update progress */}
                    <div>
                      <label className="text-sm text-mute mb-2 block">
                        Mettre a jour ta progression
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={inputValue}
                          onChange={(e) => setInputValue(Number(e.target.value))}
                          onClick={(e) => e.stopPropagation()}
                          min={0}
                          max={challenge.objective_value}
                          className="flex-1 bg-card border border-ink rounded-xl px-4 py-2 text-ink"
                        />
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            onUpdate(inputValue)
                          }}
                          variant="outline"
                          className="border-ink"
                        >
                          Sauver
                        </Button>
                      </div>
                    </div>

                    {/* Complete with proof */}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowProofModal(true)
                      }}
                      className="w-full bg-gradient-to-r from-lime to-lime hover:from-lime hover:to-lime"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Valider le defi
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Proof modal */}
      <ProofUploadModal
        isOpen={showProofModal}
        onClose={() => setShowProofModal(false)}
        onSubmit={(proofUrl, proofType) => {
          onComplete(proofUrl, proofType)
          setShowProofModal(false)
        }}
        challengeName={challenge.name}
      />
    </motion.div>
  )
}

/* ==========================================================================
   PROOF UPLOAD MODAL
   ========================================================================== */

interface ProofUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (proofUrl?: string, proofType?: string) => void
  challengeName: string
}

function ProofUploadModal({ isOpen, onClose, onSubmit, challengeName }: ProofUploadModalProps) {
  const [proofType, setProofType] = useState<"photo" | "video" | "manual">("manual")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Create preview
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    // In production, upload to Supabase storage
    // For now, we'll simulate the upload
    setUploading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setUploading(false)
  }

  const handleSubmit = () => {
    onSubmit(previewUrl || undefined, proofType)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-ink/80"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-card rounded-2xl p-6 max-w-md w-full border border-ink"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-mute hover:text-ink"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-ink mb-2">Valider le defi</h3>
        <p className="text-sm text-mute mb-6">{challengeName}</p>

        {/* Proof type selection */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { type: "photo", icon: Camera, label: "Photo" },
            { type: "video", icon: Video, label: "Video" },
            { type: "manual", icon: CheckCircle2, label: "Manuel" },
          ].map((option) => (
            <button
              key={option.type}
              onClick={() => setProofType(option.type as typeof proofType)}
              className={cn(
                "p-4 rounded-xl flex flex-col items-center gap-2 transition-all",
                proofType === option.type
                  ? "bg-teal/20 border-2 border-teal"
                  : "bg-card border-2 border-transparent hover:border-ink"
              )}
            >
              <option.icon className={cn(
                "w-6 h-6",
                proofType === option.type ? "text-teal" : "text-mute"
              )} />
              <span className={cn(
                "text-sm",
                proofType === option.type ? "text-teal" : "text-mute"
              )}>
                {option.label}
              </span>
            </button>
          ))}
        </div>

        {/* Upload area */}
        {proofType !== "manual" && (
          <div className="mb-6">
            <input
              ref={fileInputRef}
              type="file"
              accept={proofType === "photo" ? "image/*" : "video/*"}
              onChange={handleFileSelect}
              className="hidden"
            />

            {previewUrl ? (
              <div className="relative rounded-xl overflow-hidden">
                {proofType === "photo" ? (
                  <div className="relative w-full h-48">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <video src={previewUrl} className="w-full h-48 object-cover" controls>
                    <track kind="captions" srcLang="fr" label="Francais" />
                  </video>
                )}
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="absolute top-2 right-2 p-2 bg-ink/50 rounded-full"
                >
                  <X className="w-4 h-4 text-ink" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-ink rounded-xl flex flex-col items-center justify-center gap-3 hover:border-teal/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center">
                  {proofType === "photo" ? (
                    <ImageIcon className="w-6 h-6 text-mute" />
                  ) : (
                    <Video className="w-6 h-6 text-mute" />
                  )}
                </div>
                <p className="text-sm text-mute">
                  Clique pour ajouter {proofType === "photo" ? "une photo" : "une video"}
                </p>
              </button>
            )}
          </div>
        )}

        {/* Manual confirmation message */}
        {proofType === "manual" && (
          <div className="mb-6 p-4 bg-gold/10 rounded-xl">
            <p className="text-sm text-gold">
              En validant manuellement, tu confirmes sur l'honneur avoir complete ce defi.
            </p>
          </div>
        )}

        {/* Submit button */}
        <Button
          onClick={handleSubmit}
          disabled={uploading || (proofType !== "manual" && !previewUrl)}
          className="w-full bg-gradient-to-r from-lime to-lime hover:from-lime hover:to-lime"
        >
          {uploading ? (
            <>
              <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirmer la validation
            </>
          )}
        </Button>
      </motion.div>
    </div>
  )
}

/* ==========================================================================
   CHALLENGE TIMER
   ========================================================================== */

interface ChallengeTimerProps {
  duration: number // in seconds
  onComplete: () => void
}

export function ChallengeTimer({ duration, onComplete }: ChallengeTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const [isRunning, setIsRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            setIsComplete(true)
            onComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [isRunning, timeLeft, onComplete])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const progress = ((duration - timeLeft) / duration) * 100

  const reset = () => {
    setTimeLeft(duration)
    setIsRunning(false)
    setIsComplete(false)
  }

  return (
    <Card className="p-6 bg-card border-ink">
      <div className="text-center">
        {/* Timer display */}
        <div className="relative w-48 h-48 mx-auto mb-6">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-ink"
            />
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={552}
              strokeDashoffset={552 - (552 * progress) / 100}
              className={cn(
                "transition-all duration-1000",
                isComplete ? "text-lime" : "text-teal"
              )}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn(
              "text-4xl font-bold font-mono",
              isComplete ? "text-lime" : "text-ink"
            )}>
              {isComplete ? (
                <CheckCircle2 className="w-16 h-16" />
              ) : (
                formatTime(timeLeft)
              )}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isComplete && (
            <Button
              onClick={() => setIsRunning(!isRunning)}
              size="lg"
              className={cn(
                "w-16 h-16 rounded-full",
                isRunning
                  ? "bg-gold hover:bg-gold"
                  : "bg-teal hover:bg-teal"
              )}
            >
              {isRunning ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </Button>
          )}
          <Button
            onClick={reset}
            size="lg"
            variant="outline"
            className="w-16 h-16 rounded-full border-ink"
          >
            <RotateCcw className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

/* ==========================================================================
   PHYSICAL CHALLENGES DASHBOARD
   ========================================================================== */

interface PhysicalChallengesDashboardProps {
  teenId: string
}

export function PhysicalChallengesDashboard({ teenId }: PhysicalChallengesDashboardProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [stats, setStats] = useState<ChallengeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchChallenges = async () => {
    setLoading(true)
    try {
      let url = `/api/teen/sport/challenges?teenId=${teenId}`
      if (filterType) url += `&type=${filterType}`
      if (filterStatus) url += `&status=${filterStatus}`

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setChallenges(data.challenges)
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching challenges:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChallenges()
  }, [teenId, filterType, filterStatus])

  const handleStart = async (challengeId: string) => {
    try {
      const response = await fetch("/api/teen/sport/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teenId,
          challengeId,
          action: "start",
        }),
      })

      if (response.ok) {
        fetchChallenges()
      }
    } catch (error) {
      console.error("Error starting challenge:", error)
    }
  }

  const handleUpdate = async (challengeId: string, value: number) => {
    try {
      const response = await fetch("/api/teen/sport/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teenId,
          challengeId,
          action: "update",
          value,
        }),
      })

      if (response.ok) {
        fetchChallenges()
      }
    } catch (error) {
      console.error("Error updating challenge:", error)
    }
  }

  const handleComplete = async (challengeId: string, proofUrl?: string, proofType?: string) => {
    try {
      const response = await fetch("/api/teen/sport/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teenId,
          challengeId,
          action: "complete",
          proofUrl,
          proofType,
        }),
      })

      if (response.ok) {
        fetchChallenges()
      }
    } catch (error) {
      console.error("Error completing challenge:", error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-card rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats header */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4 bg-card border-ink text-center">
            <Target className="w-6 h-6 text-teal mx-auto mb-2" />
            <p className="text-2xl font-bold text-ink">{stats.total}</p>
            <p className="text-xs text-mute">Total</p>
          </Card>
          <Card className="p-4 bg-card border-ink text-center">
            <Flame className="w-6 h-6 text-coral mx-auto mb-2" />
            <p className="text-2xl font-bold text-ink">{stats.started}</p>
            <p className="text-xs text-mute">En cours</p>
          </Card>
          <Card className="p-4 bg-card border-ink text-center">
            <Trophy className="w-6 h-6 text-lime mx-auto mb-2" />
            <p className="text-2xl font-bold text-ink">{stats.completed}</p>
            <p className="text-xs text-mute">Completes</p>
          </Card>
          <Card className="p-4 bg-card border-ink text-center">
            <Zap className="w-6 h-6 text-gold mx-auto mb-2" />
            <p className="text-2xl font-bold text-ink">{stats.totalXpEarned}</p>
            <p className="text-xs text-mute">XP gagnes</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex gap-2">
          {[
            { id: "", label: "Tous" },
            { id: "daily", label: "Quotidien" },
            { id: "weekly", label: "Hebdo" },
            { id: "monthly", label: "Mensuel" },
            { id: "special", label: "Special" },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setFilterType(filter.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                filterType === filter.id
                  ? "bg-teal text-ink"
                  : "bg-card text-mute hover:bg-muted"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {[
            { id: "all", label: "Tous" },
            { id: "active", label: "En cours" },
            { id: "completed", label: "Completes" },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setFilterStatus(filter.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                filterStatus === filter.id
                  ? "bg-pink text-ink"
                  : "bg-card text-mute hover:bg-muted"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Challenges list */}
      <div className="space-y-4">
        {challenges.map((challenge) => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            onStart={() => handleStart(challenge.id)}
            onUpdate={(value) => handleUpdate(challenge.id, value)}
            onComplete={(proofUrl, proofType) => handleComplete(challenge.id, proofUrl, proofType)}
            isExpanded={expandedId === challenge.id}
            onToggle={() => setExpandedId(expandedId === challenge.id ? null : challenge.id)}
          />
        ))}
      </div>

      {/* Empty state */}
      {challenges.length === 0 && (
        <Card className="p-8 bg-card border-ink text-center">
          <Target className="w-12 h-12 text-mute mx-auto mb-4" />
          <h3 className="text-lg font-bold text-ink mb-2">Aucun defi trouve</h3>
          <p className="text-mute">
            {filterStatus === "active"
              ? "Tu n'as pas de defi en cours. Lance-toi !"
              : filterStatus === "completed"
              ? "Tu n'as pas encore complete de defi."
              : "Aucun defi disponible pour le moment."}
          </p>
        </Card>
      )}
    </div>
  )
}

/* ==========================================================================
   COMPACT CHALLENGES WIDGET
   ========================================================================== */

interface ChallengesWidgetProps {
  teenId: string
  limit?: number
  onSeeAll?: () => void
}

export function ChallengesWidget({ teenId, limit = 3, onSeeAll }: ChallengesWidgetProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const response = await fetch(
          `/api/teen/sport/challenges?teenId=${teenId}&status=active`
        )
        const data = await response.json()
        if (data.success) {
          setChallenges(data.challenges.slice(0, limit))
        }
      } catch (error) {
        console.error("Error fetching challenges:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchChallenges()
  }, [teenId, limit])

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-card rounded-xl" />
        ))}
      </div>
    )
  }

  if (challenges.length === 0) {
    return null
  }

  return (
    <Card className="p-4 bg-card border-ink">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-ink flex items-center gap-2">
          <Target className="w-4 h-4 text-teal" />
          Defis en cours
        </h3>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-sm text-teal hover:underline"
          >
            Voir tout
          </button>
        )}
      </div>

      <div className="space-y-3">
        {challenges.map((challenge) => (
          <div
            key={challenge.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-card transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-teal" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink font-medium truncate">{challenge.name}</p>
              <div className="flex items-center gap-2">
                <Progress
                  value={challenge.progress?.progress_percent || 0}
                  className="h-1.5 flex-1"
                />
                <span className="text-xs text-mute">
                  {challenge.progress?.progress_percent || 0}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
