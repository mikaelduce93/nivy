/**
 * TEENS PARTY MOROCCO - Create Crew Modal
 * ========================================
 *
 * Modal pour créer un nouveau crew.
 */

"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Users,
  Palette,
  Lock,
  Unlock,
  Check,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react"
import {
  type CreateCrewInput,
  validateCrewName,
} from "../../features/crews"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface CreateCrewModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateCrew: (input: CreateCrewInput) => Promise<{ success: boolean; error: string | null }>
}

/* ==========================================================================
   COLOR OPTIONS
   ========================================================================== */

const COLOR_OPTIONS = [
  { value: "#06b6d4", label: "Cyan" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Rose" },
  { value: "#f97316", label: "Orange" },
  { value: "#22c55e", label: "Vert" },
  { value: "#eab308", label: "Jaune" },
  { value: "#ef4444", label: "Rouge" },
  { value: "#3b82f6", label: "Bleu" },
]

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function CreateCrewModal({
  isOpen,
  onClose,
  onCreateCrew,
}: CreateCrewModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [motto, setMotto] = useState("")
  const [color, setColor] = useState("#06b6d4")
  const [isPublic, setIsPublic] = useState(true)
  const [requiresApproval, setRequiresApproval] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nameValidation = validateCrewName(name)

  const handleSubmit = async () => {
    if (!nameValidation.valid) {
      setError(nameValidation.error || "Nom invalide")
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await onCreateCrew({
      name,
      description: description || undefined,
      motto: motto || undefined,
      color,
      is_public: isPublic,
      requires_approval: requiresApproval,
    })

    setIsSubmitting(false)

    if (result.success) {
      onClose()
    } else {
      setError(result.error || "Erreur lors de la création")
    }
  }

  const handleClose = () => {
    setName("")
    setDescription("")
    setMotto("")
    setColor("#06b6d4")
    setIsPublic(true)
    setRequiresApproval(true)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-md bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="relative p-4 border-b border-zinc-800"
            style={{
              background: `linear-gradient(135deg, ${color}15, transparent)`,
            }}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${color}30` }}
              >
                <Users className="w-6 h-6" style={{ color }} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Créer un Crew</h2>
                <p className="text-sm text-zinc-400">
                  Rassemble tes amis !
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Name */}
            <div>
              <label className="block text-sm text-zinc-300 mb-1">
                Nom du crew *
              </label>
              <input
                type="text"
                placeholder="Ex: Les Invincibles"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                className={`w-full px-4 py-2 bg-zinc-800 border rounded-lg text-white placeholder:text-zinc-500 focus:outline-none ${
                  name && !nameValidation.valid
                    ? "border-red-500"
                    : "border-zinc-700 focus:border-cyan-500"
                }`}
              />
              {name && !nameValidation.valid && (
                <p className="text-xs text-red-400 mt-1">
                  {nameValidation.error}
                </p>
              )}
              <p className="text-xs text-zinc-500 mt-1">{name.length}/50</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-zinc-300 mb-1">
                Description
              </label>
              <textarea
                placeholder="Décris ton crew..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500 resize-none"
              />
              <p className="text-xs text-zinc-500 mt-1">{description.length}/500</p>
            </div>

            {/* Motto */}
            <div>
              <label className="block text-sm text-zinc-300 mb-1">
                Devise
              </label>
              <input
                type="text"
                placeholder="Ex: Ensemble, on est plus forts !"
                value={motto}
                onChange={(e) => setMotto(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm text-zinc-300 mb-2">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Couleur
                </div>
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setColor(option.value)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-transform ${
                      color === option.value
                        ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: option.value }}
                    title={option.label}
                  >
                    {color === option.value && (
                      <Check className="w-5 h-5 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Visibility */}
            <div className="space-y-3">
              <label className="block text-sm text-zinc-300">Paramètres</label>

              {/* Public */}
              <button
                onClick={() => setIsPublic(!isPublic)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${
                  isPublic
                    ? "border-cyan-500/50 bg-cyan-500/10"
                    : "border-zinc-700 bg-zinc-800/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {isPublic ? (
                    <Unlock className="w-5 h-5 text-cyan-400" />
                  ) : (
                    <Lock className="w-5 h-5 text-zinc-400" />
                  )}
                  <div className="text-left">
                    <p className="font-medium text-white">
                      {isPublic ? "Crew public" : "Crew privé"}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {isPublic
                        ? "Visible dans la recherche"
                        : "Visible uniquement sur invitation"}
                    </p>
                  </div>
                </div>
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors ${
                    isPublic ? "bg-cyan-500" : "bg-zinc-600"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      isPublic ? "left-5" : "left-1"
                    }`}
                  />
                </div>
              </button>

              {/* Requires Approval */}
              {isPublic && (
                <button
                  onClick={() => setRequiresApproval(!requiresApproval)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${
                    requiresApproval
                      ? "border-purple-500/50 bg-purple-500/10"
                      : "border-zinc-700 bg-zinc-800/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Sparkles
                      className={`w-5 h-5 ${
                        requiresApproval ? "text-purple-400" : "text-zinc-400"
                      }`}
                    />
                    <div className="text-left">
                      <p className="font-medium text-white">
                        {requiresApproval ? "Approbation requise" : "Accès libre"}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {requiresApproval
                          ? "Les demandes doivent être approuvées"
                          : "N'importe qui peut rejoindre"}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-10 h-6 rounded-full relative transition-colors ${
                      requiresApproval ? "bg-purple-500" : "bg-zinc-600"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        requiresApproval ? "left-5" : "left-1"
                      }`}
                    />
                  </div>
                </button>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
            <button
              onClick={handleSubmit}
              disabled={!nameValidation.valid || isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <Users className="w-5 h-5" />
                  Créer mon crew
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ==========================================================================
   EDIT CREW MODAL
   ========================================================================== */

interface EditCrewModalProps {
  isOpen: boolean
  onClose: () => void
  crew: {
    id: string
    name: string
    description: string | null
    motto: string | null
    color: string
    is_public: boolean
    requires_approval: boolean
    min_level_required: number
  }
  onUpdateCrew: (
    crewId: string,
    input: Partial<CreateCrewInput & { min_level_required: number }>
  ) => Promise<{ success: boolean; error: string | null }>
}

export function EditCrewModal({
  isOpen,
  onClose,
  crew,
  onUpdateCrew,
}: EditCrewModalProps) {
  const [name, setName] = useState(crew.name)
  const [description, setDescription] = useState(crew.description || "")
  const [motto, setMotto] = useState(crew.motto || "")
  const [color, setColor] = useState(crew.color)
  const [isPublic, setIsPublic] = useState(crew.is_public)
  const [requiresApproval, setRequiresApproval] = useState(crew.requires_approval)
  const [minLevel, setMinLevel] = useState(crew.min_level_required)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nameValidation = validateCrewName(name)

  const handleSubmit = async () => {
    if (!nameValidation.valid) {
      setError(nameValidation.error || "Nom invalide")
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await onUpdateCrew(crew.id, {
      name,
      description: description || undefined,
      motto: motto || undefined,
      color,
      is_public: isPublic,
      requires_approval: requiresApproval,
      min_level_required: minLevel,
    })

    setIsSubmitting(false)

    if (result.success) {
      onClose()
    } else {
      setError(result.error || "Erreur lors de la mise à jour")
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-md bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-zinc-800">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-white">Modifier le crew</h2>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Name */}
            <div>
              <label className="block text-sm text-zinc-300 mb-1">Nom</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-zinc-300 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            {/* Motto */}
            <div>
              <label className="block text-sm text-zinc-300 mb-1">Devise</label>
              <input
                type="text"
                value={motto}
                onChange={(e) => setMotto(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm text-zinc-300 mb-2">Couleur</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setColor(option.value)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      color === option.value ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900" : ""
                    }`}
                    style={{ backgroundColor: option.value }}
                  >
                    {color === option.value && <Check className="w-5 h-5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Min Level */}
            <div>
              <label className="block text-sm text-zinc-300 mb-1">
                Niveau minimum requis
              </label>
              <input
                type="number"
                value={minLevel}
                onChange={(e) => setMinLevel(parseInt(e.target.value) || 1)}
                min={1}
                max={100}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Settings */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-700 border-zinc-600 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-sm text-zinc-300">Public</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresApproval}
                  onChange={(e) => setRequiresApproval(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-700 border-zinc-600 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-sm text-zinc-300">Approbation requise</span>
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-800">
            <button
              onClick={handleSubmit}
              disabled={!nameValidation.valid || isSubmitting}
              className="w-full py-3 rounded-xl bg-cyan-500 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                "Enregistrer"
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
