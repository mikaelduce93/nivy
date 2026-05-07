"use client"

import { useState, useEffect } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowRight, ArrowLeft, User, Mail, Phone, Calendar,
  ChevronLeft, ChevronRight, Loader2, CheckCircle2, Heart, Info,
  Sparkles
} from 'lucide-react'
import { toast } from "sonner"
import { cn } from "@/lib/utils"

/**
 * TICKET-031 — Onboarding interest capture preview.
 *
 * The actual chip selector lives at /onboarding/interests (post-auth,
 * post-parent-approval) because we need a teen_id to write rows to
 * teen_interests. At this pre-auth registration step we show a
 * non-persisting chip teaser so teens see the 50-tag taxonomy before
 * they leave the form, and pre-pick can be persisted to localStorage
 * to be hydrated into <InterestPicker /> after first sign-in.
 *
 * 16 representative tags drawn from interest_taxonomy (categories
 * weighted toward 13-17 appeal — drops `lifestyle_finance` etc per
 * docs/vision/personalization-engine.md §10 Step A).
 */
const INTEREST_PREVIEW_CHIPS: Array<{ tag: string; label: string; icon: string }> = [
  { tag: 'sport_football', label: 'Football', icon: '⚽' },
  { tag: 'sport_basketball', label: 'Basket', icon: '🏀' },
  { tag: 'tech_gaming', label: 'Jeux vidéo', icon: '🎮' },
  { tag: 'tech_coding', label: 'Code', icon: '💻' },
  { tag: 'tech_ai', label: 'IA', icon: '🧠' },
  { tag: 'art_drawing', label: 'Dessin', icon: '✏️' },
  { tag: 'art_video', label: 'Vidéo', icon: '🎬' },
  { tag: 'art_photography', label: 'Photo', icon: '📷' },
  { tag: 'music_rap', label: 'Rap', icon: '🎤' },
  { tag: 'music_pop', label: 'Pop', icon: '🎵' },
  { tag: 'food_cooking', label: 'Cuisine', icon: '👨‍🍳' },
  { tag: 'lifestyle_fashion', label: 'Mode', icon: '👗' },
  { tag: 'science_astronomy', label: 'Astronomie', icon: '🔭' },
  { tag: 'reading_fiction', label: 'Romans', icon: '📖' },
  { tag: 'nature_animals', label: 'Animaux', icon: '🐶' },
  { tag: 'social_volunteering', label: 'Bénévolat', icon: '🤝' },
]

interface TeenSetupStepProps {
  onNext: () => void
  onBack: () => void
}

