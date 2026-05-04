/**
 * TEENS PARTY MOROCCO - Prediction Card Component
 * ================================================
 *
 * Cartes de prédiction pour les événements.
 */

"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  TrendingUp,
  Clock,
  Users,
  Check,
  Zap,
  Trophy,
  AlertCircle,
  ChevronRight,
  Lock,
  Loader2,
  Star,
} from "lucide-react"
import {
  type PredictionQuestionWithUserPrediction,
} from "../../features/mini-games"

/* ==========================================================================
   PREDICTION CARD
   ========================================================================== */

interface PredictionCardProps {
  prediction: PredictionQuestionWithUserPrediction
  onPredict?: (optionIndex: number, confidence: number) => Promise<void>
  disabled?: boolean
}

export function PredictionCard({
  prediction,
  onPredict,
  disabled = false,
}: PredictionCardProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(
    prediction.user_prediction?.selected_option_index ?? null
  )
  const [confidence, setConfidence] = useState(
    prediction.user_prediction?.confidence ?? 50
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfidenceSlider, setShowConfidenceSlider] = useState(false)

  const hasPredicted = prediction.user_prediction !== undefined
  const isResolved = prediction.status === "resolved"
  const isClosed = prediction.status === "closed"
  const isCorrect = prediction.user_prediction?.is_correct

  const handleSelectOption = (index: number) => {
    if (hasPredicted || disabled || isResolved || isClosed) return
    setSelectedOption(index)
    setShowConfidenceSlider(true)
  }

  const handleSubmit = async () => {
    if (selectedOption === null || !onPredict) return

    setIsSubmitting(true)
    await onPredict(selectedOption, confidence)
    setIsSubmitting(false)
    setShowConfidenceSlider(false)
  }

  return (
    <div
      className={`p-4 rounded-2xl border ${
        isResolved
          ? isCorrect
            ? "bg-green-500/10 border-green-500/30"
            : "bg-red-500/10 border-red-500/30"
          : hasPredicted
          ? "bg-cyan-500/10 border-cyan-500/30"
          : "bg-zinc-900 border-zinc-800"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
            {prediction.category}
          </span>
        </div>

        {/* Status */}
        {isResolved ? (
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              isCorrect
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {isCorrect ? "✓ Correct" : "✗ Incorrect"}
          </span>
        ) : isClosed ? (
          <span className="text-xs px-2 py-1 rounded-full bg-zinc-700 text-zinc-400">
            <Lock className="w-3 h-3 inline mr-1" />
            Fermé
          </span>
        ) : hasPredicted ? (
          <span className="text-xs px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400">
            <Check className="w-3 h-3 inline mr-1" />
            Prédit
          </span>
        ) : (
          <span className="text-xs text-zinc-400">
            <Users className="w-3 h-3 inline mr-1" />
            {prediction.total_predictions} prédictions
          </span>
        )}
      </div>

      {/* Question */}
      <h3 className="font-bold text-white mb-4">{prediction.question}</h3>

      {/* Options */}
      <div className="space-y-2 mb-4">
        {prediction.options.map((option, index) => {
          const isSelected = selectedOption === index
          const isUserPrediction =
            prediction.user_prediction?.selected_option_index === index
          const isCorrectAnswer =
            isResolved && prediction.correct_option_index === index

          return (
            <button
              key={index}
              onClick={() => handleSelectOption(index)}
              disabled={hasPredicted || disabled || isResolved || isClosed}
              className={`w-full p-3 rounded-xl text-left transition-all ${
                isCorrectAnswer
                  ? "bg-green-500/20 border border-green-500 text-green-400"
                  : isUserPrediction && isResolved && !isCorrect
                  ? "bg-red-500/20 border border-red-500 text-red-400"
                  : isUserPrediction || isSelected
                  ? "bg-cyan-500/20 border border-cyan-500 text-cyan-400"
                  : "bg-zinc-800/50 border border-zinc-700 text-zinc-300 hover:border-zinc-600"
              } ${
                hasPredicted || disabled || isResolved || isClosed
                  ? ""
                  : "cursor-pointer"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                    isCorrectAnswer
                      ? "bg-green-500 text-white"
                      : isUserPrediction || isSelected
                      ? "bg-cyan-500 text-white"
                      : "bg-zinc-700 text-zinc-400"
                  }`}
                >
                  {String.fromCharCode(65 + index)}
                </div>
                <span className="flex-1">{option}</span>
                {isUserPrediction && !isResolved && (
                  <Check className="w-4 h-4 text-cyan-400" />
                )}
                {isCorrectAnswer && <Trophy className="w-4 h-4 text-green-400" />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Confidence Slider */}
      <AnimatePresence>
        {showConfidenceSlider && !hasPredicted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 mb-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Ta confiance</span>
              <span className="text-sm font-bold text-cyan-400">
                {confidence}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="10"
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full h-2 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
            />
            <p className="text-xs text-zinc-500">
              Plus tu es confiant, plus tu gagnes de points si tu as raison !
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Points Info */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-zinc-400">
            Jusqu'à{" "}
            <span className="text-yellow-400 font-bold">
              {prediction.points_for_correct + prediction.bonus_points}
            </span>{" "}
            pts
          </span>
        </div>

        {!hasPredicted && selectedOption !== null && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 text-white font-semibold text-sm flex items-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Prédire
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>

      {/* User Prediction Result */}
      {isResolved && prediction.user_prediction && (
        <div
          className={`mt-4 pt-4 border-t ${
            isCorrect ? "border-green-500/30" : "border-red-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={isCorrect ? "text-green-400" : "text-red-400"}>
              {isCorrect ? "Tu avais raison !" : "Pas cette fois..."}
            </span>
            {prediction.user_prediction.points_earned > 0 && (
              <div className="flex items-center gap-1 text-yellow-400 font-bold">
                <Zap className="w-4 h-4" />
                +{prediction.user_prediction.points_earned} pts
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bonus Slot Info */}
      {!hasPredicted && !isResolved && !isClosed && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Star className="w-3 h-3 text-yellow-400" />
            <span>
              Les {prediction.max_bonus_slots} premiers à prédire gagnent{" "}
              <span className="text-yellow-400">+{prediction.bonus_points} pts</span>{" "}
              bonus
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   COMPACT PREDICTION CARD
   ========================================================================== */

interface CompactPredictionCardProps {
  prediction: PredictionQuestionWithUserPrediction
  onClick?: () => void
}

export function CompactPredictionCard({
  prediction,
  onClick,
}: CompactPredictionCardProps) {
  const hasPredicted = prediction.user_prediction !== undefined
  const isResolved = prediction.status === "resolved"

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
        hasPredicted
          ? "bg-cyan-500/10 border border-cyan-500/30"
          : "bg-zinc-800/50 hover:bg-zinc-800"
      }`}
    >
      {/* Icon */}
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          hasPredicted ? "bg-cyan-500/20" : "bg-green-500/20"
        }`}
      >
        <TrendingUp
          className={`w-5 h-5 ${hasPredicted ? "text-cyan-400" : "text-green-400"}`}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{prediction.question}</p>
        <p className="text-xs text-zinc-500">
          {prediction.total_predictions} prédictions
        </p>
      </div>

      {/* Status */}
      {hasPredicted ? (
        <Check className="w-5 h-5 text-cyan-400" />
      ) : (
        <div className="flex items-center gap-1 text-yellow-400 text-xs">
          <Zap className="w-3 h-3" />
          +{prediction.points_for_correct}
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   PREDICTIONS LIST
   ========================================================================== */

interface PredictionsListProps {
  predictions: PredictionQuestionWithUserPrediction[]
  onPredict?: (
    questionId: string,
    optionIndex: number,
    confidence: number
  ) => Promise<void>
}

export function PredictionsList({
  predictions,
  onPredict,
}: PredictionsListProps) {
  const handlePredict = async (
    questionId: string,
    optionIndex: number,
    confidence: number
  ) => {
    if (onPredict) {
      await onPredict(questionId, optionIndex, confidence)
    }
  }

  if (predictions.length === 0) {
    return (
      <div className="text-center py-8">
        <TrendingUp className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
        <p className="text-zinc-400">Aucune prédiction disponible</p>
        <p className="text-sm text-zinc-500">
          Reviens avant le prochain événement !
        </p>
      </div>
    )
  }

  // Group by status
  const open = predictions.filter((p) => p.status === "open")
  const resolved = predictions.filter((p) => p.status === "resolved")

  return (
    <div className="space-y-6">
      {/* Open Predictions */}
      {open.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-400" />
            En attente de résultat
          </h3>
          {open.map((prediction) => (
            <PredictionCard
              key={prediction.id}
              prediction={prediction}
              onPredict={(optionIndex, confidence) =>
                handlePredict(prediction.id, optionIndex, confidence)
              }
            />
          ))}
        </div>
      )}

      {/* Resolved Predictions */}
      {resolved.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Résultats
          </h3>
          {resolved.map((prediction) => (
            <PredictionCard
              key={prediction.id}
              prediction={prediction}
              disabled
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   USER PREDICTION STATS
   ========================================================================== */

interface PredictionStatsProps {
  totalPredictions: number
  correctPredictions: number
  totalPoints: number
}

export function PredictionStats({
  totalPredictions,
  correctPredictions,
  totalPoints,
}: PredictionStatsProps) {
  const accuracy =
    totalPredictions > 0
      ? Math.round((correctPredictions / totalPredictions) * 100)
      : 0

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30">
      <h3 className="font-bold text-white mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-green-400" />
        Tes stats de prédiction
      </h3>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{totalPredictions}</p>
          <p className="text-xs text-zinc-400">Prédictions</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-400">{accuracy}%</p>
          <p className="text-xs text-zinc-400">Précision</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-400">{totalPoints}</p>
          <p className="text-xs text-zinc-400">Points</p>
        </div>
      </div>
    </div>
  )
}
