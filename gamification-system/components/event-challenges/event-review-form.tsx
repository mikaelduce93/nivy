/**
 * TEENS PARTY MOROCCO - Event Review Form Component
 * ==================================================
 *
 * Formulaire d'avis pour les événements.
 */

"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Star,
  Music,
  Users,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Check,
  Zap,
  X,
} from "lucide-react"
import confetti from "canvas-confetti"
import { type EventReview } from "../../features/event-challenges"

/* ==========================================================================
   STAR RATING COMPONENT
   ========================================================================== */

interface StarRatingProps {
  value: number
  onChange: (value: number) => void
  size?: "sm" | "md" | "lg"
  disabled?: boolean
}

function StarRating({
  value,
  onChange,
  size = "md",
  disabled = false,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0)

  const sizeClass = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  }[size]

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onMouseEnter={() => setHoverValue(star)}
          onMouseLeave={() => setHoverValue(0)}
          onClick={() => onChange(star)}
          className={`transition-transform ${
            disabled ? "cursor-default" : "cursor-pointer hover:scale-110"
          }`}
        >
          <Star
            className={`${sizeClass} transition-colors ${
              star <= (hoverValue || value)
                ? "text-yellow-400 fill-yellow-400"
                : "text-zinc-600"
            }`}
          />
        </button>
      ))}
    </div>
  )
}

/* ==========================================================================
   MAIN REVIEW FORM
   ========================================================================== */

interface EventReviewFormProps {
  eventId: string
  eventName: string
  existingReview?: EventReview | null
  onSubmit: (review: {
    rating: number
    reviewText?: string
    atmosphereRating?: number
    musicRating?: number
    serviceRating?: number
    wouldRecommend: boolean
  }) => Promise<{ success: boolean; xpEarned?: number; error?: string }>
  onCancel?: () => void
}

export function EventReviewForm({
  eventId,
  eventName,
  existingReview,
  onSubmit,
  onCancel,
}: EventReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0)
  const [reviewText, setReviewText] = useState(existingReview?.review_text || "")
  const [atmosphereRating, setAtmosphereRating] = useState(
    existingReview?.atmosphere_rating || 0
  )
  const [musicRating, setMusicRating] = useState(existingReview?.music_rating || 0)
  const [serviceRating, setServiceRating] = useState(
    existingReview?.service_rating || 0
  )
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(
    existingReview?.would_recommend ?? null
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)

  const isValid = rating > 0 && wouldRecommend !== null

  const handleSubmit = async () => {
    if (!isValid) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await onSubmit({
        rating,
        reviewText: reviewText.trim() || undefined,
        atmosphereRating: atmosphereRating || undefined,
        musicRating: musicRating || undefined,
        serviceRating: serviceRating || undefined,
        wouldRecommend: wouldRecommend!,
      })

      if (result.success) {
        setShowSuccess(true)
        setXpEarned(result.xpEarned || 0)

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#fbbf24", "#f59e0b", "#eab308"],
        })
      } else {
        setError(result.error || "Erreur lors de l'envoi")
      }
    } catch (err) {
      setError("Erreur lors de l'envoi")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-yellow-500 flex items-center justify-center">
          <Star className="w-10 h-10 text-black fill-black" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Merci pour ton avis !</h3>
        <p className="text-zinc-400 mb-4">
          Ton feedback nous aide à améliorer les prochains événements
        </p>
        {xpEarned > 0 && (
          <div className="flex items-center justify-center gap-2 text-yellow-400 font-bold text-lg">
            <Zap className="w-6 h-6" />
            +{xpEarned} XP gagnés
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-lg">Ton avis compte !</h3>
          <p className="text-sm text-zinc-400">{eventName}</p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        )}
      </div>

      {/* XP Reward Info */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
        <Zap className="w-5 h-5 text-yellow-400" />
        <span className="text-sm text-yellow-400">
          Gagne <strong>+100 XP</strong> en laissant un avis !
        </span>
      </div>

      {/* Main Rating */}
      <div className="text-center py-4">
        <p className="text-sm text-zinc-400 mb-3">Note globale</p>
        <StarRating value={rating} onChange={setRating} size="lg" />
        <p className="text-sm text-zinc-500 mt-2">
          {rating === 0
            ? "Appuie sur une étoile"
            : rating === 1
            ? "Décevant 😞"
            : rating === 2
            ? "Moyen 😐"
            : rating === 3
            ? "Bien 🙂"
            : rating === 4
            ? "Super ! 😄"
            : "Incroyable ! 🤩"}
        </p>
      </div>

      {/* Detailed Ratings */}
      <div className="space-y-4">
        <p className="text-sm font-medium text-zinc-400">Notes détaillées (optionnel)</p>

        {/* Atmosphere */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span className="text-white">Ambiance</span>
          </div>
          <StarRating
            value={atmosphereRating}
            onChange={setAtmosphereRating}
            size="sm"
          />
        </div>

        {/* Music */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-pink-400" />
            <span className="text-white">Musique</span>
          </div>
          <StarRating
            value={musicRating}
            onChange={setMusicRating}
            size="sm"
          />
        </div>

        {/* Service */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <span className="text-white">Service</span>
          </div>
          <StarRating
            value={serviceRating}
            onChange={setServiceRating}
            size="sm"
          />
        </div>
      </div>

      {/* Would Recommend */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-zinc-400">
          Recommanderais-tu cet événement ?
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setWouldRecommend(true)}
            className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
              wouldRecommend === true
                ? "bg-green-500 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-green-500/20 hover:text-green-400"
            }`}
          >
            <ThumbsUp className="w-5 h-5" />
            Oui !
          </button>
          <button
            type="button"
            onClick={() => setWouldRecommend(false)}
            className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
              wouldRecommend === false
                ? "bg-red-500 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-red-500/20 hover:text-red-400"
            }`}
          >
            <ThumbsDown className="w-5 h-5" />
            Non
          </button>
        </div>
      </div>

      {/* Comment */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">
          Un commentaire ? (optionnel)
        </label>
        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Partage ton expérience..."
          maxLength={500}
          rows={3}
          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-yellow-500 resize-none"
        />
        <p className="text-xs text-zinc-500 text-right">{reviewText.length}/500</p>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400 text-center">{error}</p>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!isValid || isSubmitting}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Envoi...
          </>
        ) : (
          <>
            <Star className="w-5 h-5" />
            Envoyer mon avis
          </>
        )}
      </button>
    </div>
  )
}

