"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="opponent">Adversaire</Label>
        <Select value={opponentId} onValueChange={setOpponentId}>
          <SelectTrigger id="opponent">
            <SelectValue placeholder="Choisis un ami" />
          </SelectTrigger>
          <SelectContent>
            {friends.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.pseudo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="kind">Type de défi</Label>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger id="kind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KIND_OPTIONS.map((k) => (
              <SelectItem key={k.id} value={k.id}>
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nom (optionnel)</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Premier à 1000 XP"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="target">Objectif</Label>
          <Input
            id="target"
            type="number"
            inputMode="numeric"
            min={1}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Durée (heures)</Label>
          <Input
            id="duration"
            type="number"
            inputMode="numeric"
            min={1}
            max={720}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stake">Mise XP</Label>
          <Input
            id="stake"
            type="number"
            inputMode="numeric"
            min={0}
            value={stake}
            onChange={(e) => setStake(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expires">Expiration invitation (h)</Label>
          <Input
            id="expires"
            type="number"
            inputMode="numeric"
            min={1}
            max={168}
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={submitting || !opponentId}
        className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-black uppercase tracking-wider"
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Swords className="w-4 h-4 mr-2" />
        )}
        Envoyer le défi
      </Button>

      <p className="text-xs text-zinc-500">
        Ta mise XP est débitée immédiatement et placée en escrow. Si ton ami
        refuse ou laisse expirer l&apos;invitation, ta mise t&apos;est rendue.
      </p>
    </form>
  )
}
