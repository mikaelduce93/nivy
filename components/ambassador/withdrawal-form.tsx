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

export function WithdrawalForm({ ambassadorId, availableBalance, minimumWithdrawal }: WithdrawalFormProps) {
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
          ambassadorId,
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
        <Label className="text-zinc-300">Montant à retirer</Label>
        <div className="relative">
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Min. ${minimumWithdrawal} DH`}
            min={minimumWithdrawal}
            max={availableBalance}
            className="bg-zinc-800 border-zinc-700 text-white pr-16 focus:border-emerald-500"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">DH</span>
        </div>
        <p className="text-xs text-zinc-500">
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
            className={`border-zinc-700 ${amount === value.toString() ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'text-zinc-400 hover:text-white'}`}
          >
            {value} DH
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAmount(availableBalance.toString())}
          className={`border-zinc-700 ${amount === availableBalance.toString() ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'text-zinc-400 hover:text-white'}`}
        >
          Tout
        </Button>
      </div>

      {/* Payment Method */}
      <div className="space-y-2">
        <Label className="text-zinc-300">Méthode de paiement</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
            <SelectValue placeholder="Sélectionner une méthode" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="bank" className="text-white hover:bg-zinc-700">
              Virement bancaire
            </SelectItem>
            <SelectItem value="cashplus" className="text-white hover:bg-zinc-700">
              Cash Plus
            </SelectItem>
            <SelectItem value="mobile_wallet" className="text-white hover:bg-zinc-700">
              Portefeuille mobile
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payment Details */}
      {paymentMethod && (
        <div className="space-y-2">
          <Label className="text-zinc-300">
            {paymentMethod === "bank" ? "RIB bancaire" : "Numéro de téléphone"}
          </Label>
          <Input
            type={paymentMethod === "bank" ? "text" : "tel"}
            value={paymentDetails}
            onChange={(e) => setPaymentDetails(e.target.value)}
            placeholder={getPlaceholder()}
            className="bg-zinc-800 border-zinc-700 text-white focus:border-emerald-500"
          />
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={loading || !amount || !paymentMethod || !paymentDetails}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <ArrowDownToLine className="h-5 w-5 mr-2" />
        )}
        Demander le retrait
      </Button>

      {/* Info */}
      <p className="text-xs text-zinc-500 text-center">
        Les retraits sont traités sous 24-72h selon la méthode choisie.
        Vous serez notifié par email.
      </p>
    </form>
  )
}
