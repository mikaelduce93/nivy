"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Teen {
  teen_id: string
  teen_name: string
}

const RECURRENCE_OPTIONS = [
  { value: "one_shot", label: "Une seule fois" },
  { value: "daily", label: "Quotidienne" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "monthly", label: "Mensuelle" },
  { value: "custom_days", label: "Jours personnalisés" },
]

export function ChoreForm({ teens }: { teens: Teen[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  // Wave 3 / TICKET-016 — sibling fan-out. Default is "all teens selected".
  const [teenIds, setTeenIds] = useState<string[]>(
    teens.map((t) => t.teen_id)
  )
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [rewardDh, setRewardDh] = useState("0")
  const [rewardXp, setRewardXp] = useState("0")
  const [recurrence, setRecurrence] = useState("one_shot")
  const [requiredCompletions, setRequiredCompletions] = useState("1")
  const [evidenceRequired, setEvidenceRequired] = useState(false)

  const toggleTeen = (id: string, checked: boolean) => {
    setTeenIds((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((t) => t !== id)
    )
  }

  const allSelected = teenIds.length === teens.length && teens.length > 0
  const toggleAll = (checked: boolean) => {
    setTeenIds(checked ? teens.map((t) => t.teen_id) : [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (teenIds.length === 0 || !title.trim()) {
      toast.error("Au moins un teen et un titre sont obligatoires")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/parent/chores/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teen_ids: teenIds,
          title: title.trim(),
          description: description.trim() || null,
          reward_dh: Number(rewardDh) || 0,
          reward_xp: Number(rewardXp) || 0,
          recurrence,
          required_completions: Math.max(1, Number(requiredCompletions) || 1),
          evidence_required: evidenceRequired,
        }),
      })
      const result = await res.json()
      if (result.success) {
        toast.success(
          teenIds.length > 1
            ? `Corvée créée pour ${teenIds.length} teens`
            : "Corvée créée"
        )
        router.push("/parent/chores")
        router.refresh()
      } else {
        toast.error(result.error || "Erreur")
      }
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-zinc-300">
            Teens concernés
            <span className="text-zinc-500 font-normal ml-1">
              ({teenIds.length}/{teens.length})
            </span>
          </Label>
          {teens.length > 1 && (
            <button
              type="button"
              onClick={() => toggleAll(!allSelected)}
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          )}
        </div>
        <div className="space-y-2 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
          {teens.map((t) => {
            const checked = teenIds.includes(t.teen_id)
            return (
              <label
                key={t.teen_id}
                className="flex items-center gap-3 cursor-pointer rounded px-2 py-1.5 hover:bg-zinc-800"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => toggleTeen(t.teen_id, v === true)}
                  className="border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                />
                <span className="text-sm text-white">{t.teen_name}</span>
              </label>
            )
          })}
        </div>
        <p className="text-xs text-zinc-500">
          La corvée sera assignée indépendamment à chaque teen sélectionné
          (chacun la complète et est récompensé séparément).
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-zinc-300">Titre</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex. Faire la vaisselle 5 fois"
          className="bg-zinc-800 border-zinc-700 text-white"
          maxLength={120}
          required
        />
      </div>

      <div className="space-y-2">
        <Label className="text-zinc-300">Description (optionnelle)</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Détails / consignes..."
          className="bg-zinc-800 border-zinc-700 text-white"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-zinc-300">Récompense DH</Label>
          <Input
            type="number"
            min="0"
            step="0.5"
            value={rewardDh}
            onChange={(e) => setRewardDh(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
          <p className="text-xs text-zinc-500">
            1 DH = 100 coins. Versé après vérification.
          </p>
        </div>
        <div className="space-y-2">
          <Label className="text-zinc-300">Récompense XP</Label>
          <Input
            type="number"
            min="0"
            step="10"
            value={rewardXp}
            onChange={(e) => setRewardXp(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-zinc-300">Récurrence</Label>
          <Select value={recurrence} onValueChange={setRecurrence}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {RECURRENCE_OPTIONS.map((o) => (
                <SelectItem
                  key={o.value}
                  value={o.value}
                  className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
                >
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-zinc-300">Nombre requis</Label>
          <Input
            type="number"
            min="1"
            max="365"
            value={requiredCompletions}
            onChange={(e) => setRequiredCompletions(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
          <p className="text-xs text-zinc-500">
            Combien de fois pour déclencher la récompense.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800 border border-zinc-700">
        <div>
          <Label className="text-zinc-200">Preuve photo requise</Label>
          <p className="text-xs text-zinc-500 mt-1">
            Le teen devra uploader une photo à chaque complétion.
          </p>
        </div>
        <Switch checked={evidenceRequired} onCheckedChange={setEvidenceRequired} />
      </div>

      <Button
        type="submit"
        disabled={loading || teenIds.length === 0}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-12"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Création...
          </>
        ) : (
          "Créer la corvée"
        )}
      </Button>
    </form>
  )
}
