"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FieldInput } from "@/components/ui/field-input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Settings, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface BudgetLimitFormProps {
  teenId: string
  teenName: string
  currentMonthlyLimit: number
  currentPerEventLimit: number
  currentRequiresApproval: boolean
}

export function BudgetLimitForm({
  teenId,
  teenName,
  currentMonthlyLimit,
  currentPerEventLimit,
  currentRequiresApproval
}: BudgetLimitFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [monthlyLimit, setMonthlyLimit] = useState(currentMonthlyLimit.toString())
  const [perEventLimit, setPerEventLimit] = useState(currentPerEventLimit.toString())
  const [requiresApproval, setRequiresApproval] = useState(currentRequiresApproval)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/parent/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teenId,
          monthlyLimit: parseFloat(monthlyLimit) || 0,
          perEventLimit: parseFloat(perEventLimit) || 0,
          requiresApproval
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Limites mises à jour !")
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || "Erreur lors de la mise à jour")
      }
    } catch (error) {
      toast.error("Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Settings className="h-4 w-4 mr-2" />
          Modifier les limites
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-2 border-ink">
        <DialogHeader>
          <DialogTitle className="text-ink">Limites de budget pour {teenName}</DialogTitle>
          <DialogDescription className="text-mute">
            Définissez les limites de dépenses mensuelles
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Monthly Limit */}
          <FieldInput
            label="Limite mensuelle (DH/mois)"
            type="number"
            value={monthlyLimit}
            onChange={(e) => setMonthlyLimit(e.target.value)}
            placeholder="Ex: 500"
            min={0}
            hint="0 = pas de limite"
          />

          {/* Quick Limits */}
          <div className="flex gap-2">
            {[200, 500, 1000, 2000].map((value) => (
              <Button
                key={value}
                type="button"
                variant={monthlyLimit === value.toString() ? "lime" : "outline"}
                size="sm"
                onClick={() => setMonthlyLimit(value.toString())}
              >
                {value} DH
              </Button>
            ))}
          </div>

          {/* Per Event Limit */}
          <FieldInput
            label="Limite par event (DH/event)"
            type="number"
            value={perEventLimit}
            onChange={(e) => setPerEventLimit(e.target.value)}
            placeholder="Ex: 200"
            min={0}
            hint="Les events au-dessus de cette limite nécessiteront ton approbation"
          />

          {/* Requires Approval */}
          <div className="flex items-center justify-between rounded-xl border-2 border-ink bg-paper p-4">
            <div>
              <Label className="font-medium text-ink">Approbation requise</Label>
              <p className="mt-1 text-xs text-mute">
                Approuver manuellement chaque réservation
              </p>
            </div>
            <Switch
              checked={requiresApproval}
              onCheckedChange={setRequiresApproval}
              className="data-[state=checked]:bg-lime"
            />
          </div>

          {/* Submit */}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
