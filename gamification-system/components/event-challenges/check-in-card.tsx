/**
 * TEENS PARTY MOROCCO - Check-in Card Component
 * ==============================================
 *
 * Carte de check-in/check-out pour les événements.
 */

"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MapPin,
  LogIn,
  LogOut,
  Clock,
  Loader2,
  Check,
  Zap,
  Navigation,
  AlertCircle,
} from "lucide-react"
import confetti from "canvas-confetti"
import {
  type EventCheckIn,
  formatDuration,
} from "../../features/event-challenges"

/* ==========================================================================
   CHECK-IN CARD
   ========================================================================== */

interface CheckInCardProps {
  eventId: string
  eventName: string
  checkIn?: EventCheckIn | null
  onCheckIn: (location?: { lat: number; lng: number }) => Promise<{
    success: boolean
    xpEarned?: number
    error?: string
  }>
  onCheckOut: () => Promise<{
    success: boolean
    duration?: number
    bonusXp?: number
    error?: string
  }>
  requiresLocation?: boolean
}

export function CheckInCard({
  eventId,
  eventName,
  checkIn,
  onCheckIn,
  onCheckOut,
  requiresLocation = true,
}: CheckInCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successData, setSuccessData] = useState<{
    type: "check_in" | "check_out"
    xp?: number
    duration?: number
  } | null>(null)

  const isCheckedIn = checkIn?.status === "checked_in"

  // Mettre à jour la durée en temps réel
  useEffect(() => {
    if (!isCheckedIn || !checkIn?.check_in_time) return

    const updateDuration = () => {
      const checkInTime = new Date(checkIn.check_in_time)
      const now = new Date()
      const diffMinutes = Math.floor(
        (now.getTime() - checkInTime.getTime()) / 60000
      )
      setDuration(diffMinutes)
    }

    updateDuration()
    const interval = setInterval(updateDuration, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [isCheckedIn, checkIn?.check_in_time])

  // Obtenir la géolocalisation
  const getLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Géolocalisation non supportée"))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          reject(new Error("Impossible d'obtenir ta position"))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      )
    })
  }

  const handleCheckIn = async () => {
    setIsLoading(true)
    setError(null)
    setLocationError(null)

    try {
      let loc: { lat: number; lng: number } | undefined

      if (requiresLocation) {
        try {
          loc = await getLocation()
          setLocation(loc)
        } catch (locError) {
          setLocationError("Position requise pour le check-in")
          setIsLoading(false)
          return
        }
      }

      const result = await onCheckIn(loc)

      if (result.success) {
        setShowSuccess(true)
        setSuccessData({ type: "check_in", xp: result.xpEarned })

        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
          colors: ["#22c55e", "#10b981", "#34d399"],
        })

        setTimeout(() => {
          setShowSuccess(false)
          setSuccessData(null)
        }, 3000)
      } else {
        setError(result.error || "Erreur lors du check-in")
      }
    } catch (err) {
      setError("Erreur lors du check-in")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckOut = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await onCheckOut()

      if (result.success) {
        setShowSuccess(true)
        setSuccessData({
          type: "check_out",
          xp: result.bonusXp,
          duration: result.duration,
        })

        setTimeout(() => {
          setShowSuccess(false)
          setSuccessData(null)
        }, 3000)
      } else {
        setError(result.error || "Erreur lors du check-out")
      }
    } catch (err) {
      setError("Erreur lors du check-out")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {showSuccess && successData ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {successData.type === "check_in"
                ? "Check-in réussi !"
                : "Check-out réussi !"}
            </h3>
            {successData.xp && successData.xp > 0 && (
              <div className="flex items-center justify-center gap-2 text-yellow-400 font-bold">
                <Zap className="w-5 h-5" />
                +{successData.xp} XP
              </div>
            )}
            {successData.duration && (
              <p className="text-sm text-zinc-400 mt-2">
                Durée : {formatDuration(successData.duration)}
              </p>
            )}
          </motion.div>
        ) : isCheckedIn ? (
          <motion.div
            key="checked-in"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-green-400">Tu es présent !</p>
                  <p className="text-xs text-zinc-400">{eventName}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-green-400 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-sm">Live</span>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-zinc-800/50 mb-4">
              <Clock className="w-5 h-5 text-cyan-400" />
              <span className="text-2xl font-bold text-white">
                {formatDuration(duration)}
              </span>
              <span className="text-sm text-zinc-400">sur place</span>
            </div>

            {/* Check-out Button */}
            <button
              onClick={handleCheckOut}
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-zinc-800 text-zinc-300 font-semibold hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogOut className="w-5 h-5" />
                  Check-out
                </>
              )}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="not-checked-in"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Check-in</h3>
                <p className="text-sm text-zinc-400">
                  Confirme ta présence à l'événement
                </p>
              </div>
            </div>

            {/* XP Info */}
            <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-zinc-800/50 mb-4">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="font-bold text-yellow-400">+50 XP</span>
              <span className="text-sm text-zinc-400">pour le check-in</span>
            </div>

            {/* Location requirement */}
            {requiresLocation && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50 mb-4 text-xs text-zinc-400">
                <Navigation className="w-4 h-4" />
                <span>Ta position sera utilisée pour confirmer ta présence</span>
              </div>
            )}

            {/* Errors */}
            {(error || locationError) && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 mb-4">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-sm text-red-400">
                  {error || locationError}
                </span>
              </div>
            )}

            {/* Check-in Button */}
            <button
              onClick={handleCheckIn}
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Vérification...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Check-in maintenant
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ==========================================================================
   COMPACT CHECK-IN BUTTON
   ========================================================================== */

interface CompactCheckInButtonProps {
  isCheckedIn: boolean
  duration?: number
  onCheckIn: () => void
  onCheckOut: () => void
  isLoading?: boolean
}

export function CompactCheckInButton({
  isCheckedIn,
  duration = 0,
  onCheckIn,
  onCheckOut,
  isLoading = false,
}: CompactCheckInButtonProps) {
  if (isCheckedIn) {
    return (
      <button
        onClick={onCheckOut}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 text-green-400 font-medium hover:bg-green-500/30 transition-colors"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span>{formatDuration(duration)}</span>
            <LogOut className="w-4 h-4" />
          </>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={onCheckIn}
      disabled={isLoading}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <LogIn className="w-4 h-4" />
          Check-in
        </>
      )}
    </button>
  )
}

/* ==========================================================================
   CHECK-IN HISTORY ITEM
   ========================================================================== */

interface CheckInHistoryItemProps {
  checkIn: EventCheckIn & {
    events?: {
      name: string
      date: string
      venue: string
    }
  }
}

export function CheckInHistoryItem({ checkIn }: CheckInHistoryItemProps) {
  const checkInDate = new Date(checkIn.check_in_time)

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50">
      {/* Icon */}
      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
        <MapPin className="w-5 h-5 text-green-400" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">
          {checkIn.events?.name || "Événement"}
        </p>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>
            {checkInDate.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })}
          </span>
          {checkIn.duration_minutes && (
            <>
              <span>•</span>
              <span>{formatDuration(checkIn.duration_minutes)}</span>
            </>
          )}
        </div>
      </div>

      {/* Status */}
      <div
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          checkIn.status === "checked_in"
            ? "bg-green-500/20 text-green-400"
            : "bg-zinc-700 text-zinc-400"
        }`}
      >
        {checkIn.status === "checked_in" ? "En cours" : "Terminé"}
      </div>
    </div>
  )
}
