"use client"

/**
 * Wave 2B — physical-challenge action affordances.
 *
 * Wires the existing `/api/teen/sport/challenges` POST contract
 * (action ∈ start | update | complete) and reuses the canonical
 * <EvidenceUpload> pipeline (sign-upload → uploadToSignedUrl → record).
 *
 * Per canon §9 FORBIDDEN, marking complete records `validated=false,
 * xp_earned=0` — XP is granted only by an admin moderator via
 * `/api/admin/sport-challenges/:id/validate`.
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check, Loader2, Play, Plus } from "lucide-react"
import { toast } from "sonner"
import { useAnnounce } from "@/components/a11y/announce-region"
import { EvidenceUpload } from "@/components/teen/evidence-upload"

interface Props {
  teenId: string
  challengeId: string
  progressId: string | null
  isStarted: boolean
  isCompleted: boolean
  pendingValidation: boolean
  currentValue: number
  objectiveValue: number
}

export function PhysicalChallengeActions({
  teenId,
  challengeId,
  progressId,
  isStarted,
  isCompleted,
  pendingValidation,
  currentValue,
  objectiveValue,
}: Props) {
  const router = useRouter()
  const announce = useAnnounce()
  const [pending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)

  async function callSport(body: Record<string, unknown>) {
    const res = await fetch("/api/teen/sport/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teenId, challengeId, ...body }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) {
      throw new Error(data?.error ?? `HTTP ${res.status}`)
    }
    return data
  }

  function handleStart() {
    startTransition(async () => {
      try {
        await callSport({ action: "start" })
        toast.success("Défi démarré")
        announce("Défi démarré")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur")
      }
    })
  }

  function handleUpdate() {
    const next = Math.min(objectiveValue, (currentValue || 0) + 1)
    startTransition(async () => {
      try {
        await callSport({ action: "update", value: next })
        toast.success(`Progression ${next}/${objectiveValue}`)
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur")
      }
    })
  }

  async function handleProofUploaded(path: string) {
    setSubmitting(true)
    try {
      await callSport({ action: "complete", proofUrl: path, proofType: "photo" })
      toast.success("Soumission envoyée — en attente de validation modérateur")
      announce("Soumission envoyée — en attente de validation")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur")
    } finally {
      setSubmitting(false)
    }
  }

  if (isCompleted) {
    return (
      <p className="text-xs font-bold uppercase tracking-wider text-emerald-300 px-1 py-2">
        <Check className="inline h-3 w-3 mr-1" />
        Validé
      </p>
    )
  }

  if (pendingValidation) {
    return (
      <p className="text-xs italic text-amber-300 px-1 py-2">
        En attente de validation modérateur…
      </p>
    )
  }

  if (!isStarted) {
    return (
      <Button
        size="sm"
        onClick={handleStart}
        disabled={pending}
        className="w-full bg-orange-500 hover:bg-orange-600 text-black font-black uppercase tracking-wider"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Play className="h-4 w-4 mr-1" />
        )}
        Commencer
      </Button>
    )
  }

  // Started but not yet submitted → +1 progress button + proof uploader for "complete".
  return (
    <div className="flex flex-col gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleUpdate}
        disabled={pending || submitting || currentValue >= objectiveValue}
        className="w-full font-black uppercase tracking-wider"
      >
        <Plus className="h-4 w-4 mr-1" />
        +1 ({Math.min(currentValue, objectiveValue)}/{objectiveValue})
      </Button>
      {progressId ? (
        <EvidenceUpload
          bucket="defi-proofs"
          ownerId={teenId}
          resourceType="defi_proof"
          resourceId={progressId}
          onComplete={handleProofUploaded}
          label="Soumettre la preuve"
        />
      ) : null}
    </div>
  )
}