/* ==========================================================================
   COMPACT REVIEW DISPLAY
   ========================================================================== */

interface ReviewDisplayProps {
  review: EventReview
}

export function ReviewDisplay({ review }: ReviewDisplayProps) {
  return (
    <div className="p-4 rounded-2xl bg-zinc-800/50 border border-zinc-700">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-zinc-400">Ton avis</p>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-4 h-4 ${
                star <= review.rating
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-zinc-600"
              }`}
            />
          ))}
        </div>
      </div>

      {review.review_text && (
        <p className="text-white text-sm mb-3">"{review.review_text}"</p>
      )}

      <div className="flex items-center gap-4 text-xs text-zinc-500">
        {review.atmosphere_rating && (
          <span>Ambiance: {review.atmosphere_rating}/5</span>
        )}
        {review.music_rating && <span>Musique: {review.music_rating}/5</span>}
        {review.service_rating && (
          <span>Service: {review.service_rating}/5</span>
        )}
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-700">
        {review.would_recommend ? (
          <div className="flex items-center gap-1 text-green-400 text-sm">
            <ThumbsUp className="w-4 h-4" />
            Tu recommandes
          </div>
        ) : (
          <div className="flex items-center gap-1 text-red-400 text-sm">
            <ThumbsDown className="w-4 h-4" />
            Tu ne recommandes pas
          </div>
        )}
        {review.xp_earned > 0 && (
          <div className="flex items-center gap-1 text-yellow-400 text-sm ml-auto">
            <Zap className="w-4 h-4" />
            +{review.xp_earned} XP
          </div>
        )}
      </div>
    </div>
  )
}

/* ==========================================================================
   REVIEW PROMPT CARD
   ========================================================================== */

interface ReviewPromptCardProps {
  eventName: string
  onReview: () => void
}

export function ReviewPromptCard({ eventName, onReview }: ReviewPromptCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
          <Star className="w-6 h-6 text-yellow-400" />
        </div>
        <div>
          <h3 className="font-bold text-white">Qu'as-tu pensé ?</h3>
          <p className="text-sm text-zinc-400">{eventName}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-yellow-400" />
        <span className="text-sm text-yellow-400">
          Gagne <strong>+100 XP</strong> en laissant un avis
        </span>
      </div>

      <button
        onClick={onReview}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold hover:opacity-90 transition-opacity"
      >
        Laisser un avis
      </button>
    </motion.div>
  )
}
