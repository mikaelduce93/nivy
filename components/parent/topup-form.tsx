"use client"

import { useEffect, useRef, useState } from "react"
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

// NOTE — Wave 1B: client trusts none of {coins, bonus, price, parentId}.
// Only the package id (or amount_dh) and a fresh idempotency key go to the
// server. The server derives DH from a server-side package map and the
// resulting coin amount via 1 DH = 100 coins. Per docs/canon/economy-payments.locked.md §6 FORBIDDEN #3.

interface TopupPackage {
  id: string
  coins: number
  price: number
  popular: boolean
  bonus: number
  // Visual props left in for the existing UI but ignored server-side.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: any
  color?: string
  borderColor?: string
}

interface TopupFormProps {
  teens: Array<{ teen_id: string; teen_name: string; total_coins?: number }>
  packages: TopupPackage[]
  selectedTeenId: string
  parentId: string // accepted for back-compat, but NEVER sent to the server
}

// Per F5 (manual top-up only at launch): a flag we read once from process.env
// at module scope. False at launch.
const PSP_AUTO_TOPUP_ENABLED =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_PSP_AUTO_TOPUP_ENABLED === "true"

export function TopupForm({ teens, packages, selectedTeenId }: TopupFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [teenId, setTeenId] = useState(selectedTeenId || "")
  const [packageId, setPackageId] = useState("")
  const [success, setSuccess] = useState(false)

  // Idempotency key generated ONCE per form instance, on mount. A retry
  // re-uses the same key so the server returns the original payment instead
  // of double-crediting. After a successful submit we rotate the key so the
  // next top-up can proceed.
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID())
  // Force a re-render on rotation so React stays in sync; value isn't shown.
  const [, setKeyTick] = useState(0)

  useEffect(() => {
    // Refresh once on mount in case the constructor ran before crypto was
    // available (older browsers / SSR hydration). Stable after.
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID()
      setKeyTick((t) => t + 1)
    }
  }, [])

  const selectedPackage = packages.find((p) => p.id === packageId)
  const selectedTeen = teens.find((t) => t.teen_id === teenId)

  const handleSubmit = async () => {
    if (!teenId || !packageId) {
      toast.error("Veuillez sélectionner un teen et un pack")
      return
    }
    if (!PSP_AUTO_TOPUP_ENABLED) {
      // F5: at launch the parent uses the manual top-up flow on a separate
      // page. We refuse to call /api/parent/topup directly to prevent
      // accidental fake-success states.
      toast.error("Recharge automatique désactivée — utilisez le mode manuel")
      router.push("/parent/topup/manual")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/parent/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Canonical contract: ONLY teenId + packageId (server derives amount)
        // + idempotency key. NO coins/bonus/price/parentId.
        body: JSON.stringify({
          teenId,
          packageId,
          client_idempotency_key: idempotencyKeyRef.current,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error || "Erreur lors de la recharge")
        return
      }

      setSuccess(true)
      toast.success(
        `Recharge effectuée — nouveau solde: ${result.data?.newBalance ?? "?"} coins`
      )
      // Rotate the idempotency key so the next top-up isn't deduped against
      // this one.
      idempotencyKeyRef.current = crypto.randomUUID()
      setKeyTick((t) => t + 1)
      setTimeout(() => {
        router.refresh()
        setSuccess(false)
        setPackageId("")
      }, 2000)
    } catch (err) {
      console.error("[topup-form] network error", err)
      toast.error("Une erreur réseau est survenue")
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
          Coins ajoutés au compte de {selectedTeen?.teen_name}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!PSP_AUTO_TOPUP_ENABLED && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          <strong>Mode manuel uniquement —</strong> la recharge automatique
          (CMI / Stripe) sera activée prochainement. Pour recharger maintenant,
          utilisez le formulaire de virement bancaire.
        </div>
      )}

      {/* Teen Selection */}
      <div className="space-y-2">
        <Label className="text-zinc-300">Sélectionner un Teen</Label>
        <Select value={teenId} onValueChange={setTeenId}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
            <SelectValue placeholder="Choisir un teen" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            {teens.map((teen) => (
              <SelectItem
                key={teen.teen_id}
                value={teen.teen_id}
                className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
              >
                <div className="flex items-center gap-2">
                  <span>{teen.teen_name}</span>
                  <span className="text-xs text-yellow-400">
                    ({teen.total_coins || 0} coins)
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Package Selection — disabled when auto top-up is off (F5). */}
      <div className="space-y-2">
        <Label className="text-zinc-300">Choisir un pack</Label>
        <Select
          value={packageId}
          onValueChange={setPackageId}
          disabled={!PSP_AUTO_TOPUP_ENABLED}
        >
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
            <SelectValue
              placeholder={
                PSP_AUTO_TOPUP_ENABLED
                  ? "Sélectionner un pack"
                  : "Désactivé — mode manuel"
              }
            />
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
                    <span className="text-xs text-emerald-400">
                      +{pack.bonus} bonus
                    </span>
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
                <span className="text-emerald-400 font-bold">
                  {selectedPackage.price} DH
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={loading || !teenId || !packageId || !PSP_AUTO_TOPUP_ENABLED}
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
        Le paiement sera traité de manière sécurisée. Les coins seront crédités
        instantanément.
      </p>
    </div>
  )
}
