'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditCard, Smartphone, Wallet, CheckCircle2, Loader2, Sparkles, ArrowLeft } from 'lucide-react'
import { XPPaymentSelector } from '@/components/xp-payment-selector'
import { MobileMoneyPayment } from '@/components/mobile-money-payment'
import { useXP } from '@/lib/hooks/use-gamification'
import { createClient } from '@/lib/supabase/client'
import { useFeatureFlag } from '@/lib/features/use-feature-flag'
import { toast } from 'sonner'

interface PaymentMethodSelectorProps {
  bookingId: string
  totalAmount?: number
  teenId?: string
}

export function PaymentMethodSelector({ bookingId, totalAmount = 0, teenId }: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'cmi' | 'mobile' | 'cash'>('stripe')
  const [xpToUse, setXpToUse] = useState(0)
  const [dhToPay, setDhToPay] = useState(totalAmount)
  const [isProcessing, setIsProcessing] = useState(false)
  const [bookingData, setBookingData] = useState<any>(null)
  const [showMobileMoney, setShowMobileMoney] = useState(false)

  // Fetch booking data and teen's XP
  const { xp, loading: xpLoading } = useXP(teenId)

  // Feature flags pour les méthodes de paiement
  const cmiEnabled = useFeatureFlag('cmi_payment', false)
  const mobileMoneyEnabled = useFeatureFlag('mobile_money_payment', false)

  useEffect(() => {
    async function fetchBooking() {
      const supabase = createClient()
      const { data } = await supabase
        .from('bookings')
        .select(`
          *,
          booking_tickets (child_id)
        `)
        .eq('id', bookingId)
        .single()

      if (data) {
        setBookingData(data)
        setDhToPay(data.total_amount)
      }
    }
    fetchBooking()
  }, [bookingId])

  const handleXPAmountChange = (xpAmount: number, dhAmount: number) => {
    setXpToUse(xpAmount)
    setDhToPay(dhAmount)
  }

  const handlePayment = async () => {
    if (isProcessing) return
    setIsProcessing(true)

    try {
      // First process XP payment if any
      if (xpToUse > 0) {
        const xpResponse = await fetch('/api/payments/xp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId,
            xpAmount: xpToUse,
            teenId: bookingData?.booking_tickets?.[0]?.child_id || teenId,
          }),
        })

        if (!xpResponse.ok) {
          const error = await xpResponse.json()
          throw new Error(error.error || 'Erreur lors du paiement XP')
        }
      }

      // If no DH to pay, booking is complete
      if (dhToPay === 0) {
        toast.success('Paiement XP effectué avec succès!')
        window.location.href = `/reservation/confirmation?booking=${bookingId}`
        return
      }

      // Otherwise, proceed with selected payment method
      switch (selectedMethod) {
        case 'stripe':
          const stripeResponse = await fetch('/api/payments/stripe/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingId,
              amount: dhToPay,
              xpUsed: xpToUse,
            }),
          })

          if (!stripeResponse.ok) {
            throw new Error('Erreur lors de la création de la session Stripe')
          }

          const { url } = await stripeResponse.json()
          window.location.href = url
          break

        case 'cmi':
          // Redirect to CMI payment gateway
          window.location.href = `/api/payments/cmi/initiate?booking=${bookingId}&amount=${dhToPay}&xp=${xpToUse}`
          break

        case 'mobile':
          // Show mobile money flow
          setShowMobileMoney(true)
          setIsProcessing(false)
          return

        case 'cash':
          // Register cash payment intent
          const cashResponse = await fetch('/api/payments/cash/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingId,
              amount: dhToPay,
              xpUsed: xpToUse,
            }),
          })

          if (cashResponse.ok) {
            toast.success('Réservation enregistrée. Payez chez un ambassadeur.')
            window.location.href = `/reservation/confirmation?booking=${bookingId}&method=cash`
          }
          break
      }
    } catch (error: any) {
      console.error('Payment error:', error)
      toast.error(error.message || 'Erreur lors du paiement')
    } finally {
      setIsProcessing(false)
    }
  }

  const paymentMethods = [
    {
      id: 'stripe' as const,
      name: 'Carte bancaire',
      description: 'Visa, Mastercard',
      icon: CreditCard,
      color: 'text-blue-500',
      enabled: true, // Stripe toujours disponible
    },
    {
      id: 'cmi' as const,
      name: 'CMI',
      description: 'Cartes marocaines',
      icon: CreditCard,
      color: 'text-green-500',
      enabled: cmiEnabled,
    },
    {
      id: 'mobile' as const,
      name: 'Mobile Money',
      description: 'Orange, inwi, Maroc Telecom',
      icon: Smartphone,
      color: 'text-purple-500',
      enabled: mobileMoneyEnabled,
    },
    {
      id: 'cash' as const,
      name: 'Cash ambassadeur',
      description: 'Paiement en espèces',
      icon: Wallet,
      color: 'text-orange-500',
      enabled: true, // Cash toujours disponible
    },
  ].filter((method) => method.enabled) // Filtrer les méthodes non activées

  const actualTotalAmount = bookingData?.total_amount || totalAmount
  const childTeenId = bookingData?.booking_tickets?.[0]?.child_id || teenId

  // Show Mobile Money flow
  if (showMobileMoney) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => setShowMobileMoney(false)}
          className="text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux modes de paiement
        </Button>
        <MobileMoneyPayment
          bookingId={bookingId}
          amount={dhToPay}
          xpUsed={xpToUse}
          onSuccess={() => {
            window.location.href = `/reservation/confirmation?booking=${bookingId}&method=mobile`
          }}
          onCancel={() => setShowMobileMoney(false)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* XP Payment Option */}
      {childTeenId && !xpLoading && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Réduction XP
          </h3>
          <XPPaymentSelector
            totalPrice={actualTotalAmount}
            availableXP={xp?.total_xp || 0}
            onXPAmountChange={handleXPAmountChange}
            disabled={isProcessing}
          />
        </div>
      )}

      {/* Payment Methods */}
      {dhToPay > 0 && (
        <>
          <h3 className="text-sm font-semibold text-zinc-400">
            Mode de paiement {xpToUse > 0 && `(${dhToPay} DH restants)`}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {paymentMethods.map((method) => {
              const Icon = method.icon
              const isSelected = selectedMethod === method.id
              return (
                <Card
                  key={method.id}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-zinc-800 hover:border-zinc-700'
                  } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => !isProcessing && setSelectedMethod(method.id)}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-6 h-6 ${method.color}`} />
                    <div className="flex-1">
                      <p className="font-semibold text-sm mb-0.5">{method.name}</p>
                      <p className="text-xs text-muted-foreground">{method.description}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Payment Summary */}
      <Card className="p-4 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Total</span>
            <span className="text-white">{actualTotalAmount} DH</span>
          </div>
          {xpToUse > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-purple-400">Réduction XP ({xpToUse} XP)</span>
              <span className="text-purple-400">-{actualTotalAmount - dhToPay} DH</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-zinc-800">
            <span className="text-white">À payer</span>
            <span className="text-cyan-400">{dhToPay} DH</span>
          </div>
        </div>
      </Card>

      {/* Pay Button */}
      <Button
        onClick={handlePayment}
        disabled={isProcessing}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 text-lg py-6"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Traitement en cours...
          </>
        ) : dhToPay === 0 ? (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            Payer avec mes XP
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            Payer {dhToPay} DH
          </>
        )}
      </Button>
    </div>
  )
}
