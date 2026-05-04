"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Maximize,
  CheckCircle2,
  Clock,
  Zap,
  BookOpen,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface Tutorial {
  id: string
  code: string
  title: string
  description: string
  subject: string
  video_url: string
  video_duration_minutes: number
  content_type: string
  difficulty: string
  grade_level: string
  xp_reward: number
  completion_threshold: number
  thumbnail_url?: string
  progress_percent?: number
  completed?: boolean
}

/* ==========================================================================
   TUTORIAL PLAYER COMPONENT
   ========================================================================== */

interface TutorialPlayerProps {
  tutorial: Tutorial
  teenId: string
  type?: "educational" | "passion"
  onComplete?: (xpEarned: number) => void
  onProgressUpdate?: (progress: number) => void
}

export function TutorialPlayer({
  tutorial,
  teenId,
  type = "educational",
  onComplete,
  onProgressUpdate,
}: TutorialPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(tutorial.progress_percent || 0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(tutorial.video_duration_minutes * 60)
  const [isMuted, setIsMuted] = useState(false)
  const [isCompleted, setIsCompleted] = useState(tutorial.completed || false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)

  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveTimeRef = useRef<number>(0)

  // Simulate video progress (in real implementation, this would be controlled by actual video player)
  useEffect(() => {
    if (isPlaying && !isCompleted) {
      progressIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const newTime = prev + 1
          const newProgress = Math.min(100, (newTime / duration) * 100)
          setProgress(newProgress)

          // Save progress every 10 seconds
          if (newTime - lastSaveTimeRef.current >= 10) {
            saveProgress(newProgress, 10)
            lastSaveTimeRef.current = newTime
          }

          // Check completion
          if (newProgress >= tutorial.completion_threshold && !isCompleted) {
            handleCompletion()
          }

          return newTime >= duration ? duration : newTime
        })
      }, 1000)
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [isPlaying, duration, isCompleted])

  const saveProgress = async (progressPercent: number, watchTimeSeconds: number) => {
    try {
      await fetch("/api/teen/education/tutorials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teenId,
          tutorialId: tutorial.id,
          type,
          progressPercent: Math.round(progressPercent),
          watchTimeSeconds,
        }),
      })
      onProgressUpdate?.(progressPercent)
    } catch (error) {
      console.error("Error saving progress:", error)
    }
  }

  const handleCompletion = async () => {
    setIsCompleted(true)
    setIsPlaying(false)
    setShowCompletionModal(true)

    // Final save
    const response = await fetch("/api/teen/education/tutorials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teenId,
        tutorialId: tutorial.id,
        type,
        progressPercent: 100,
        watchTimeSeconds: 0,
      }),
    })

    const data = await response.json()
    if (data.success && data.progress.xpEarned > 0) {
      onComplete?.(data.progress.xpEarned)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = x / rect.width
    const newTime = percent * duration
    setCurrentTime(newTime)
    setProgress(percent * 100)
  }

  return (
    <div className="space-y-4">
      {/* Video container */}
      <div className="relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden">
        {/* Thumbnail/placeholder when not playing */}
        {!isPlaying && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: tutorial.thumbnail_url
                ? `url(${tutorial.thumbnail_url})`
                : "linear-gradient(to br, #18181b, #27272a)",
            }}
          >
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <motion.button
                className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsPlaying(true)}
              >
                <Play className="w-8 h-8 text-white ml-1" />
              </motion.button>
            </div>
          </div>
        )}

        {/* Video content (would be replaced with actual video player) */}
        {isPlaying && (
          <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
            <div className="text-center">
              <BookOpen className="w-16 h-16 text-cyan-500 mx-auto mb-4" />
              <p className="text-white font-medium">{tutorial.title}</p>
              <p className="text-zinc-500 text-sm">Lecture en cours...</p>
            </div>
          </div>
        )}

        {/* Controls overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          {/* Progress bar */}
          <div
            className="h-1 bg-zinc-700 rounded-full mb-3 cursor-pointer"
            onClick={handleSeek}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
            </motion.div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                className="text-white hover:text-cyan-400 transition-colors"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
              </button>
              <button
                className="text-white hover:text-cyan-400 transition-colors"
                onClick={() => setCurrentTime(Math.max(0, currentTime - 10))}
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                className="text-white hover:text-cyan-400 transition-colors"
                onClick={() => setCurrentTime(Math.min(duration, currentTime + 10))}
              >
                <SkipForward className="w-5 h-5" />
              </button>
              <button
                className="text-white hover:text-cyan-400 transition-colors"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <span className="text-sm text-zinc-400">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {isCompleted && (
                <span className="flex items-center gap-1 text-green-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Complete
                </span>
              )}
              <button className="text-white hover:text-cyan-400 transition-colors">
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tutorial info */}
      <Card className="p-4 bg-zinc-900 border-zinc-800">
        <h2 className="text-lg font-bold text-white mb-2">{tutorial.title}</h2>
        <p className="text-zinc-400 text-sm mb-4">{tutorial.description}</p>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400">
            {tutorial.subject}
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400">
            <Clock className="w-3 h-3 inline mr-1" />
            {tutorial.video_duration_minutes} min
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400">
            <Zap className="w-3 h-3 inline mr-1" />
            +{tutorial.xp_reward} XP
          </span>
          {isCompleted && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
              <CheckCircle2 className="w-3 h-3 inline mr-1" />
              Complete
            </span>
          )}
        </div>
      </Card>

      {/* Completion modal */}
      {showCompletionModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="bg-zinc-900 rounded-2xl p-6 max-w-md mx-4 text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <motion.div
              className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mx-auto mb-4 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
            >
              <CheckCircle2 className="w-10 h-10 text-white" />
            </motion.div>
            <h3 className="text-2xl font-black text-white mb-2">Tutoriel termine !</h3>
            <p className="text-zinc-400 mb-4">
              Tu as gagne <span className="text-cyan-400 font-bold">+{tutorial.xp_reward} XP</span>
            </p>
            <Button
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500"
              onClick={() => setShowCompletionModal(false)}
            >
              Continuer
            </Button>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

/* ==========================================================================
   TUTORIAL CARD COMPONENT (for listing)
   ========================================================================== */

interface TutorialCardProps {
  tutorial: Tutorial
  onClick: () => void
}

export function TutorialCard({ tutorial, onClick }: TutorialCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className="overflow-hidden bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
        {/* Thumbnail */}
        <div
          className="aspect-video bg-zinc-800 relative"
          style={{
            backgroundImage: tutorial.thumbnail_url
              ? `url(${tutorial.thumbnail_url})`
              : "linear-gradient(to br, #18181b, #27272a)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Duration badge */}
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-white text-xs">
            {tutorial.video_duration_minutes} min
          </div>

          {/* Progress bar */}
          {(tutorial.progress_percent || 0) > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
              <div
                className="h-full bg-cyan-500"
                style={{ width: `${tutorial.progress_percent}%` }}
              />
            </div>
          )}

          {/* Completed overlay */}
          {tutorial.completed && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-bold text-white mb-1 line-clamp-2">{tutorial.title}</h3>
          <p className="text-sm text-zinc-500 line-clamp-2 mb-3">{tutorial.description}</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400">
                {tutorial.subject}
              </span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400">
                +{tutorial.xp_reward} XP
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
