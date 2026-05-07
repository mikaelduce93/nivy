"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function GoalForm() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [targetCoins, setTargetCoins] = useState(5000)
  const [targetDate, setTargetDate] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await fetch("/api/teen/savings/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        image_url: imageUrl || undefined,
        target_coins: targetCoins,
        target_date: targetDate || undefined,
      }),
    })
    const json = await res.json()
    setBusy(false)
    if (!res.ok || !json.success) {
      setError(json.error ?? "Erreur")
      return
    }
    router.push("/teen/savings")
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label>Titre</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <Label>Description (optionnel)</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <Label>URL image (optionnel)</Label>
        <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
      </div>
      <div>
        <Label>Objectif en coins</Label>
        <Input
          type="number"
          min={1}
          value={targetCoins}
          onChange={(e) => setTargetCoins(Number(e.target.value))}
          required
        />
      </div>
      <div>
        <Label>Date cible (optionnel)</Label>
        <Input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={busy || !title}>
        {busy ? "Création..." : "Créer l'objectif"}
      </Button>
    </form>
  )
}
