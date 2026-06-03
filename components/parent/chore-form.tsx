"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FieldInput } from "@/components/ui/field-input"
import { CheckRound } from "@/components/ui/check-round"
import {
  SelectSticker,
  SelectStickerItem,
} from "@/components/ui/select-sticker"
import { CheckCircle2, Loader2, Coins, Sparkles } from "lucide-react"
import { toast } from "sonner"
import {
  FormField,
  FormLabel,
  FormError,
} from "@/components/ui/accessibility/form-field"
import { FormKeyboardAware } from "@/lib/hooks/use-keyboard-aware"
import { scrollToFirstError } from "@/lib/forms/scroll-to-error"

interface Teen {
  teen_id: string
  teen_name: string
}

const RECURRENCE_OPTIONS = [
  { value: "one_shot", label: "Une seule fois" },
  { value: "daily", label: "Quotidienne" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "monthly", label: "Mensuelle" },
  { value: "custom_days", label: "Jours personnalisés" },
]

type ChoreErrors = {
  teenIds?: string
  title?: string
  rewardDh?: string
  rewardXp?: string
  requiredCompletions?: string
}

function validateChore(values: {
  teenIds: string[]
  title: string
  rewardDh: string
  rewardXp: string
  requiredCompletions: string
}): ChoreErrors {
  const errors: ChoreErrors = {}
  if (values.teenIds.length === 0)
    errors.teenIds = "Sélectionne au moins un teen."
  if (!values.title.trim()) errors.title = "Le titre est obligatoire."
  else if (values.title.trim().length < 3)
    errors.title = "Le titre doit faire au moins 3 caractères."
  else if (values.title.length > 120)
    errors.title = "Le titre ne peut dépasser 120 caractères."

  const dh = Number(values.rewardDh)
  if (Number.isNaN(dh) || dh < 0)
    errors.rewardDh = "La récompense DH doit être un nombre positif."

  const xp = Number(values.rewardXp)
  if (Number.isNaN(xp) || xp < 0)
    errors.rewardXp = "La récompense XP doit être un nombre positif."

  const req = Number(values.requiredCompletions)
  if (!Number.isFinite(req) || req < 1 || req > 365)
    errors.requiredCompletions = "Doit être entre 1 et 365."
  return errors
}

