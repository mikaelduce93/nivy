"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/ui/field"
import { Niv } from "@/components/brand/niv"
import { Send } from "lucide-react"

interface CandidatureFormProps {
  /** Endpoint POST (ex: /api/mentor/apply). */
  endpoint?: string
  /** Libellé du métier (ex: "mentor", "DJ"). */
  role: string
}

// Refonte V1.5 (#102) — formulaire de candidature charte, partagé devenir-mentor / devenir-dj.
export function CandidatureForm({ endpoint, role }: CandidatureFormProps) {
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" })

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    if (!endpoint) {
      setDone(true)
      setSubmitting(false)
      return
    }
    try {
      // Only confirm on a real 2xx — no more fake success when the POST fails.
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error("request_failed")
      setDone(true)
    } catch {
      setError("Envoi impossible pour le moment. Vérifie ta connexion et réessaie.")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <Card className="items-center text-center py-12 px-8 max-w-lg mx-auto">
        <Niv size={110} mood="proud" float />
        <h2 className="text-2xl font-black text-ink mt-4">Candidature envoyée !</h2>
        <p className="text-mute max-w-sm mt-2">Merci — on revient vers toi très vite pour la suite.</p>
      </Card>
    )
  }

  return (
    <Card className="max-w-lg mx-auto p-8">
      <form onSubmit={onSubmit} className="space-y-4 px-6">
        <FormField label="Nom complet" required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ton nom" required />
        </FormField>
        <FormField label="Email" required>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="toi@email.ma" required />
        </FormField>
        <FormField label="Téléphone">
          <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+212 6 ..." />
        </FormField>
        <FormField label={`Pourquoi ${role} sur Nivy ?`}>
          <Input value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Quelques mots..." />
        </FormField>
        <Button type="submit" variant="pink" className="w-full" disabled={submitting}>
          <Send className="w-4 h-4 mr-2" />{submitting ? "Envoi..." : "Envoyer ma candidature"}
        </Button>
        {error && <p className="text-sm text-coral text-center" role="alert">{error}</p>}
      </form>
    </Card>
  )
}
