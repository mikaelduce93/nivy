"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Smartphone, CheckCircle2, Copy, Clock, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { MobileMoneyOperator } from "@/lib/payments/mobile-money"

interface MobileMoneyPaymentProps {
  bookingId: string
  amount: number
  xpUsed?: number
  onSuccess?: () => void
  onCancel?: () => void
}

interface OperatorOption {
  id: MobileMoneyOperator
  name: string
  color: string
  logo?: string
}

const OPERATORS: OperatorOption[] = [
  {
    id: "orange_money",
    name: "Orange Money",
    color: "#FF6600",
  },
  {
    id: "inwi_money",
    name: "inwi Money",
    color: "#E30613",
  },
  {
    id: "maroc_telecom_cash",
    name: "MT Cash",
    color: "#0064B5",
  },
]

export function MobileMoneyPayment({
  bookingId,
  amount,
  xpUsed,
  onSuccess,
  onCancel,
}: MobileMoneyPaymentProps) {
  const [selectedOperator, setSelectedOperator] = useState<MobileMoneyOperator | null>(null)
  const [phone, setPhone] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [paymentData, setPaymentData] = useState<{
    code: string
    instructions: string
    expiresAt: string
    operator: { name: string; color: string; ussdCode: string }
  } | null>(null)

  const handleInitiate = async () => {
    if (!selectedOperator || !phone) {
      toast.error("Veuillez sélectionner un opérateur et entrer votre numéro")
      return
    }

    // Validate phone format
    const cleanPhone = phone.replace(/\s+/g, "")
    if (!/^0[67][0-9]{8}$/.test(cleanPhone)) {
      toast.error("Numéro de téléphone invalide. Format: 06XXXXXXXX ou 07XXXXXXXX")
      return
    }

    setIsProcessing(true)

    try {
      const response = await fetch("/api/payments/mobile-money/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          operator: selectedOperator,
          phone: cleanPhone,
          amount,
          xpUsed,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'initiation")
      }

      setPaymentData({
        code: data.code,
        instructions: data.instructions,
        expiresAt: data.expiresAt,
        operator: data.operator,
      })
      setShowInstructions(true)
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'initiation du paiement")
    } finally {
      setIsProcessing(false)
    }
  }

  const copyCode = () => {
    if (paymentData?.code) {
      navigator.clipboard.writeText(paymentData.code)
      toast.success("Code copié!")
    }
  }

  const handlePaymentDone = () => {
    toast.info("Nous vérifions votre paiement...")
    // In real implementation, would poll for payment status
    // For now, just redirect
    onSuccess?.()
  }

  return (
    <div className="space-y-6">
      {/* Operator Selection */}
      <div className="space-y-3">
        <Label>Sélectionnez votre opérateur</Label>
        <div className="grid grid-cols-3 gap-3">
          {OPERATORS.map((op) => (
            <Card
              key={op.id}
              className={`p-4 cursor-pointer transition-all ${
                selectedOperator === op.id
                  ? "ring-2 ring-offset-2 ring-offset-background"
                  : "border-zinc-800 hover:border-zinc-700"
              }`}
              style={{
                borderColor: selectedOperator === op.id ? op.color : undefined,
                // @ts-expect-error CSS custom property for ring color
                "--tw-ring-color": selectedOperator === op.id ? op.color : undefined,
              }}
              onClick={() => setSelectedOperator(op.id)}
            >
              <div className="text-center">
                <div
                  className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center"
                  style={{ backgroundColor: `${op.color}20` }}
                >
                  <Smartphone className="w-5 h-5" style={{ color: op.color }} />
                </div>
                <p className="font-semibold text-sm" style={{ color: op.color }}>
                  {op.name}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Phone Number Input */}
      <div className="space-y-2">
        <Label htmlFor="phone">Numéro de téléphone</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="06XXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="bg-zinc-900 border-zinc-800"
          maxLength={10}
        />
        <p className="text-xs text-zinc-500">
          Numéro associé à votre compte {selectedOperator ? OPERATORS.find(o => o.id === selectedOperator)?.name : "Mobile Money"}
        </p>
      </div>

      {/* Amount Display */}
      <Card className="p-4 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
        <div className="flex justify-between items-center">
          <span className="text-zinc-400">Montant à payer</span>
          <span className="text-2xl font-bold text-white">{amount} DH</span>
        </div>
      </Card>

      {/* Initiate Button */}
      <Button
        onClick={handleInitiate}
        disabled={!selectedOperator || !phone || isProcessing}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Génération du code...
          </>
        ) : (
          <>
            <Smartphone className="w-5 h-5 mr-2" />
            Générer le code de paiement
          </>
        )}
      </Button>

      {/* Instructions Dialog */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" style={{ color: paymentData?.operator.color }} />
              Instructions {paymentData?.operator.name}
            </DialogTitle>
            <DialogDescription>
              Suivez ces étapes pour finaliser votre paiement
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Payment Code */}
            <div className="p-4 rounded-lg bg-zinc-800 text-center">
              <p className="text-xs text-zinc-500 uppercase mb-2">Code de paiement</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl font-mono font-bold tracking-wider">
                  {paymentData?.code}
                </span>
                <Button variant="ghost" size="icon" onClick={copyCode}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Expiry */}
            {paymentData?.expiresAt && (
              <div className="flex items-center justify-center gap-2 text-sm text-yellow-500">
                <Clock className="w-4 h-4" />
                <span>
                  Expire dans 30 minutes
                </span>
              </div>
            )}

            {/* Instructions */}
            <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800">
              <div className="prose prose-sm prose-invert max-w-none">
                {paymentData?.instructions.split('\n').map((line, i) => (
                  <p key={i} className="text-sm text-zinc-300 mb-1">
                    {line}
                  </p>
                ))}
              </div>
            </div>

            {/* Important Note */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-300">
                Conservez ce code. Vous recevrez un SMS de confirmation une fois le paiement effectué.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowInstructions(false)}
            >
              Annuler
            </Button>
            <Button
              className="flex-1"
              onClick={handlePaymentDone}
              style={{
                backgroundColor: paymentData?.operator.color,
              }}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              J'ai payé
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
