"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  SelectSticker,
  SelectStickerItem,
} from "@/components/ui/select-sticker"
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
        <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full border-2 border-ink bg-lime/20">
          <CheckCircle className="h-10 w-10 text-lime" />
        </div>
        <h3 className="font-display text-xl font-extrabold text-ink">
          Recharge réussie !
        </h3>
        <p className="text-mute">
          Coins ajoutés au compte de {selectedTeen?.teen_name}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!PSP_AUTO_TOPUP_ENABLED && (
        <div className="rounded-2xl border-2 border-ink bg-gold/10 p-4 text-sm text-ink-2 shadow-stkr-sm">
          <strong className="text-ink">Mode manuel uniquement —</strong> la
          recharge automatique (CMI / Stripe) arrive bientôt. Pour recharger
          maintenant, passe par le virement opérateur.
        </div>
      )}

      {/* Teen Selection */}
      <SelectSticker
        label="Sélectionner un teen"
        placeholder="Choisir un teen"
        value={teenId}
        onValueChange={setTeenId}
      >
        {teens.map((teen) => (
          <SelectStickerItem key={teen.teen_id} value={teen.teen_id}>
            <span className="flex items-center gap-2">
              <span>{teen.teen_name}</span>
              <span className="font-mono text-xs text-mute">
                {teen.total_coins || 0} ⊙
              </span>
            </span>
          </SelectStickerItem>
        ))}
      </SelectSticker>

      {/* Package Selection — disabled when auto top-up is off (F5). */}
      <SelectSticker
        label="Choisir un pack"
        placeholder={
          PSP_AUTO_TOPUP_ENABLED
            ? "Sélectionner un pack"
            : "Désactivé — mode manuel"
        }
        value={packageId}
        onValueChange={setPackageId}
        disabled={!PSP_AUTO_TOPUP_ENABLED}
      >
        {packages.map((pack) => (
          <SelectStickerItem key={pack.id} value={pack.id}>
            <span className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-gold" />
              <span>{pack.coins} coins</span>
              {pack.bonus > 0 && (
                <span className="font-mono text-xs text-lime">
                  +{pack.bonus}
                </span>
              )}
              <span className="font-mono text-mute">— {pack.price} DH</span>
              {pack.popular && (
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-pink">
                  Populaire
                </span>
              )}
            </span>
          </SelectStickerItem>
        ))}
      </SelectSticker>

      {/* Summary */}
      {selectedPackage && selectedTeen && (
        <div className="rounded-2xl border-2 border-ink bg-paper-2 p-4 shadow-stkr-sm">
          <h4 className="mb-3 font-display font-extrabold text-ink">Résumé</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-mute">Bénéficiaire</span>
              <span className="text-ink">{selectedTeen.teen_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-mute">Coins de base</span>
              <span className="font-mono text-ink">{selectedPackage.coins}</span>
            </div>
            {selectedPackage.bonus > 0 && (
              <div className="flex justify-between">
                <span className="text-mute">Bonus</span>
                <span className="font-mono text-lime">
                  +{selectedPackage.bonus}
                </span>
              </div>
            )}
            <div className="mt-2 border-t-2 border-line pt-2">
              <div className="flex justify-between">
                <span className="text-mute">Total coins</span>
                <span className="font-mono font-bold text-ink">
                  {selectedPackage.coins + selectedPackage.bonus}{" "}
                  <span className="text-coral">⊙</span>
                </span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-mute">Prix</span>
                <span className="font-mono font-bold text-ink">
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
        variant="pink"
        className="h-12 w-full"
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

      <p className="text-center text-xs text-mute">
        Le paiement est traité de manière sécurisée. Les coins sont crédités
        instantanément.
      </p>
    </div>
  )
}
