"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, CreditCard, Coins, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface TopupPackage {
  id: string
  coins: number
  price: number
  popular: boolean
  bonus: number
  icon: any
  color: string
  borderColor: string
}

interface TopupFormProps {
  teens: any[]
  packages: TopupPackage[]
  selectedTeenId: string
  parentId: string
}

export function TopupForm({ teens, packages, selectedTeenId, parentId }: TopupFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [teenId, setTeenId] = useState(selectedTeenId || "")
  const [packageId, setPackageId] = useState("")
  const [success, setSuccess] = useState(false)

  const selectedPackage = packages.find(p => p.id === packageId)
  const selectedTeen = teens.find(t => t.teen_id === teenId)

  const handleSubmit = async () => {
    if (!teenId || !packageId) {
      toast.error("Veuillez sélectionner un teen et un pack")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/parent/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId,
          teenId,
          packageId,
          coins: selectedPackage?.coins || 0,
          bonus: selectedPackage?.bonus || 0,
          price: selectedPackage?.price || 0,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(true)
        toast.success(`${(selectedPackage?.coins || 0) + (selectedPackage?.bonus || 0)} coins ajoutés !`)
        setTimeout(() => {
          router.refresh()
          setSuccess(false)
          setPackageId("")
        }, 2000)
      } else {
        toast.error(result.error || "Erreur lors de la recharge")
      }
    } catch (err) {
      toast.error("Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="py-12 text-center">
        <div className="h-20 w-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
          <CheckCircle className="h-10 w-10 text-emerald-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Recharge réussie !</h3>
        <p className="text-zinc-400">
          {(selectedPackage?.coins || 0) + (selectedPackage?.bonus || 0)} coins ont été ajoutés au compte de {selectedTeen?.teen_name}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Teen Selection */}
      <div className="space-y-2">
        <Label className="text-zinc-300">Sélectionner un Teen</Label>
        <Select value={teenId} onValueChange={setTeenId}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
            <SelectValue placeholder="Choisir un teen" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            {teens.map((teen: any) => (
              <SelectItem
                key={teen.teen_id}
                value={teen.teen_id}
                className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
              >
                <div className="flex items-center gap-2">
                  <span>{teen.teen_name}</span>
                  <span className="text-xs text-yellow-400">({teen.total_coins || 0} coins)</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Package Selection */}
      <div className="space-y-2">
        <Label className="text-zinc-300">Choisir un pack</Label>
        <Select value={packageId} onValueChange={setPackageId}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
            <SelectValue placeholder="Sélectionner un pack" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            {packages.map((pack) => (
              <SelectItem
                key={pack.id}
                value={pack.id}
                className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
              >
                <div className="flex items-center gap-3">
                  <Coins className="h-4 w-4 text-yellow-400" />
                  <span>{pack.coins} coins</span>
                  {pack.bonus > 0 && (
                    <span className="text-xs text-emerald-400">+{pack.bonus} bonus</span>
                  )}
                  <span className="text-zinc-400">- {pack.price} DH</span>
                  {pack.popular && (
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                      Populaire
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      {selectedPackage && selectedTeen && (
        <div className="p-4 bg-zinc-800 rounded-xl border border-zinc-700">
          <h4 className="font-semibold text-white mb-3">Résumé</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Bénéficiaire</span>
              <span className="text-white">{selectedTeen.teen_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Coins de base</span>
              <span className="text-white">{selectedPackage.coins}</span>
            </div>
            {selectedPackage.bonus > 0 && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Bonus</span>
                <span className="text-emerald-400">+{selectedPackage.bonus}</span>
              </div>
            )}
            <div className="border-t border-zinc-700 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-zinc-400">Total coins</span>
                <span className="text-yellow-400 font-bold">
                  {selectedPackage.coins + selectedPackage.bonus}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-zinc-400">Prix</span>
                <span className="text-emerald-400 font-bold">{selectedPackage.price} DH</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={loading || !teenId || !packageId}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-12"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Traitement en cours...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4 mr-2" />
            Procéder au paiement
          </>
        )}
      </Button>

      <p className="text-xs text-zinc-500 text-center">
        Le paiement sera traité de manière sécurisée. Les coins seront crédités instantanément.
      </p>
    </div>
  )
}
