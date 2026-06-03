"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { FieldInput } from "@/components/ui/field-input"
import { Niv, NivCoach } from "@/components/brand"
import { ChevronLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from "sonner"
import {
  ageFromDateOfBirth,
  isTeenAge,
  TEEN_AGE_ERROR,
  teenDateOfBirthBounds,
} from "@/lib/constants/age"

/**
 * #305 — the pre-auth interest/learning-style/archetype teasers were removed.
 * They wrote only to localStorage and were never replayed post-auth (audit
 * GAP-07/08 : "worst of both worlds" — effort sans effet). The single,
 * canonical personalization collectors are the post-auth onboarding pages,
 * which have a teen_id and persist to real tables:
 *   - /onboarding/interests  → teen_interests (InterestPicker, 5-10 taxonomy tags)
 *   - /onboarding/learning-style → teens.learning_style/archetype (#303)
 *   - /onboarding/goals      → teen_goals + missions (#304)
 * This step is now a focused registration form (identité + contact parent).
 */

interface TeenSetupStepProps {
  onNext: () => void
  onBack: () => void
}

export function TeenSetupStep({ onNext, onBack }: TeenSetupStepProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    teenFirstName: '',
    teenLastName: '',
    dateOfBirth: '',
    teenEmail: '',
    parentEmail: '',
    parentPhone: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Focus first error on submit
  useEffect(() => {
    const firstErrorField = Object.keys(errors)[0]
    if (firstErrorField) {
      const element = document.getElementById(firstErrorField) as HTMLInputElement
      element?.focus()
    }
  }, [errors])

  const calculateAge = (birthDate: string) => ageFromDateOfBirth(birthDate)
  const dobBounds = teenDateOfBirthBounds()

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
      if (!isTeenAge(age)) {
        newErrors.dateOfBirth = TEEN_AGE_ERROR
      }
    }

    // #291 — l'ado saisit SON email : c'est là que son lien d'accès
    // (magic-link) sera envoyé après validation parentale.
    if (!formData.teenEmail.trim()) {
      newErrors.teenEmail = 'Ton email est requis pour te connecter'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.teenEmail)) {
      newErrors.teenEmail = 'Email invalide'
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

  // #295 — renvoi de l'email parent si le premier envoi a échoué.
  const resendParentEmail = async (registrationId: string) => {
    try {
      const res = await fetch('/api/auth/register-teen/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId }),
      })
      const d = await res.json()
      if (d.success && d.data?.email_sent) {
        toast.success("Email renvoyé à tes parents ✅")
      } else {
        toast.error(d.error || "Échec du renvoi. Réessaie plus tard.")
      }
    } catch {
      toast.error("Échec du renvoi. Réessaie plus tard.")
    }
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
          teenEmail: formData.teenEmail,
          parentEmail: formData.parentEmail,
          parentPhone: formData.parentPhone,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Erreur lors de l'inscription")
      }

      // #295 — refléter l'état réel d'envoi de l'email parent (le serveur
      // renvoie success:true même si l'email n'est pas parti).
      const emailSent = data.data?.email_sent !== false
      const registrationId: string | undefined = data.data?.registrationId
      if (emailSent) {
        toast.success("Demande envoyée !", {
          description: "Tes parents vont recevoir un email pour valider ton inscription"
        })
      } else {
        toast.warning("Demande enregistrée — email non envoyé", {
          description:
            "On n'a pas réussi à envoyer l'email à tes parents. Tu peux réessayer l'envoi.",
          duration: 10000,
          action: registrationId
            ? { label: "Renvoyer", onClick: () => resendParentEmail(registrationId) }
            : undefined,
        })
      }

      // Store registration ref for reference (used to resume the flow).
      localStorage.setItem('teen_onboarding_data', JSON.stringify({
        ...formData,
        registrationId: data.data.registrationId,
        expiresAt: data.data.expiresAt,
      }))

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
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <Niv mood="happy" size={80} float />
        </div>
        <p className="eyebrow tracking-[0.18em] text-mute mb-3">Compte ado</p>
        <h2 className="text-3xl sm:text-4xl font-display font-extrabold mb-3 text-balance text-ink">Crée ton compte <em className="font-semibold italic text-pink">ado</em></h2>
        <p className="text-mute max-w-2xl mx-auto text-balance">
          Tes parents vont recevoir un email pour valider ton inscription
        </p>
      </div>

      {/* Form */}
      <StickerCard className="p-6 sm:p-8 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Teen Info */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-lg text-ink">Tes informations</h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <FieldInput
                id="teenFirstName"
                name="teenFirstName"
                label="Ton prénom *"
                autoComplete="given-name"
                placeholder="Ton prénom…"
                error={errors.teenFirstName}
                value={formData.teenFirstName}
                onChange={(e) => handleInputChange('teenFirstName', e.target.value)}
              />

              <FieldInput
                id="teenLastName"
                name="teenLastName"
                label="Ton nom *"
                autoComplete="family-name"
                placeholder="Ton nom…"
                error={errors.teenLastName}
                value={formData.teenLastName}
                onChange={(e) => handleInputChange('teenLastName', e.target.value)}
              />
            </div>

            <FieldInput
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              label="Ta date de naissance *"
              autoComplete="bday"
              error={errors.dateOfBirth}
              hint={
                formData.dateOfBirth && !errors.dateOfBirth
                  ? `Tu as ${calculateAge(formData.dateOfBirth)} ans`
                  : undefined
              }
              value={formData.dateOfBirth}
              onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
              min={dobBounds.min}
              max={dobBounds.max}
            />

            <FieldInput
              id="teenEmail"
              name="teenEmail"
              type="email"
              label="Ton email *"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="toi@email.com"
              hint="C'est ici que tu recevras ton lien de connexion une fois ton inscription validée."
              error={errors.teenEmail}
              value={formData.teenEmail}
              onChange={(e) => handleInputChange('teenEmail', e.target.value)}
            />
          </div>

          {/* Parent Info */}
          <div className="space-y-4 pt-4 border-t-2 border-ink/10">
            <h3 className="font-display font-bold text-lg text-ink">Coordonnées de tes parents</h3>

            <FieldInput
              id="parentEmail"
              name="parentEmail"
              type="email"
              label="Email d'un parent *"
              inputMode="email"
              autoComplete="off"
              spellCheck={false}
              placeholder="parent@email.com"
              error={errors.parentEmail}
              value={formData.parentEmail}
              onChange={(e) => handleInputChange('parentEmail', e.target.value)}
            />

            <FieldInput
              id="parentPhone"
              name="parentPhone"
              type="tel"
              label="Téléphone d'un parent *"
              inputMode="tel"
              autoComplete="off"
              prefix="🇲🇦 +212"
              placeholder="0612345678 ou +212612345678"
              error={errors.parentPhone}
              value={formData.parentPhone}
              onChange={(e) => handleInputChange('parentPhone', e.target.value)}
            />
          </div>

          {/* #305 — personnalisation (intérêts / style / profil) déplacée vers
              la chaîne post-auth (single source) : plus de double saisie ici. */}

          {/* Coach Niv — rassure sur la validation parentale */}
          <NivCoach
            mood="calm"
            message={
              <>
                Pour ta sécurité, tes parents doivent valider ton inscription. Ils recevront un
                email avec un lien pour créer leur compte parent et approuver ton profil.
              </>
            }
          />
        </form>
      </StickerCard>

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
          variant="pink"
          onClick={handleSubmit}
          disabled={loading}
          aria-busy={loading}
          className="gap-2"
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
