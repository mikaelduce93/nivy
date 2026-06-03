"use client"

import { useEffect, useRef, useState } from "react"
import { toDataURL } from "qrcode"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { FieldInput } from "@/components/ui/field-input"
import { SegmentedProgress } from "@/components/ui/progress"
import { Niv, NivCoach } from "@/components/brand"
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, Copy } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  ageFromDateOfBirth,
  isTeenAge,
  TEEN_AGE_ERROR,
  teenDateOfBirthBounds,
} from "@/lib/constants/age"
import type { Archetype } from "@/lib/constants/archetype"

/**
 * #307 — micro-étapes plein écran + a11y (fieldset/legend, aria-live).
 * #306 — funnel inversé : on engage l'ado AVANT de demander le contact parent.
 *        Ordre : identité → vibe → contact parent (en dernier) → crew (post-soumission).
 * #309 — étape « vibe de Niv » (écrit teens.archetype via register-teen →
 *        pending → validation) + étape crew (lien/QR d'invitation de potes).
 * #305 — intérêts / learning_style collectés post-auth (pas ici).
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

// Sub-steps. Index 2 (parent) is the last DATA-collection step → submit there;
// steps after it (crew) are post-submit engagement, reached only once the
// pending registration exists.
const SUB_STEPS = ["identité", "vibe de Niv", "contact parent", "ton crew", "starter pack"] as const
const PARENT_STEP = 2

// #308 — récompense visible immédiatement, « pré-débloquée », créditée à la
// validation parentale (la célébration arrive AVANT la friction parentale).
const STARTER_PACK: Array<{ icon: string; label: string }> = [
  { icon: "⚡", label: "+500 XP de bienvenue" },
  { icon: "🎨", label: "Un skin Niv exclusif" },
  { icon: "🧠", label: "4 quiz débloqués" },
  { icon: "🔥", label: "Ton streak démarré" },
]

const ARCHETYPE_CHIPS: Array<{ value: Archetype; label: string; icon: string; hint: string }> = [
  { value: "creator", label: "Créateur", icon: "🎨", hint: "Tu aimes imaginer et fabriquer" },
  { value: "explorer", label: "Explorateur", icon: "🧭", hint: "Tu aimes découvrir et comprendre" },
  { value: "competitor", label: "Compétiteur", icon: "🏆", hint: "Tu aimes les défis et progresser" },
  { value: "social", label: "Social", icon: "🤝", hint: "Tu aimes collaborer et partager" },
]

export function TeenSetupStep({ onNext, onBack }: TeenSetupStepProps) {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [archetype, setArchetype] = useState<Archetype | null>(null)
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

  // Crew invite — generic "join Nivy" share link + QR (teen has no account yet).
  const [inviteUrl, setInviteUrl] = useState("")
  const [inviteQr, setInviteQr] = useState<string | null>(null)
  useEffect(() => {
    const url = `${window.location.origin}/onboarding?role=teen`
    setInviteUrl(url)
    toDataURL(url, { width: 200, margin: 1, color: { dark: "#0e0c1a", light: "#ffffff" } })
      .then(setInviteQr)
      .catch(() => setInviteQr(null))
  }, [])

  const dobBounds = teenDateOfBirthBounds()
  const calculateAge = (birthDate: string) => ageFromDateOfBirth(birthDate)

  useEffect(() => {
    if (Object.keys(errors).length > 0) errorSummaryRef.current?.focus()
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

  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {}
    if (s === 0) {
      if (!formData.teenFirstName.trim()) e.teenFirstName = "Prénom requis"
      if (!formData.teenLastName.trim()) e.teenLastName = "Nom requis"
      if (!formData.dateOfBirth) e.dateOfBirth = "Date de naissance requise"
      else if (!isTeenAge(calculateAge(formData.dateOfBirth))) e.dateOfBirth = TEEN_AGE_ERROR
      if (!formData.teenEmail.trim()) e.teenEmail = "Ton email est requis pour te connecter"
      else if (!EMAIL_RE.test(formData.teenEmail)) e.teenEmail = "Email invalide"
    } else if (s === PARENT_STEP) {
      if (!formData.parentEmail.trim()) e.parentEmail = "Email du parent requis"
      else if (!EMAIL_RE.test(formData.parentEmail)) e.parentEmail = "Email invalide"
      if (!formData.parentPhone.trim()) e.parentPhone = "Téléphone du parent requis"
      else if (!PHONE_RE.test(formData.parentPhone.replace(/\s/g, "")))
        e.parentPhone = "Format: 0612345678 ou +212612345678"
    }
    // step 1 (vibe) is optional → no validation.
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

  // Returns true on success (does not advance — caller decides).
  const submitRegistration = async (): Promise<boolean> => {
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
          archetype, // #309 — vibe → teens.archetype (via pending row)
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
      return true
    } catch (error: any) {
      console.error("Error creating teen request:", error)
      toast.error(error.message || "Erreur lors de l'envoi de la demande")
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleNext = async () => {
    if (step <= PARENT_STEP) {
      if (!validateStep(step)) {
        toast.error("Veuillez corriger les erreurs")
        return
      }
      if (step < PARENT_STEP) {
        setStep((s) => s + 1)
      } else {
        const ok = await submitRegistration()
        if (ok) setStep((s) => s + 1)
      }
    } else if (step < SUB_STEPS.length - 1) {
      setStep((s) => s + 1)
    } else {
      onNext()
    }
  }

  const handleBack = () => {
    // Post-submit steps can't go back to data collection (registration created).
    if (step > PARENT_STEP) return
    if (step > 0) setStep((s) => s - 1)
    else onBack()
  }

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      toast.success("Lien copié")
    } catch {
      toast.error("Copie impossible")
    }
  }

  const errorMessages = Object.values(errors)
  const isPostSubmit = step > PARENT_STEP
  const isLastStep = step === SUB_STEPS.length - 1

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <Niv mood="happy" size={80} float />
        </div>
        <p className="eyebrow tracking-[0.18em] text-mute mb-3">Compte ado</p>
        <h2 className="mb-3 text-balance font-display text-3xl font-extrabold text-ink sm:text-4xl">
          Crée ton compte <em className="font-semibold italic text-pink">ado</em>
        </h2>
        <div className="mx-auto max-w-xs">
          <SegmentedProgress steps={SUB_STEPS.length} current={step} size="sm" />
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-mute" aria-live="polite">
            Étape {step + 1} / {SUB_STEPS.length} · {SUB_STEPS[step]}
          </p>
        </div>
      </div>

      <StickerCard className="mx-auto max-w-2xl p-6 sm:p-8">
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
              <legend className="font-display text-lg font-bold text-ink">La vibe de Niv</legend>
              <p className="text-sm text-mute">
                Choisis le profil qui te ressemble — Niv adaptera son coaching (optionnel).
              </p>
              <div role="radiogroup" aria-label="Ta vibe" className="grid grid-cols-2 gap-2">
                {ARCHETYPE_CHIPS.map((opt) => {
                  const isOn = archetype === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={isOn}
                      onClick={() => setArchetype(isOn ? null : opt.value)}
                      className={cn(
                        "flex items-start gap-2.5 rounded-2xl border-2 border-ink p-3 text-left transition-all duration-150 select-none active:scale-[0.98]",
                        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40",
                        isOn
                          ? "-translate-x-0.5 -translate-y-0.5 bg-ink text-paper shadow-stkr-pink"
                          : "bg-white text-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-sm"
                      )}
                    >
                      <span className="shrink-0 text-2xl" aria-hidden="true">{opt.icon}</span>
                      <span className="flex min-w-0 flex-col">
                        <span className="text-sm font-semibold">{opt.label}</span>
                        <span className={cn("text-xs leading-tight", isOn ? "text-paper/70" : "text-mute")}>
                          {opt.hint}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
          )}

          {step === PARENT_STEP && (
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
                message="Dernière étape avant de t'éclater : tes parents valident ton inscription (email + lien). C'est pour ta sécurité."
              />
            </fieldset>
          )}

          {step === 3 && (
            <div className="space-y-4 text-center">
              <h3 className="font-display text-lg font-bold text-ink">Invite ton crew 🤜🤛</h3>
              <p className="text-sm text-mute">
                Partage Nivy à tes potes — c'est plus fun à plusieurs (optionnel).
              </p>
              {inviteQr ? (
                <div className="mx-auto grid w-fit place-items-center rounded-2xl border-2 border-ink bg-white p-3">
                  <img src={inviteQr} alt="QR d'invitation Nivy" className="size-[180px] rounded-lg" />
                </div>
              ) : null}
              <Button type="button" variant="outline" className="gap-2" onClick={copyInvite}>
                <Copy className="size-4" aria-hidden="true" />
                Copier le lien d'invitation
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5 text-center">
              <div className="flex justify-center">
                <Niv mood="hype" size={88} float />
              </div>
              <div>
                <p className="eyebrow tracking-[0.16em] text-pink">Starter pack</p>
                <h3 className="mt-1 font-display text-2xl font-extrabold text-ink">
                  {formData.teenFirstName ? `Bravo ${formData.teenFirstName} !` : "Bravo !"}
                </h3>
                <p className="mt-1 text-sm text-mute">Voici ce qui t'attend dès l'activation de ton compte :</p>
              </div>
              <ul className="mx-auto grid max-w-sm gap-2 text-left">
                {STARTER_PACK.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-white p-3 shadow-stkr-sm"
                  >
                    <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                    <span className="text-sm font-semibold text-ink">{item.label}</span>
                  </li>
                ))}
              </ul>
              <p className="rounded-2xl border-2 border-ink bg-lime/15 p-3 text-sm font-semibold text-ink">
                🔒 Pré-débloqué — activé dès que ton parent valide ton inscription.
              </p>
            </div>
          )}
        </form>
      </StickerCard>

      <div className="flex items-center justify-between gap-4">
        {isPostSubmit ? (
          <span />
        ) : (
          <Button variant="outline" onClick={handleBack} disabled={loading} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Retour
          </Button>
        )}

        <Button variant="pink" onClick={handleNext} disabled={loading} aria-busy={loading} className="gap-2">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span aria-live="polite">Envoi en cours…</span>
            </>
          ) : step < PARENT_STEP ? (
            <>
              Continuer
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </>
          ) : step === PARENT_STEP ? (
            <>
              Envoyer la demande
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            </>
          ) : isLastStep ? (
            <>
              Terminer
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </>
          ) : (
            <>
              Continuer
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
