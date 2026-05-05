"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function NewsletterForm() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    if (!EMAIL_RE.test(trimmed)) {
      toast.error("Adresse email invalide.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok && data?.success) {
        if (data.already_subscribed) {
          toast.success("Tu es deja inscrit a notre newsletter.")
        } else {
          toast.success(data.message ?? "Merci ! Tu es inscrit a notre newsletter.")
          setEmail("")
        }
        return
      }

      const message =
        typeof data?.error === "string"
          ? data.error
          : res.status === 503
          ? "Inscription temporairement indisponible. Reviens bientot."
          : "Une erreur est survenue. Reessaie plus tard."
      toast.error(message)
    } catch (err) {
      console.error("[newsletter] submit error:", err)
      toast.error("Impossible de te contacter. Reessaie plus tard.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="email"
        placeholder="ton@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1"
        required
        disabled={loading}
        aria-label="Adresse email pour la newsletter"
      />
      <Button type="submit" disabled={loading}>
        {loading ? "..." : "OK"}
      </Button>
    </form>
  )
}
