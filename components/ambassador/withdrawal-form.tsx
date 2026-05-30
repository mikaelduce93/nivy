"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Amount */}
      <div className="space-y-2">
        <Label className="text-ink-2">Montant à retirer</Label>
        <div className="relative">
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Min. ${minimumWithdrawal} DH`}
            min={minimumWithdrawal}
            max={availableBalance}
            className="bg-card border-ink text-ink pr-16 focus:border-lime"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-mute font-medium">DH</span>
        </div>
        <p className="text-xs text-mute">
          Disponible: {availableBalance.toLocaleString()} DH
        </p>
      </div>

      {/* Quick amount buttons */}
      <div className="flex gap-2">
        {[100, 200, 500].filter(v => v <= availableBalance).map((value) => (
          <Button
            key={value}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAmount(value.toString())}
            className={`border-ink ${amount === value.toString() ? 'bg-lime/20 border-lime text-lime' : 'text-mute hover:text-ink'}`}
          >
            {value} DH
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAmount(availableBalance.toString())}
          className={`border-ink ${amount === availableBalance.toString() ? 'bg-lime/20 border-lime text-lime' : 'text-mute hover:text-ink'}`}
        >
          Tout
        </Button>
      </div>

      {/* Payment Method */}
      <div className="space-y-2">
        <Label className="text-ink-2">Méthode de paiement</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger className="bg-card border-ink text-ink">
            <SelectValue placeholder="Sélectionner une méthode" />
          </SelectTrigger>
          <SelectContent className="bg-card border-ink">
            <SelectItem value="bank" className="text-ink hover:bg-muted">
              Virement bancaire
            </SelectItem>
            <SelectItem value="cashplus" className="text-ink hover:bg-muted">
              Cash Plus
            </SelectItem>
            <SelectItem value="mobile_wallet" className="text-ink hover:bg-muted">
              Portefeuille mobile
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payment Details */}
      {paymentMethod && (
        <div className="space-y-2">
          <Label className="text-ink-2">
            {paymentMethod === "bank" ? "RIB bancaire" : "Numéro de téléphone"}
          </Label>
          <Input
            type={paymentMethod === "bank" ? "text" : "tel"}
            value={paymentDetails}
            onChange={(e) => setPaymentDetails(e.target.value)}
            placeholder={getPlaceholder()}
            className="bg-card border-ink text-ink focus:border-lime"
          />
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={loading || !amount || !paymentMethod || !paymentDetails}
        className="w-full bg-lime hover:bg-lime text-ink py-6"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <ArrowDownToLine className="h-5 w-5 mr-2" />
        )}
        Demander le retrait
      </Button>

      {/* Info */}
      <p className="text-xs text-mute text-center">
        Les retraits sont traités sous 24-72h selon la méthode choisie.
        Vous serez notifié par email.
      </p>
    </form>
  )
}
