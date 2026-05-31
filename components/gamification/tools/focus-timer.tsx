"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Play, Pause, RefreshCw, CheckCircle, Brain } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FocusTimerProps {
  onComplete?: (duration: number) => void
  initialDuration?: number // in minutes
}

export function FocusTimer({ onComplete, initialDuration = 25 }: FocusTimerProps) {
  const [isActive, setIsActive] = useState(false)
  const [timeLeft, setTimeLeft] = useState(initialDuration * 60)
  const [duration, setDuration] = useState(initialDuration)
  const [isCompleted, setIsCompleted] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100
  const circumference = 2 * Math.PI * 120 // Radius 120

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false)
      setIsCompleted(true)
      if (onComplete) onComplete(duration)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isActive, timeLeft, duration, onComplete])

  const toggleTimer = () => setIsActive(!isActive)

  const resetTimer = () => {
    setIsActive(false)
    setIsCompleted(false)
    setTimeLeft(duration * 60)
  }

  const handleDurationChange = (newDuration: number) => {
    setDuration(newDuration)
    setTimeLeft(newDuration * 60)
    setIsActive(false)
    setIsCompleted(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Card className="p-8 flex flex-col items-center justify-center relative overflow-hidden max-w-md mx-auto w-full">
      <div className="relative z-10 flex flex-col items-center w-full">
        <div className="flex items-center gap-2 mb-6">
          <Brain className="w-6 h-6 text-teal" />
          <h2 className="text-xl font-bold text-ink">Mode focus</h2>
        </div>

        {/* Timer Circle */}
        <div className="relative w-64 h-64 flex items-center justify-center mb-8">
          {/* Background Circle */}
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-ink"
            />
            <motion.circle
              cx="128"
              cy="128"
              r="120"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-teal"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (progress / 100) * circumference}
              strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - (progress / 100) * circumference }}
              transition={{ duration: 0.5 }}
            />
          </svg>

          {/* Time Display */}
          <div className="flex flex-col items-center">
            <AnimatePresence mode="wait">
              {isCompleted ? (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="flex flex-col items-center"
                >
                  <CheckCircle className="w-16 h-16 text-lime mb-2" />
                  <span className="text-ink font-bold text-lg">Terminé !</span>
                  <span className="text-teal text-sm mt-1">+50 XP</span>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <span className="text-6xl font-black text-ink font-mono tracking-wider">
                    {formatTime(timeLeft)}
                  </span>
                  <p className="text-mute text-sm mt-2 font-medium uppercase tracking-widest">
                    {isActive ? "Focus en cours..." : "Prêt ?"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 w-full justify-center">
          {!isCompleted ? (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={resetTimer}
                className="border-ink text-mute hover:text-ink hover:border-line rounded-full w-14 h-14"
              >
                <RefreshCw className="w-5 h-5" />
              </Button>

              <Button
                variant="mint"
                size="lg"
                onClick={toggleTimer}
                className="w-32 rounded-full h-16"
              >
                {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current pl-1" />}
              </Button>
            </>
          ) : (
            <Button
              variant="mint"
              onClick={resetTimer}
              className="w-full max-w-[200px]"
            >
              Nouvelle session
            </Button>
          )}
        </div>

        {/* Duration Selector (only when stopped) */}
        {!isActive && !isCompleted && (
          <div className="flex gap-2 mt-8">
            {[15, 25, 45].map((d) => (
              <button
                key={d}
                onClick={() => handleDurationChange(d)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border",
                  duration === d
                    ? "bg-teal/20 border-teal text-teal "
                    : "bg-card border-ink text-mute hover:text-ink hover:border-ink"
                )}
              >
                {d} min
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}