export function TeenSetupStep({ onNext, onBack }: TeenSetupStepProps) {
  const [loading, setLoading] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const [formData, setFormData] = useState({
    teenFirstName: '',
    teenLastName: '',
    dateOfBirth: '',
    parentEmail: '',
    parentPhone: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // TICKET-031 — chip teaser. Persisted to localStorage so the post-auth
  // /onboarding/interests page (which calls /api/onboarding/interests) can
  // pre-fill the selection from the teen's pre-registration choices.
  const [previewSelected, setPreviewSelected] = useState<Set<string>>(new Set())

  const togglePreview = (tag: string) => {
    setPreviewSelected((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) {
        next.delete(tag)
      } else {
        if (next.size >= 10) {
          toast.warning('Max 10 — tu pourras en ajouter d\'autres après')
          return prev
        }
        next.add(tag)
      }
      return next
    })
  }

  // Focus first error on submit
  useEffect(() => {
    const firstErrorField = Object.keys(errors)[0]
    if (firstErrorField) {
      const element = document.getElementById(firstErrorField) as HTMLInputElement
      element?.focus()
    }
  }, [errors])

  const fadeUp = (delay: number) => prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay } }
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay } }

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.teenFirstName.trim()) {
      newErrors.teenFirstName = 'Prénom requis'
    }

    if (!formData.teenLastName.trim()) {
      newErrors.teenLastName = 'Nom requis'
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date de naissance requise'
    } else {
      const age = calculateAge(formData.dateOfBirth)
      if (age < 11 || age > 17) {
        newErrors.dateOfBirth = 'Tu dois avoir entre 11 et 17 ans'
      }
    }

    if (!formData.parentEmail.trim()) {
      newErrors.parentEmail = 'Email du parent requis'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parentEmail)) {
      newErrors.parentEmail = 'Email invalide'
    }

    if (!formData.parentPhone.trim()) {
      newErrors.parentPhone = 'Téléphone du parent requis'
    } else if (!/^(\+212|0)[67]\d{8}$/.test(formData.parentPhone.replace(/\s/g, ''))) {
      newErrors.parentPhone = 'Format: 0612345678 ou +212612345678'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error("Veuillez corriger les erreurs")
      return
    }

    setLoading(true)

    try {
      // Call the API to create pending teen registration
      const response = await fetch('/api/auth/register-teen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teenFirstName: formData.teenFirstName,
          teenLastName: formData.teenLastName,
          dateOfBirth: formData.dateOfBirth,
          parentEmail: formData.parentEmail,
          parentPhone: formData.parentPhone,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Erreur lors de l'inscription")
      }

      toast.success("Demande envoyée !", {
        description: "Tes parents vont recevoir un email pour valider ton inscription"
      })

      // Store data in localStorage for reference
      localStorage.setItem('teen_onboarding_data', JSON.stringify({
        ...formData,
        registrationId: data.data.registrationId,
        expiresAt: data.data.expiresAt,
      }))

      // TICKET-031 — pre-seed interests so /onboarding/interests can hydrate
      // the chip selector with the teen's pre-auth picks once they sign in.
      if (previewSelected.size > 0) {
        try {
          localStorage.setItem(
            'teen_onboarding_interests_preview',
            JSON.stringify(Array.from(previewSelected))
          )
        } catch {
          // localStorage may be disabled — non-fatal, the user simply re-picks.
        }
      }

      onNext()
    } catch (error: any) {
      console.error('Error creating teen request:', error)
      toast.error(error.message || "Erreur lors de l'envoi de la demande")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        {...(prefersReducedMotion
          ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
          : { initial: { opacity: 0, y: -20 }, animate: { opacity: 1, y: 0 } }
        )}
        className="text-center"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4" aria-hidden="true">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-black mb-3 text-balance">Crée ton compte Ado</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
          Tes parents vont recevoir un email pour valider ton inscription
        </p>
      </motion.div>

      {/* Form */}
      <motion.div {...fadeUp(0.2)}>
        <Card className="p-6 sm:p-8 max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Teen Info */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Tes informations</h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="teenFirstName">Ton prénom *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="teenFirstName"
                      name="teenFirstName"
                      autoComplete="given-name"
                      placeholder="Ton prénom…"
                      aria-invalid={!!errors.teenFirstName}
                      aria-describedby={errors.teenFirstName ? "teenFirstName-error" : undefined}
                      className={`pl-10 ${errors.teenFirstName ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      value={formData.teenFirstName}
                      onChange={(e) => handleInputChange('teenFirstName', e.target.value)}
                    />
                  </div>
                  {errors.teenFirstName && (
                    <p id="teenFirstName-error" className="text-xs text-red-500" role="alert">{errors.teenFirstName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teenLastName">Ton nom *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="teenLastName"
                      name="teenLastName"
                      autoComplete="family-name"
                      placeholder="Ton nom…"
                      aria-invalid={!!errors.teenLastName}
                      aria-describedby={errors.teenLastName ? "teenLastName-error" : undefined}
                      className={`pl-10 ${errors.teenLastName ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      value={formData.teenLastName}
                      onChange={(e) => handleInputChange('teenLastName', e.target.value)}
                    />
                  </div>
                  {errors.teenLastName && (
                    <p id="teenLastName-error" className="text-xs text-red-500" role="alert">{errors.teenLastName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Ta date de naissance *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    autoComplete="bday"
                    aria-invalid={!!errors.dateOfBirth}
                    aria-describedby={errors.dateOfBirth ? "dateOfBirth-error" : "dateOfBirth-hint"}
                    className={`pl-10 ${errors.dateOfBirth ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                {errors.dateOfBirth && (
                  <p id="dateOfBirth-error" className="text-xs text-red-500" role="alert">{errors.dateOfBirth}</p>
                )}
                {formData.dateOfBirth && !errors.dateOfBirth && (
                  <p id="dateOfBirth-hint" className="text-xs text-green-600" aria-live="polite">
                    Tu as {calculateAge(formData.dateOfBirth)}&nbsp;ans
                  </p>
                )}
              </div>
            </div>

            {/* Parent Info */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-bold text-lg">Coordonnées de tes parents</h3>

              <div className="space-y-2">
                <Label htmlFor="parentEmail">Email d'un parent *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="parentEmail"
                    name="parentEmail"
                    type="email"
                    inputMode="email"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="parent@email.com"
                    aria-invalid={!!errors.parentEmail}
                    aria-describedby={errors.parentEmail ? "parentEmail-error" : undefined}
                    className={`pl-10 ${errors.parentEmail ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    value={formData.parentEmail}
                    onChange={(e) => handleInputChange('parentEmail', e.target.value)}
                  />
                </div>
                {errors.parentEmail && (
                  <p id="parentEmail-error" className="text-xs text-red-500" role="alert">{errors.parentEmail}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentPhone">Téléphone d'un parent *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="parentPhone"
                    name="parentPhone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    placeholder="0612345678"
                    aria-invalid={!!errors.parentPhone}
                    aria-describedby={errors.parentPhone ? "parentPhone-error" : undefined}
                    className={`pl-10 ${errors.parentPhone ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    value={formData.parentPhone}
                    onChange={(e) => handleInputChange('parentPhone', e.target.value)}
                  />
                </div>
                {errors.parentPhone && (
                  <p id="parentPhone-error" className="text-xs text-red-500" role="alert">{errors.parentPhone}</p>
                )}
              </div>
            </div>

            {/* TICKET-031 — Interest chip teaser (Step A from
                personalization-engine.md §10). Pre-auth, non-persisting:
                writes to localStorage so /onboarding/interests can hydrate
                the full 50-tag selector after parent approval + sign-in. */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 ring-1 ring-cyan-500/30">
                  <Sparkles className="w-4 h-4 text-cyan-500" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Qu'est-ce qui te fait vibrer&nbsp;?</h3>
                  <p className="text-xs text-muted-foreground">
                    Pré-sélectionne quelques centres d'intérêt — tu pourras affiner après.
                  </p>
                </div>
              </div>

              <div
                role="group"
                aria-label="Aperçu des centres d'intérêt"
                className="flex flex-wrap gap-2"
              >
                {INTEREST_PREVIEW_CHIPS.map((chip) => {
                  const isOn = previewSelected.has(chip.tag)
                  return (
                    <button
                      key={chip.tag}
                      type="button"
                      onClick={() => togglePreview(chip.tag)}
                      aria-pressed={isOn}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-sm font-medium",
                        "border transition-all duration-150 active:scale-95 select-none",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        isOn
                          ? "bg-gradient-to-r from-cyan-500 to-emerald-500 text-white border-transparent shadow-sm shadow-cyan-500/30"
                          : "bg-background hover:bg-muted/60 border-border/80 text-foreground"
                      )}
                    >
                      <span aria-hidden="true">{chip.icon}</span>
                      <span>{chip.label}</span>
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span
                  className={cn(
                    "tabular-nums font-semibold",
                    previewSelected.size > 0 ? "text-cyan-600 dark:text-cyan-400" : "text-muted-foreground"
                  )}
                  aria-live="polite"
                >
                  {previewSelected.size} sélectionné{previewSelected.size > 1 ? "s" : ""} / 10 max
                </span>
                <span className="text-muted-foreground">
                  Plus de 50 catégories à découvrir ensuite
                </span>
              </div>
            </div>

            {/* Info Note */}
            <div className="flex items-start gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
              <Info className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-purple-600 dark:text-purple-400">
                <p className="font-medium mb-1">Pourquoi ces informations&nbsp;?</p>
                <p className="text-xs opacity-90">
                  Pour ta sécurité, tes parents doivent valider ton inscription. Ils recevront un email
                  avec un lien pour créer leur compte parent et approuver ton profil.
                </p>
              </div>
            </div>
          </form>
        </Card>
      </motion.div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={loading}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={loading}
          aria-busy={loading}
          className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span aria-live="polite">Envoi en cours…</span>
            </>
          ) : (
            <>
              Envoyer la demande
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
