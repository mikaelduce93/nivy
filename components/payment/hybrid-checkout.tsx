'use client'

import { useState, useEffect } from 'react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { StickerCard } from '@/components/ui/sticker-card'
import { Switch } from '@/components/ui/switch'
import { Zap, CreditCard } from 'lucide-react'

interface HybridCheckoutProps {
  totalAmount: number // in DH
  userXP: number
  maxXPPercentage?: number // Max % of total allowed to be paid with XP (e.g., 50%)
  onConfirm: (xpAmount: number, cashAmount: number) => void
}

export function HybridCheckout({ 
  totalAmount, 
  userXP, 
  maxXPPercentage = 50,
  onConfirm 
}: HybridCheckoutProps) {
  const [useXP, setUseXP] = useState(false)
  const [xpToUse, setXpToUse] = useState(0)
  
  // Conversion: 1 XP = 0.10 DH
  const XP_RATE = 0.10
  
  // Calculate max XP usable for this transaction
  const maxXPAllowed = (totalAmount * (maxXPPercentage / 100)) / XP_RATE
  const maxXPAvailable = Math.min(userXP, maxXPAllowed)
  
  useEffect(() => {
    if (useXP) {
      // Default to max available when enabled
      setXpToUse(maxXPAvailable)
    } else {
      setXpToUse(0)
    }
  }, [useXP, maxXPAvailable])

  const discountAmount = xpToUse * XP_RATE
  const finalAmount = totalAmount - discountAmount

  return (
    <StickerCard className="p-6">
      <span className="eyebrow tracking-[0.16em] text-mute">Paiement</span>

      <div className="mt-3 flex justify-between items-center mb-6">
        <span className="text-mute">Total à payer</span>
        <span className="font-display text-2xl font-extrabold tabular-nums text-ink">
          {totalAmount.toFixed(2)} <span className="font-mono text-base font-medium text-mute">DH</span>
        </span>
      </div>

      <div className="space-y-6">
        {/* Toggle XP Payment */}
        <div className="flex items-center justify-between p-4 rounded-xl border-2 border-ink bg-paper-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border-2 border-ink bg-white flex items-center justify-center">
              <Zap className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="font-display font-bold text-ink">Payer avec mes XP</p>
              <p className="font-mono text-xs tabular-nums text-gold">
                Solde : {userXP.toLocaleString()} XP
              </p>
            </div>
          </div>
          <Switch
            checked={useXP}
            onCheckedChange={setUseXP}
            disabled={userXP === 0}
          />
        </div>

        {/* XP Slider */}
        {useXP && (
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-mute">Utiliser</span>
              <span className="font-mono font-bold tabular-nums text-gold">
                {xpToUse.toLocaleString()} XP
              </span>
            </div>

            <Slider
              value={[xpToUse]}
              max={maxXPAvailable}
              step={10}
              onValueChange={([val]) => setXpToUse(val)}
              className="py-2 [&_[data-slot=slider-range]]:bg-pink [&_[data-slot=slider-thumb]]:border-pink"
            />

            <div className="flex justify-between font-mono text-xs tabular-nums text-mute">
              <span>0 XP</span>
              <span>Max : {maxXPAvailable.toLocaleString()} XP</span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t-2 border-ink">
              <span className="text-sm text-lime">Économie réalisée</span>
              <span className="font-mono font-bold tabular-nums text-lime">
                −{discountAmount.toFixed(2)} DH
              </span>
            </div>
          </div>
        )}

        {/* Final Summary */}
        <div className="pt-4 border-t-2 border-ink">
          <div className="flex justify-between items-end mb-6">
            <div className="text-mute">
              <p className="text-sm">Reste à payer</p>
              <div className="flex items-center gap-1 text-xs mt-1">
                <CreditCard className="w-3 h-3" />
                via Carte Bancaire
              </div>
            </div>
            <div className="text-right">
              <span className="font-display text-3xl font-extrabold tabular-nums text-ink">
                {finalAmount.toFixed(2)} <span className="font-mono text-base font-medium text-mute">DH</span>
              </span>
              {useXP && (
                <p className="font-mono text-xs tabular-nums text-mute line-through">
                  {totalAmount.toFixed(2)} DH
                </p>
              )}
            </div>
          </div>

          <Button
            variant="pink"
            className="w-full h-12 text-lg font-bold"
            onClick={() => onConfirm(xpToUse, finalAmount)}
          >
            Confirmer le paiement
          </Button>
        </div>
      </div>
    </StickerCard>
  )
}

