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
  // #46 — Stripe is gated too (the gateway may be unconfigured); off at launch.
  const stripeEnabled = useFeatureFlag('stripe_payment', false)
  const cmiEnabled = useFeatureFlag('cmi_payment', false)
  const mobileMoneyEnabled = useFeatureFlag('mobile_money_payment', false)

  // #46 — never leave a disabled method selected (Stripe was the hardcoded
  // default). Fall back to the first actually-available method.
  useEffect(() => {
    const available = [
      stripeEnabled && 'stripe',
      cmiEnabled && 'cmi',
      mobileMoneyEnabled && 'mobile',
      'cash',
    ].filter(Boolean) as Array<'stripe' | 'cmi' | 'mobile' | 'cash'>
    if (!available.includes(selectedMethod)) {
      setSelectedMethod(available[0])
    }
  }, [stripeEnabled, cmiEnabled, mobileMoneyEnabled, selectedMethod])

  useEffect(() => {
    async function fetchBooking() {
      const supabase = createClient()
      // #42 — booking_tickets relation doesn't exist in the live schema.
      const { data } = await supabase
        .from('bookings')
        .select('*')
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
            teenId,
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
        case 'stripe': {
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
        }

        case 'cmi':
          // Redirect to CMI payment gateway
          window.location.href = `/api/payments/cmi/initiate?booking=${bookingId}&amount=${dhToPay}&xp=${xpToUse}`
          break

        case 'mobile':
          // Show mobile money flow
          setShowMobileMoney(true)
          setIsProcessing(false)
          return

        case 'cash': {
          // #42 — real route is /api/payments/cash/create (cash/register never existed).
          const cashResponse = await fetch('/api/payments/cash/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId }),
          })

          if (cashResponse.ok) {
            toast.success('Réservation enregistrée. Payez chez un ambassadeur.')
            window.location.href = `/reservation/confirmation?booking=${bookingId}&method=cash`
          }
          break
        }
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
      color: 'text-teal',
      enabled: stripeEnabled, // #46 — gated; not unconditional
    },
    {
      id: 'cmi' as const,
      name: 'CMI',
      description: 'Cartes marocaines',
      icon: CreditCard,
      color: 'text-lime',
      enabled: cmiEnabled,
    },
    {
      id: 'mobile' as const,
      name: 'Mobile Money',
      description: 'Orange, inwi, Maroc Telecom',
      icon: Smartphone,
      color: 'text-pink',
      enabled: mobileMoneyEnabled,
    },
    {
      id: 'cash' as const,
      name: 'Cash ambassadeur',
      description: 'Paiement en espèces',
      icon: Wallet,
      color: 'text-coral',
      enabled: true, // Cash toujours disponible
    },
  ].filter((method) => method.enabled) // Filtrer les méthodes non activées

  const actualTotalAmount = bookingData?.total_amount || totalAmount
  const childTeenId = teenId

  // Show Mobile Money flow
  if (showMobileMoney) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => setShowMobileMoney(false)}
          className="text-mute hover:text-ink"
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
          <h3 className="text-sm font-semibold text-mute flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink" />
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
          {/* #46 — fallback notice when no card rail is active (Stripe/CMI off). */}
          {!stripeEnabled && !cmiEnabled && (
            <div className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm text-gold">
              Le paiement par carte (Stripe / CMI) sera activé prochainement. En
              attendant, règle ta réservation via <strong>Cash ambassadeur</strong>
              {mobileMoneyEnabled ? " ou Mobile Money" : ""}.
            </div>
          )}
          <h3 className="text-sm font-semibold text-mute">
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
                      : 'border-ink hover:border-ink'
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
      <Card className="p-4 bg-gradient-to-br from-paper-2 to-card border-ink">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-mute">Total</span>
            <span className="text-ink">{actualTotalAmount} DH</span>
          </div>
          {xpToUse > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-pink">Réduction XP ({xpToUse} XP)</span>
              <span className="text-pink">-{actualTotalAmount - dhToPay} DH</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-ink">
            <span className="text-ink">À payer</span>
            <span className="text-teal">{dhToPay} DH</span>
          </div>
        </div>
      </Card>

      {/* Pay Button */}
      <Button
        onClick={handlePayment}
        disabled={isProcessing}
        className="w-full bg-gradient-to-r from-teal to-teal hover:from-teal hover:to-teal text-ink border-0 text-lg py-6"
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
