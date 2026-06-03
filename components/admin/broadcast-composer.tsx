"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FieldInput } from "@/components/ui/field-input"
import { SelectSticker, SelectStickerItem } from "@/components/ui/select-sticker"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatHero, Niv } from "@/components/brand/niv"
import { Send, Users } from "lucide-react"
import { toast } from "sonner"

// V3 (#196) — composer câblé sur POST /api/admin/broadcasts (fan-out réel via
// user_notifications + cron). Plus de champs non contrôlés ni de bouton mort.
export function BroadcastComposer() {
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [audience, setAudience] = useState("all")
  const [sending, setSending] = useState(false)
  const [lastCount, setLastCount] = useState<number | null>(null)

  const canSend = !!title.trim() && !!message.trim() && !sending

  const send = async () => {
    if (!canSend) return
    setSending(true)
    try {
      const res = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          title: title.trim(),
          body: message.trim(),
          priority: "normal",
        }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success) {
        toast.success(`Broadcast envoyé à ${data.recipient_count ?? 0} utilisateur(s)`)
        setLastCount(data.recipient_count ?? 0)
        setTitle("")
        setMessage("")
      } else {
        toast.error(`Envoi impossible${data?.error ? ` — ${data.error}` : ""}`)
      }
    } catch {
      toast.error("Envoi impossible — vérifie ta connexion et réessaie.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* Composer */}
      <StickerCard className="gap-5 p-6">
        <FieldInput
          label="Titre"
          placeholder="Nouvelle quête du jour"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="broadcast-message" className="eyebrow tracking-[0.16em]">
            Message
          </label>
          <Textarea
            id="broadcast-message"
            rows={4}
            placeholder="Ton message…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
          />
        </div>

        <SelectSticker label="Cible" placeholder="Choisir un segment" value={audience} onValueChange={setAudience}>
          <SelectStickerItem value="all">Tous les utilisateurs</SelectStickerItem>
          <SelectStickerItem value="teens">Ados</SelectStickerItem>
          <SelectStickerItem value="parents">Parents</SelectStickerItem>
        </SelectSticker>

        <Button variant="pink" className="w-full" onClick={send} disabled={!canSend}>
          <Send className="mr-2 h-4 w-4" />
          {sending ? "Envoi…" : "Envoyer le broadcast"}
        </Button>
      </StickerCard>

      {/* Aperçu + dernier envoi */}
      <div className="space-y-4">
        <StatHero
          eyebrow="Dernier envoi"
          value={lastCount ?? 0}
          tone="teal"
          icon={<Users className="h-6 w-6" />}
          meta={lastCount === null ? "Aucun broadcast envoyé" : "Destinataires touchés"}
        />

        <StickerCard variant="panel" className="gap-3 p-5">
          <span className="eyebrow tracking-[0.16em]">Aperçu de la notification</span>
          <div className="flex items-start gap-3 rounded-xl border-2 border-ink bg-paper p-3">
            <Niv mood="happy" size={44} className="shrink-0" />
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-ink">Nivy</p>
              <p className="truncate text-sm font-semibold text-ink">{title || "Titre de l'annonce"}</p>
              <p className="line-clamp-2 text-xs text-mute">{message || "Le message apparaîtra ici."}</p>
            </div>
          </div>
        </StickerCard>
      </div>
    </div>
  )
}
