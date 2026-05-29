"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

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
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded-lg bg-purple-600 px-6 py-3 text-white font-medium shadow-sm hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "Enregistrement…" : "Continuer vers mon espace parent"}
    </button>
  )
}
