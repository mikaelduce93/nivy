"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check, Loader2, Camera } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { markPushPromptEligible } from "@/components/teen/push-permission-prompt"

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

  const handleClick = () => {
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
    try {
      const res = await fetch(`/api/teen/chores/${choreId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidence_url: evidenceUrl }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Complétion enregistrée. En attente de validation parent.")
        // V1.2 Wave 3 U3 — engagement signal: a completed chore is a
        // qualifying event for the deferred push prompt (mounted globally
        // in app/teen/layout.tsx). No-op if already granted/dismissed.
        markPushPromptEligible()
        router.refresh()
      } else {
        toast.error(data.error || "Erreur")
      }
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
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
        disabled={loading}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
      >
        {loading ? (
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