export function ChoreForm({ teens }: { teens: Teen[] }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Wave 3 / TICKET-016 — sibling fan-out. Default is "all teens selected".
  const [teenIds, setTeenIds] = useState<string[]>(
    teens.map((t) => t.teen_id)
  )
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [rewardDh, setRewardDh] = useState("0")
  const [rewardXp, setRewardXp] = useState("0")
  const [recurrence, setRecurrence] = useState("one_shot")
  const [requiredCompletions, setRequiredCompletions] = useState("1")
  const [evidenceRequired, setEvidenceRequired] = useState(false)

  const [errors, setErrors] = useState<ChoreErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Auto-focus first field on mount
  useEffect(() => {
    formRef.current
      ?.querySelector<HTMLInputElement>('input[name="title"]')
      ?.focus()
  }, [])

  // Re-validate touched fields when they change
  useEffect(() => {
    if (Object.keys(touched).length === 0) return
    const next = validateChore({
      teenIds,
      title,
      rewardDh,
      rewardXp,
      requiredCompletions,
    })
    setErrors((prev) => {
      const filtered: ChoreErrors = {}
      for (const key of Object.keys(next) as (keyof ChoreErrors)[]) {
        if (touched[key]) filtered[key] = next[key]
      }
      // Preserve server-side errors that are still present
      return { ...prev, ...filtered }
    })
  }, [teenIds, title, rewardDh, rewardXp, requiredCompletions, touched])

  const markTouched = (field: keyof ChoreErrors) =>
    setTouched((prev) => ({ ...prev, [field]: true }))

  const toggleTeen = (id: string, checked: boolean) => {
    setTeenIds((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((t) => t !== id)
    )
    markTouched("teenIds")
  }

  const allSelected = teenIds.length === teens.length && teens.length > 0
  const toggleAll = (checked: boolean) => {
    setTeenIds(checked ? teens.map((t) => t.teen_id) : [])
    markTouched("teenIds")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Mark all as touched and validate
    setTouched({
      teenIds: true,
      title: true,
      rewardDh: true,
      rewardXp: true,
      requiredCompletions: true,
    })
    const v = validateChore({
      teenIds,
      title,
      rewardDh,
      rewardXp,
      requiredCompletions,
    })
    setErrors(v)
    if (Object.values(v).some(Boolean)) {
      // Map error keys to field-name selectors used by FormField
      scrollToFirstError(formRef.current, {
        title: v.title,
        rewardDh: v.rewardDh,
        rewardXp: v.rewardXp,
        requiredCompletions: v.requiredCompletions,
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/parent/chores/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teen_ids: teenIds,
          title: title.trim(),
          description: description.trim() || null,
          reward_dh: Number(rewardDh) || 0,
          reward_xp: Number(rewardXp) || 0,
          recurrence,
          required_completions: Math.max(1, Number(requiredCompletions) || 1),
          evidence_required: evidenceRequired,
        }),
      })
      const result = await res.json()
      if (result.success) {
        setSuccess(true)
        toast.success(
          teenIds.length > 1
            ? `Corvée créée pour ${teenIds.length} teens`
            : "Corvée créée"
        )
        // Brief success animation before navigating
        window.setTimeout(() => {
          router.push("/parent/chores")
          router.refresh()
        }, 650)
      } else {
        toast.error(result.error || "Erreur")
        setLoading(false)
      }
    } catch {
      toast.error("Erreur réseau")
      setLoading(false)
    }
  }

  return (
    <FormKeyboardAware
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-5"
      autoComplete="off"
    >
      <FormField name="teenIds" error={touched.teenIds ? errors.teenIds : undefined}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="eyebrow tracking-[0.16em]">
              Teens concernés
              <span className="text-mute font-normal ml-1 normal-case tracking-normal">
                ({teenIds.length}/{teens.length})
              </span>
            </span>
            {teens.length > 1 && (
              <button
                type="button"
                onClick={() => toggleAll(!allSelected)}
                className="text-xs text-pink hover:underline"
              >
                {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
            )}
          </div>
          <div className="space-y-2 rounded-xl border-2 border-ink bg-white p-3">
            {teens.map((t) => {
              const checked = teenIds.includes(t.teen_id)
              return (
                <label
                  key={t.teen_id}
                  className="flex items-center gap-3 cursor-pointer rounded px-2 py-1.5"
                >
                  <CheckRound
                    checked={checked}
                    onCheckedChange={(v) => toggleTeen(t.teen_id, v === true)}
                  />
                  <span className="text-sm text-ink">{t.teen_name}</span>
                </label>
              )
            })}
          </div>
          <p className="text-xs text-mute">
            La corvée sera assignée indépendamment à chaque teen sélectionné
            (chacun la complète et est récompensé séparément).
          </p>
          <FormError />
        </div>
      </FormField>

      <FormField name="title" required error={touched.title ? errors.title : undefined}>
        <FieldInput
          name="title"
          label="Titre"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => markTouched("title")}
          placeholder="Ex. Faire la vaisselle 5 fois"
          maxLength={120}
          aria-invalid={!!(touched.title && errors.title)}
          required
        />
        <FormError />
      </FormField>

      <FormField name="description">
        <FormLabel className="eyebrow tracking-[0.16em]">Description (optionnelle)</FormLabel>
        <Textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Détails / consignes..."
          className="bg-card border-ink text-ink"
          rows={3}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          name="rewardDh"
          error={touched.rewardDh ? errors.rewardDh : undefined}
        >
          <FieldInput
            type="number"
            name="rewardDh"
            label="Récompense DH"
            min="0"
            step="0.5"
            value={rewardDh}
            onChange={(e) => setRewardDh(e.target.value)}
            onBlur={() => markTouched("rewardDh")}
            hint="1 DH = 100 coins. Versé après vérification."
            aria-invalid={!!(touched.rewardDh && errors.rewardDh)}
          />
          <FormError />
        </FormField>
        <FormField
          name="rewardXp"
          error={touched.rewardXp ? errors.rewardXp : undefined}
        >
          <FieldInput
            type="number"
            name="rewardXp"
            label="Récompense XP"
            min="0"
            step="10"
            value={rewardXp}
            onChange={(e) => setRewardXp(e.target.value)}
            onBlur={() => markTouched("rewardXp")}
            aria-invalid={!!(touched.rewardXp && errors.rewardXp)}
          />
          <FormError />
        </FormField>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow tracking-[0.16em] text-mute">Aperçu récompense</span>
        <span className="px-2 py-1 rounded-md border-2 border-ink text-coral font-mono text-xs flex items-center gap-1">
          <Coins className="h-3 w-3" /> ⊙ {Number(rewardDh) || 0} DH
        </span>
        <span className="px-2 py-1 rounded-md border-2 border-ink text-gold font-mono text-xs flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> {Number(rewardXp) || 0} XP
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SelectSticker
          label="Récurrence"
          value={recurrence}
          onValueChange={setRecurrence}
        >
          {RECURRENCE_OPTIONS.map((o) => (
            <SelectStickerItem key={o.value} value={o.value}>
              {o.label}
            </SelectStickerItem>
          ))}
        </SelectSticker>
        <FormField
          name="requiredCompletions"
          error={
            touched.requiredCompletions ? errors.requiredCompletions : undefined
          }
        >
          <FieldInput
            type="number"
            name="requiredCompletions"
            label="Nombre requis"
            min="1"
            max="365"
            value={requiredCompletions}
            onChange={(e) => setRequiredCompletions(e.target.value)}
            onBlur={() => markTouched("requiredCompletions")}
            hint="Combien de fois pour déclencher la récompense."
            aria-invalid={
              !!(touched.requiredCompletions && errors.requiredCompletions)
            }
          />
          <FormError />
        </FormField>
      </div>

      <label className="flex items-start gap-3 p-3 rounded-xl border-2 border-ink bg-white cursor-pointer">
        <CheckRound
          checked={evidenceRequired}
          onCheckedChange={(v) => setEvidenceRequired(v === true)}
        />
        <span>
          <span className="block text-sm font-medium text-ink">Preuve photo requise</span>
          <span className="block text-xs text-mute mt-1">
            Le teen devra uploader une photo à chaque complétion.
          </span>
        </span>
      </label>

      <Button
        type="submit"
        disabled={loading || success || teenIds.length === 0}
        aria-busy={loading}
        className="w-full h-12"
      >
        {success ? (
          <>
            <CheckCircle2
              className="h-5 w-5 mr-2 animate-in zoom-in-50 duration-300"
              aria-hidden="true"
            />
            Créée !
          </>
        ) : loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
            Création...
          </>
        ) : (
          "Créer la corvée"
        )}
      </Button>
    </FormKeyboardAware>
  )
}
