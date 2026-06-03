"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

/**
 * Finalises parent onboarding after the e-signature step (#51).
 * Calls the canonical /api/parent/onboarding/complete endpoint so
 * profiles.is_onboarded flips to true, then forwards to /parent. The
 * endpoint hard-gates on a signed e_signatures row, so this surfaces a
 * requiresSignature error if the consent is somehow missing.
 */
export function ParentOnboardingCompleteButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleClick() {
    if (pending) return
    setPending(true)
    try {
      const res = await fetch("/api/parent/onboarding/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
      })
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null
      if (!res.ok || !json?.success) {
        toast.error(json?.error ?? "Erreur d'enregistrement")
        setPending(false)
        return
      }
      toast.success("Bienvenue sur ton espace parent")
      router.replace("/parent")
      router.refresh()
    } catch (err) {
      console.error("[parent onboarding complete]", err)
      toast.error("Erreur réseau, réessaye")
      setPending(false)
    }
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={pending}
      variant="pink"
      size="lg"
      className="w-full"
    >
      {pending ? "Enregistrement…" : "Continuer vers mon espace parent"}
    </Button>
  )
}
