"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
  const [teenId, setTeenId] = useState(teens[0]?.teen_id ?? "")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [rewardDh, setRewardDh] = useState("0")
  const [rewardXp, setRewardXp] = useState("0")
  const [recurrence, setRecurrence] = useState("one_shot")
  const [requiredCompletions, setRequiredCompletions] = useState("1")
  const [evidenceRequired, setEvidenceRequired] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teenId || !title.trim()) {
      toast.error("Teen et titre obligatoires")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/parent/chores/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teen_id: teenId,
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
        toast.success("Corvée créée")
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
      <div className="space-y-2">
        <Label className="text-zinc-300">Teen</Label>
        <Select value={teenId} onValueChange={setTeenId}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
            <SelectValue placeholder="Choisir un teen" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            {teens.map((t) => (
              <SelectItem
                key={t.teen_id}
                value={t.teen_id}
                className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
              >
                {t.teen_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        disabled={loading}
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
