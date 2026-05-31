"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FieldInput } from "@/components/ui/field-input"
import { SelectSticker, SelectStickerItem } from "@/components/ui/select-sticker"
import { StickerCard } from "@/components/ui/sticker-card"
import { DefiCard } from "@/components/teen/defi-card"
import { Loader2, Swords } from "lucide-react"
import { toast } from "sonner"

export interface FriendOption {
  id: string
  pseudo: string
  avatar_url: string | null
}

const KIND_OPTIONS: { id: string; label: string }[] = [
  { id: "quiz_battle", label: "Quiz Battle" },
  { id: "mission_race", label: "Course aux missions" },
  { id: "physical_count", label: "Défi physique" },
  { id: "streak_race", label: "Course aux streaks" },
  { id: "xp_duel", label: "Duel XP" },
  { id: "custom", label: "Personnalisé" },
]

export function NewFriendDefiForm({ friends }: { friends: FriendOption[] }) {
  const router = useRouter()
  const [opponentId, setOpponentId] = useState<string>("")
  const [kind, setKind] = useState<string>("xp_duel")
  const [name, setName] = useState<string>("")
  const [target, setTarget] = useState<string>("100")
  const [duration, setDuration] = useState<string>("168")
  const [stake, setStake] = useState<string>("50")
  const [expires, setExpires] = useState<string>("48")
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!opponentId) {
      toast.error("Choisis un adversaire")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/teen/friend-challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opponentId,
          challengeKind: kind,
          name: name.trim() || null,
          targetValue: target ? Math.max(1, parseInt(target, 10)) : null,
          durationHours: duration ? Math.max(1, parseInt(duration, 10)) : 168,
          xpStake: stake ? Math.max(0, parseInt(stake, 10)) : 0,
          expiresInHours: expires ? Math.max(1, parseInt(expires, 10)) : 48,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error ?? `HTTP ${res.status}`)
      }
      toast.success("Défi envoyé — en attente d'acceptation")
      router.push("/teen/quests/friend-defis")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur")
    } finally {
      setSubmitting(false)
    }
  }

  // Preview live — le défi se construit sous les yeux de l'ado au fil de la
  // saisie (adversaire / type / mise / objectif). Purement présentationnel.
  const opponentPseudo =
    friends.find((f) => f.id === opponentId)?.pseudo ?? null
  const kindLabel = KIND_OPTIONS.find((k) => k.id === kind)?.label ?? "Défi"
  const previewTitle = name.trim() || kindLabel
  const previewTarget = target ? Math.max(1, parseInt(target, 10)) : 0
  const previewStake = stake ? Math.max(0, parseInt(stake, 10)) : 0
  const previewDescription = opponentPseudo
    ? `Tu défies ${opponentPseudo} · ${kindLabel}`
    : `Choisis un adversaire · ${kindLabel}`

  return (
    <div className="space-y-6">
      {/* Récap visuel de l'enjeu */}
      <div>
        <span className="eyebrow tracking-[0.16em] text-mute">Aperçu du défi</span>
        <div className="mt-2">
          <DefiCard
            type="friend"
            title={previewTitle}
            description={previewDescription}
            xpReward={previewStake}
            status="active"
            progress={previewTarget > 0 ? { current: 0, target: previewTarget } : undefined}
          />
        </div>
      </div>

      <StickerCard className="p-5 sm:p-6">
        <form onSubmit={onSubmit} className="space-y-5">
          <SelectSticker
            label="Adversaire"
            placeholder="Choisis un ami"
            value={opponentId}
            onValueChange={setOpponentId}
          >
            {friends.map((f) => (
              <SelectStickerItem key={f.id} value={f.id}>
                {f.pseudo}
              </SelectStickerItem>
            ))}
          </SelectSticker>

          <SelectSticker
            label="Type de défi"
            value={kind}
            onValueChange={setKind}
          >
            {KIND_OPTIONS.map((k) => (
              <SelectStickerItem key={k.id} value={k.id}>
                {k.label}
              </SelectStickerItem>
            ))}
          </SelectSticker>

          <FieldInput
            label="Nom (optionnel)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Premier à 1000 XP"
          />

          <div className="grid grid-cols-2 gap-4">
            <FieldInput
              label="Objectif"
              type="number"
              inputMode="numeric"
              min={1}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <FieldInput
              label="Durée (heures)"
              type="number"
              inputMode="numeric"
              min={1}
              max={720}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <FieldInput
              label="Mise XP"
              type="number"
              inputMode="numeric"
              min={0}
              value={stake}
              onChange={(e) => setStake(e.target.value)}
            />
            <FieldInput
              label="Expiration invitation (h)"
              type="number"
              inputMode="numeric"
              min={1}
              max={168}
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            variant="pink"
            disabled={submitting || !opponentId}
            className="w-full uppercase tracking-wider"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Swords className="w-4 h-4 mr-2" />
            )}
            Envoyer le défi
          </Button>

          <p className="text-xs text-mute">
            Ta mise XP est débitée immédiatement et placée en escrow. Si ton ami
            refuse ou laisse expirer l&apos;invitation, ta mise t&apos;est rendue.
          </p>
        </form>
      </StickerCard>
    </div>
  )
}
