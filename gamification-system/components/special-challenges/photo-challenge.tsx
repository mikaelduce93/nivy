/**
 * TEENS PARTY MOROCCO - Photo Challenge Component
 * ================================================
 *
 * Composants pour les défis photo.
 */

"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Camera,
  Upload,
  X,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Trophy,
  Zap,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  Check,
  Award,
} from "lucide-react"
import {
  type SpecialChallenge,
  type ChallengeSubmission,
  formatTimeRemaining,
} from "../../features/special-challenges"

/* ==========================================================================
   PHOTO SUBMISSION COMPONENT
   ========================================================================== */

interface PhotoSubmissionProps {
  challenge: SpecialChallenge
  onSubmit: (imageUrl: string, caption?: string) => Promise<void>
  onCancel: () => void
  uploadImage: (file: File) => Promise<string>
}

export function PhotoSubmission({
  challenge,
  onSubmit,
  onCancel,
  uploadImage,
}: PhotoSubmissionProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const timeRemaining = formatTimeRemaining(challenge.time_remaining_seconds)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Seules les images sont acceptées")
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("L'image ne doit pas dépasser 10 MB")
      return
    }

    setSelectedImage(file)
    setPreviewUrl(URL.createObjectURL(file))
    setError(null)
  }

  const handleSubmit = async () => {
    if (!selectedImage) return

    setIsUploading(true)
    setError(null)

    try {
      const imageUrl = await uploadImage(selectedImage)
      await onSubmit(imageUrl, caption || undefined)
    } catch (err) {
      setError("Erreur lors de l'envoi. Réessaie.")
    } finally {
      setIsUploading(false)
    }
  }

  const clearSelection = () => {
    setSelectedImage(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setCaption("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-pink-400" />
          <span className="font-bold text-white">{challenge.title}</span>
        </div>
        <div
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
            timeRemaining.urgent
              ? "bg-red-500 text-white"
              : "bg-zinc-700 text-white"
          }`}
        >
          <Clock className="w-3 h-3" />
          {timeRemaining.text}
        </div>
      </div>

      {/* Instructions */}
      <p className="text-sm text-zinc-400">{challenge.description}</p>

      {/* Photo Selection */}
      {!previewUrl ? (
        <div className="space-y-3">
          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-square rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-800/50 flex flex-col items-center justify-center gap-4 hover:border-pink-500 hover:bg-pink-500/5 transition-colors"
          >
            <div className="w-16 h-16 rounded-full bg-pink-500/20 flex items-center justify-center">
              <Upload className="w-8 h-8 text-pink-400" />
            </div>
            <div className="text-center">
              <p className="font-medium text-white">Choisis une photo</p>
              <p className="text-sm text-zinc-400">ou prends-en une nouvelle</p>
            </div>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="relative rounded-2xl overflow-hidden">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full aspect-square object-cover"
            />
            <button
              onClick={clearSelection}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Caption */}
          <div>
            <input
              type="text"
              placeholder="Ajoute une légende (optionnel)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-pink-500"
            />
            <p className="text-xs text-zinc-500 mt-1 text-right">
              {caption.length}/200
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400 text-center">{error}</p>
      )}

      {/* XP Info */}
      <div className="flex items-center justify-center gap-4 p-3 rounded-xl bg-zinc-800/50">
        <div className="flex items-center gap-1 text-yellow-400">
          <Zap className="w-4 h-4" />
          <span className="font-bold">+{challenge.base_xp} XP</span>
        </div>
        <span className="text-zinc-500">|</span>
        <div className="flex items-center gap-1 text-purple-400">
          <Trophy className="w-4 h-4" />
          <span>Gagnant: +{challenge.winner_xp} XP</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-400 font-semibold hover:bg-zinc-700 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={!selectedImage || isUploading}
          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Envoi...
            </>
          ) : (
            <>
              <Camera className="w-5 h-5" />
              Soumettre
            </>
          )}
        </button>
      </div>
    </div>
  )
}

/* ==========================================================================
   PHOTO GALLERY (VOTING)
   ========================================================================== */

interface PhotoGalleryProps {
  submissions: ChallengeSubmission[]
  currentUserId: string
  onVote: (submissionId: string, vote: 1 | -1) => Promise<void>
  userVotes?: Record<string, 1 | -1>
  showWinner?: boolean
}

export function PhotoGallery({
  submissions,
  currentUserId,
  onVote,
  userVotes = {},
  showWinner = false,
}: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVoting, setIsVoting] = useState(false)

  const currentSubmission = submissions[currentIndex]

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <Camera className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
        <p className="text-zinc-400">Aucune soumission pour le moment</p>
      </div>
    )
  }

  const handleVote = async (vote: 1 | -1) => {
    if (currentSubmission.user_id === currentUserId) return

    setIsVoting(true)
    await onVote(currentSubmission.id, vote)
    setIsVoting(false)
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? submissions.length - 1 : prev - 1
    )
  }

  const goToNext = () => {
    setCurrentIndex((prev) =>
      prev === submissions.length - 1 ? 0 : prev + 1
    )
  }

  const currentVote = userVotes[currentSubmission.id]
  const isOwnSubmission = currentSubmission.user_id === currentUserId

  return (
    <div className="space-y-4">
      {/* Photo Display */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSubmission.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative rounded-2xl overflow-hidden"
          >
            <img
              src={currentSubmission.image_url || ""}
              alt={`Soumission de ${currentSubmission.pseudo}`}
              className="w-full aspect-square object-cover"
            />

            {/* Winner Badge */}
            {showWinner && currentSubmission.is_winner && (
              <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500 text-black font-bold text-sm">
                <Trophy className="w-4 h-4" />
                Gagnant
              </div>
            )}

            {/* Own Submission Badge */}
            {isOwnSubmission && (
              <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500 text-white font-bold text-sm">
                Ta photo
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {submissions.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* User Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden">
            {currentSubmission.avatar_url ? (
              <img
                src={currentSubmission.avatar_url}
                alt={currentSubmission.pseudo}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold">
                {currentSubmission.pseudo?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="font-medium text-white">{currentSubmission.pseudo}</p>
            {Boolean(currentSubmission.content?.caption) && (
              <p className="text-sm text-zinc-400">
                {String(currentSubmission.content?.caption ?? '')}
              </p>
            )}
          </div>
        </div>

        {/* Vote Count */}
        <div className="flex items-center gap-1 text-lg">
          <ThumbsUp className="w-5 h-5 text-green-400" />
          <span className="font-bold text-white">
            {currentSubmission.vote_count}
          </span>
        </div>
      </div>

      {/* Voting Buttons */}
      {!isOwnSubmission && !showWinner && (
        <div className="flex gap-3">
          <button
            onClick={() => handleVote(-1)}
            disabled={isVoting}
            className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
              currentVote === -1
                ? "bg-red-500 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-red-500/20 hover:text-red-400"
            }`}
          >
            <ThumbsDown className="w-5 h-5" />
            Bof
          </button>
          <button
            onClick={() => handleVote(1)}
            disabled={isVoting}
            className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
              currentVote === 1
                ? "bg-green-500 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-green-500/20 hover:text-green-400"
            }`}
          >
            <ThumbsUp className="w-5 h-5" />
            Top !
          </button>
        </div>
      )}

      {/* Navigation Dots */}
      {submissions.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          {submissions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? "bg-white" : "bg-zinc-600"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   PHOTO LEADERBOARD
   ========================================================================== */

interface PhotoLeaderboardProps {
  submissions: ChallengeSubmission[]
  currentUserId: string
  showTop?: number
}

export function PhotoLeaderboard({
  submissions,
  currentUserId,
  showTop = 10,
}: PhotoLeaderboardProps) {
  const sortedSubmissions = [...submissions]
    .sort((a, b) => b.vote_count - a.vote_count)
    .slice(0, showTop)

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-white flex items-center gap-2">
        <Award className="w-5 h-5 text-yellow-400" />
        Classement
      </h3>

      <div className="space-y-2">
        {sortedSubmissions.map((submission, index) => {
          const isCurrentUser = submission.user_id === currentUserId
          const rank = index + 1

          return (
            <div
              key={submission.id}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                isCurrentUser
                  ? "bg-cyan-500/10 border border-cyan-500/30"
                  : "bg-zinc-800/50"
              }`}
            >
              {/* Rank */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  rank === 1
                    ? "bg-yellow-500 text-black"
                    : rank === 2
                    ? "bg-zinc-400 text-black"
                    : rank === 3
                    ? "bg-amber-700 text-white"
                    : "bg-zinc-700 text-zinc-400"
                }`}
              >
                {rank}
              </div>

              {/* Thumbnail */}
              <div className="w-12 h-12 rounded-lg overflow-hidden">
                <img
                  src={submission.image_url || ""}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium truncate ${
                    isCurrentUser ? "text-cyan-400" : "text-white"
                  }`}
                >
                  {submission.pseudo}
                  {isCurrentUser && " (toi)"}
                </p>
              </div>

              {/* Votes */}
              <div className="flex items-center gap-1 text-green-400">
                <ThumbsUp className="w-4 h-4" />
                <span className="font-bold">{submission.vote_count}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
