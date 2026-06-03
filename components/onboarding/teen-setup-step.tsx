"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { FieldInput } from "@/components/ui/field-input"
import { SegmentedProgress } from "@/components/ui/progress"
import { Niv, NivCoach } from "@/components/brand"
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import {
  ageFromDateOfBirth,
  isTeenAge,
  TEEN_AGE_ERROR,
  teenDateOfBirthBounds,
} from "@/lib/constants/age"

/**
 * #307 — TeenSetupStep éclaté en MICRO-ÉTAPES plein écran (une étape = un groupe
 * de champs), avec progression visible (SegmentedProgress), auto-focus, et a11y
 * (fieldset/legend par groupe + région aria-live de résumé d'erreurs).
 *
 * #305 — la personnalisation (intérêts / style / archetype) a été retirée d'ici
 * (collectée post-auth). Cette étape reste un formulaire d'inscription :
 * identité + contact parent.
 *
 * Sous-étapes : 0 = identité (+ email ado), 1 = contact parent (soumission).
 */

interface TeenSetupStepProps {
  onNext: () => void
  onBack: () => void
}

type FormData = {
  teenFirstName: string
  teenLastName: string
  dateOfBirth: string
  teenEmail: string
  parentEmail: string
  parentPhone: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^(\+212|0)[67]\d{8}$/

const SUB_STEPS = ["identité", "contact parent"] as const

export function TeenSetupStep({ onNext, onBack }: TeenSetupStepProps) {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState<FormData>({
    teenFirstName: "",
    teenLastName: "",
    dateOfBirth: "",
    teenEmail: "",
    parentEmail: "",
    parentPhone: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const errorSummaryRef = useRef<HTMLDivElement>(null)

  const dobBounds = teenDateOfBirthBounds()
  const calculateAge = (birthDate: string) => ageFromDateOfBirth(birthDate)

  // Focus the error summary region when errors appear (a11y).
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      errorSummaryRef.current?.focus()
    }
  }, [errors])

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  // Validate only the fields of the current sub-step.
  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {}
    if (s === 0) {
      if (!formData.teenFirstName.trim()) e.teenFirstName = "Prénom requis"
      if (!formData.teenLastName.trim()) e.teenLastName = "Nom requis"
      if (!formData.dateOfBirth) {
        e.dateOfBirth = "Date de naissance requise"
      } else if (!isTeenAge(calculateAge(formData.dateOfBirth))) {
        e.dateOfBirth = TEEN_AGE_ERROR
      }
      if (!formData.teenEmail.trim()) e.teenEmail = "Ton email est requis pour te connecter"
      else if (!EMAIL_RE.test(formData.teenEmail)) e.teenEmail = "Email invalide"
    } else if (s === 1) {
      if (!formData.parentEmail.trim()) e.parentEmail = "Email du parent requis"
      else if (!EMAIL_RE.test(formData.parentEmail)) e.parentEmail = "Email invalide"
      if (!formData.parentPhone.trim()) e.parentPhone = "Téléphone du parent requis"
      else if (!PHONE_RE.test(formData.parentPhone.replace(/\s/g, "")))
        e.parentPhone = "Format: 0612345678 ou +212612345678"
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const resendParentEmail = async (registrationId: string) => {
    try {
      const res = await fetch("/api/auth/register-teen/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId }),
      })
      const d = await res.json()
      if (d.success && d.data?.email_sent) toast.success("Email renvoyé à tes parents ✅")
      else toast.error(d.error || "Échec du renvoi. Réessaie plus tard.")
    } catch {
      toast.error("Échec du renvoi. Réessaie plus tard.")
    }
  }

  const submitRegistration = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/auth/register-teen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      if (!data.success) throw new Error(data.error || "Erreur lors de l'inscription")

      const emailSent = data.data?.email_sent !== false
      const registrationId: string | undefined = data.data?.registrationId
      if (emailSent) {
        toast.success("Demande envoyée !", {
          description: "Tes parents vont recevoir un email pour valider ton inscription",
        })
      } else {
        toast.warning("Demande enregistrée — email non envoyé", {
          description: "On n'a pas réussi à envoyer l'email à tes parents. Tu peux réessayer l'envoi.",
          duration: 10000,
          action: registrationId
            ? { label: "Renvoyer", onClick: () => resendParentEmail(registrationId) }
            : undefined,
        })
      }

      localStorage.setItem(
        "teen_onboarding_data",
        JSON.stringify({ ...formData, registrationId: data.data.registrationId, expiresAt: data.data.expiresAt })
      )

      onNext()
    } catch (error: any) {
      console.error("Error creating teen request:", error)
      toast.error(error.message || "Erreur lors de l'envoi de la demande")
    } finally {
      setLoading(false)
    }
  }

  const handleNext = async () => {
    if (!validateStep(step)) {
      toast.error("Veuillez corriger les erreurs")
      return
    }
    if (step < SUB_STEPS.length - 1) {
      setStep((s) => s + 1)
    } else {
      await submitRegistration()
    }
  }

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1)
    else onBack()
  }

  const errorMessages = Object.values(errors)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <Niv mood="happy" size={80} float />
        </div>
        <p className="eyebrow tracking-[0.18em] text-mute mb-3">Compte ado</p>
        <h2 className="mb-3 text-balance font-display text-3xl font-extrabold text-ink sm:text-4xl">
          Crée ton compte <em className="font-semibold italic text-pink">ado</em>
        </h2>
        {/* Sub-step progress (micro-étapes) */}
        <div className="mx-auto max-w-xs">
          <SegmentedProgress steps={SUB_STEPS.length} current={step} size="sm" />
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-mute" aria-live="polite">
            Étape {step + 1} / {SUB_STEPS.length} · {SUB_STEPS[step]}
          </p>
        </div>
      </div>

      <StickerCard className="mx-auto max-w-2xl p-6 sm:p-8">
        {/* a11y — error summary region (aria-live) */}
        {errorMessages.length > 0 && (
          <div
            ref={errorSummaryRef}
            tabIndex={-1}
            role="alert"
            aria-live="assertive"
            className="mb-5 rounded-2xl border-2 border-coral bg-coral/10 p-4 text-sm text-ink focus:outline-none"
          >
            <p className="font-semibold">Quelques infos à corriger :</p>
            <ul className="mt-1 list-inside list-disc">
              {errorMessages.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleNext()
          }}
          className="space-y-6"
          noValidate
        >
          {step === 0 && (
            <fieldset className="space-y-4">
              <legend className="font-display text-lg font-bold text-ink">Tes informations</legend>

              <div className="grid gap-4 sm:grid-cols-2">
                <FieldInput
                  id="teenFirstName"
                  name="teenFirstName"
                  label="Ton prénom *"
                  autoComplete="given-name"
                  placeholder="Ton prénom…"
                  error={errors.teenFirstName}
                  value={formData.teenFirstName}
                  onChange={(e) => handleInputChange("teenFirstName", e.target.value)}
                />
                <FieldInput
                  id="teenLastName"
                  name="teenLastName"
                  label="Ton nom *"
                  autoComplete="family-name"
                  placeholder="Ton nom…"
                  error={errors.teenLastName}
                  value={formData.teenLastName}
                  onChange={(e) => handleInputChange("teenLastName", e.target.value)}
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
                onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
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
                hint="C'est ici que tu recevras ton lien de connexion une fois validé."
                error={errors.teenEmail}
                value={formData.teenEmail}
                onChange={(e) => handleInputChange("teenEmail", e.target.value)}
              />
            </fieldset>
          )}

          {step === 1 && (
            <fieldset className="space-y-4">
              <legend className="font-display text-lg font-bold text-ink">Coordonnées de tes parents</legend>

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
                onChange={(e) => handleInputChange("parentEmail", e.target.value)}
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
                onChange={(e) => handleInputChange("parentPhone", e.target.value)}
              />

              <NivCoach
                mood="calm"
                message="Pour ta sécurité, tes parents doivent valider ton inscription. Ils recevront un email avec un lien pour créer leur compte parent et approuver ton profil."
              />
            </fieldset>
          )}
        </form>
      </StickerCard>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" onClick={handleBack} disabled={loading} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Retour
        </Button>

        <Button variant="pink" onClick={handleNext} disabled={loading} aria-busy={loading} className="gap-2">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span aria-live="polite">Envoi en cours…</span>
            </>
          ) : step < SUB_STEPS.length - 1 ? (
            <>
              Continuer
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </>
          ) : (
            <>
              Envoyer la demande
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
