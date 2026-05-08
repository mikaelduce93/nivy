"use client"

import { useRef, useState, useOptimistic, startTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check, Loader2, Camera, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { markPushPromptEligible } from "@/components/teen/push-permission-prompt"
import { Celebrate } from "@/components/ui/celebrate"
import { useAnnounce } from "@/components/a11y/announce-region"

// TICKET-031 — chore completion uses useOptimistic. We immediately flip the
// button to a "submitted" state on click; on hard failure the optimistic state
// reverts so the user can retry. router.refresh() re-syncs server data once
// the mutation succeeds.
type ChoreState = "idle" | "submitted"

export function TeenChoreCompleteButton({
  choreId,
  evidenceRequired,
}: {
  choreId: string
  evidenceRequired: boolean
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState<ChoreState>("idle")
  // Wave 3 / TICKET-022 — fire <Celebrate> when the chore submission is
  // accepted (teen-side proxy for the parent-approval moment).
  const [celebrate, setCelebrate] = useState(false)
  // Wave 3 / TICKET-050 — paired SR announcement on the same trigger.
  const announce = useAnnounce()
  const [optimisticState, applyOptimistic] = useOptimistic(
    confirmed,
    (_prev: ChoreState, next: ChoreState) => next,
  )

  const handleClick = () => {
    if (loading || optimisticState === "submitted") return
    if (evidenceRequired) {
      fileInputRef.current?.click()
    } else {
      submit(null)
    }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split(".").pop() || "jpg"
      const path = `chores/${choreId}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from("defi-proofs")
        .upload(path, file, { contentType: file.type, upsert: false })
      if (upErr) {
        toast.error("Upload échoué: " + upErr.message)
        setLoading(false)
        return
      }
      await submit(path)
    } catch (err) {
      toast.error("Erreur upload")
      setLoading(false)
    }
  }

  const submit = async (evidenceUrl: string | null) => {
    setLoading(true)

    startTransition(async () => {
      // Optimistic flip — button instantly looks "done".
      applyOptimistic("submitted")

      try {
        const res = await fetch(`/api/teen/chores/${choreId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ evidence_url: evidenceUrl }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data?.success) {
          toast.success("Complétion enregistrée. En attente de validation parent.")
          // V1.2 Wave 3 U3 — engagement signal: a completed chore is a
          // qualifying event for the deferred push prompt (mounted globally
          // in app/teen/layout.tsx). No-op if already granted/dismissed.
          markPushPromptEligible()
          // Confirm: commit submitted state, then re-sync from server. After
          // refresh the parent typically re-renders without this button.
          setConfirmed("submitted")
          setCelebrate(true)
          announce("Mission validée. Bravo!")
          router.refresh()
        } else {
          // Rollback: optimistic state auto-reverts to confirmed ("idle")
          // when this transition settles.
          toast.error(data?.error || "Erreur")
        }
      } catch {
        toast.error("Erreur réseau")
      } finally {
        setLoading(false)
      }
    })
  }

  const isSubmitted = optimisticState === "submitted"

  return (
    <>
      <Celebrate
        trigger={celebrate}
        variant="confetti"
        onComplete={() => setCelebrate(false)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        onClick={handleClick}
        disabled={loading || isSubmitted}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
      >
        {isSubmitted && !loading ? (
          <>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Envoyé pour validation
          </>
        ) : loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            En cours...
          </>
        ) : evidenceRequired ? (
          <>
            <Camera className="h-4 w-4 mr-2" />
            Marquer fait (avec photo)
          </>
        ) : (
          <>
            <Check className="h-4 w-4 mr-2" />
            Marquer comme fait
          </>
        )}
      </Button>
    </>
  )
}
