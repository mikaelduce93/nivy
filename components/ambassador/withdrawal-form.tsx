"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FieldInput } from "@/components/ui/field-input"
import { SelectSticker, SelectStickerItem } from "@/components/ui/select-sticker"
import { CheckRound } from "@/components/ui/check-round"
import { Confetti } from "@/components/ui/effects/confetti"
import { NivCoach } from "@/components/brand"
import { Loader2, ArrowDownToLine } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface WithdrawalFormProps {
  ambassadorId: string
  availableBalance: number
  minimumWithdrawal: number
}

// #57 — ambassadorId prop is no longer sent to the API (the server resolves the
// ambassador from the session); kept in the interface for call-site compat.
export function WithdrawalForm({ availableBalance, minimumWithdrawal }: WithdrawalFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [paymentDetails, setPaymentDetails] = useState("")
  // Présentationnel uniquement : déclenche confettis + check à la confirmation.
  const [celebrate, setCelebrate] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum < minimumWithdrawal) {
      toast.error(`Le montant minimum est de ${minimumWithdrawal} DH`)
      return
    }

    if (amountNum > availableBalance) {
      toast.error("Montant supérieur au solde disponible")
      return
    }

    if (!paymentMethod) {
      toast.error("Veuillez sélectionner une méthode de paiement")
      return
    }

    if (!paymentDetails) {
      toast.error("Veuillez entrer les détails de paiement")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/ambassador/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // #57 — no ambassadorId: the server derives it from the session.
          amount: amountNum,
          paymentMethod,
          paymentDetails,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Demande de retrait envoyée !")
        setCelebrate(true)
        setAmount("")
        setPaymentMethod("")
        setPaymentDetails("")
        router.refresh()
      } else {
        toast.error(result.error || "Erreur lors de la demande")
      }
    } catch (error) {
      toast.error("Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  const getPlaceholder = () => {
    switch (paymentMethod) {
      case "bank":
        return "RIB (24 chiffres)"
      case "cashplus":
        return "Numéro de téléphone"
      case "mobile_wallet":
        return "Numéro de téléphone"
      default:
        return "Détails du paiement"
    }
  }

  // Délais fusionnés depuis les anciennes cartes « méthodes de paiement ».
  const getMethodDelay = () => {
    switch (paymentMethod) {
      case "bank":
        return "Virement vers un RIB marocain · 2-3 jours ouvrés"
      case "cashplus":
        return "Retrait en agence Cash Plus · 24-48h"
      case "mobile_wallet":
        return "Orange Money, inwi money · instantané"
      default:
        return undefined
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Confetti trigger={celebrate} palette="success" />

      {/* Amount — gros input mono charte */}
      <FieldInput
        label="Montant à retirer"
        type="number"
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={`Min. ${minimumWithdrawal} DH`}
        min={minimumWithdrawal}
        max={availableBalance}
        hint={`Disponible : ${availableBalance.toLocaleString()} DH`}
        className="h-14 font-mono text-2xl font-bold tabular-nums"
      />

      {/* Quick amount pills — tags actifs ink */}
      <div className="flex flex-wrap gap-2">
        {[100, 200, 500].filter(v => v <= availableBalance).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setAmount(value.toString())}
            className={`rounded-full border-2 border-ink px-4 py-1.5 font-mono text-xs font-semibold transition-colors ${amount === value.toString() ? 'bg-ink text-paper' : 'bg-white text-ink hover:bg-paper-2'}`}
          >
            {value} DH
          </button>
        ))}
        <button
          type="button"
          onClick={() => setAmount(availableBalance.toString())}
          className={`rounded-full border-2 border-ink px-4 py-1.5 font-mono text-xs font-semibold transition-colors ${amount === availableBalance.toString() ? 'bg-ink text-paper' : 'bg-white text-ink hover:bg-paper-2'}`}
        >
          Tout
        </button>
      </div>

      {/* Payment Method — select sticker + délai fusionné */}
      <div className="space-y-1.5">
        <SelectSticker
          label="Méthode de paiement"
          placeholder="Sélectionner une méthode"
          value={paymentMethod}
          onValueChange={setPaymentMethod}
        >
          <SelectStickerItem value="bank">Virement bancaire</SelectStickerItem>
          <SelectStickerItem value="cashplus">Cash Plus</SelectStickerItem>
          <SelectStickerItem value="mobile_wallet">Portefeuille mobile</SelectStickerItem>
        </SelectSticker>
        {getMethodDelay() && (
          <p className="font-mono text-xs text-mute">{getMethodDelay()}</p>
        )}
      </div>

      {/* Payment Details */}
      {paymentMethod && (
        <FieldInput
          label={paymentMethod === "bank" ? "RIB bancaire" : "Numéro de téléphone"}
          type={paymentMethod === "bank" ? "text" : "tel"}
          value={paymentDetails}
          onChange={(e) => setPaymentDetails(e.target.value)}
          placeholder={getPlaceholder()}
        />
      )}

      {/* Coach Niv — rassure sur délais/sécurité */}
      <NivCoach
        mood="calm"
        message="Ton virement part vers le compte que tu indiques, traité sous 24-72h. On te notifie par email à chaque étape — zéro stress."
      />

      {/* Submit */}
      <Button
        type="submit"
        variant="lime"
        disabled={loading || !amount || !paymentMethod || !paymentDetails}
        className="w-full py-6"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <ArrowDownToLine className="h-5 w-5 mr-2" />
        )}
        Demander le retrait
      </Button>

      {/* Confirmation — check rond lime */}
      {celebrate && (
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-ink">
          <CheckRound checked aria-label="Demande envoyée" />
          Demande envoyée ! Tu seras notifié par email.
        </div>
      )}
    </form>
  )
}
