'use client'

import { useState, useEffect } from 'react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Coins, CreditCard } from 'lucide-react'
import { XPValueDisplay } from '@/components/gamification/xp-display'

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
    <Card className="p-6 bg-zinc-900 border-zinc-800">
      <h3 className="text-lg font-bold text-white mb-4">Paiement</h3>
      
      <div className="flex justify-between items-center mb-6">
        <span className="text-zinc-400">Total à payer</span>
        <span className="text-2xl font-black text-white">{totalAmount.toFixed(2)} DH</span>
      </div>

      <div className="space-y-6">
        {/* Toggle XP Payment */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Coins className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-white">Payer avec mes XP</p>
              <p className="text-xs text-emerald-400">Solde : {userXP.toLocaleString()} XP</p>
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
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Utiliser</span>
              <span className="font-bold text-emerald-400">{xpToUse.toLocaleString()} XP</span>
            </div>
            
            <Slider
              value={[xpToUse]}
              max={maxXPAvailable}
              step={10}
              onValueChange={([val]) => setXpToUse(val)}
              className="py-2"
            />
            
            <div className="flex justify-between text-xs text-zinc-500">
              <span>0 XP</span>
              <span>Max: {maxXPAvailable.toLocaleString()} XP</span>
            </div>

import { AnimatedCounter } from '@/components/ui/animated-counter'

// ... (inside component)

            <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
              <span className="text-sm text-emerald-400">Économie réalisée</span>
              <span className="font-bold text-emerald-400">
                -<AnimatedCounter value={discountAmount} suffix=" DH" />
              </span>
            </div>
          </div>
        )}

        {/* Final Summary */}
        <div className="pt-4 border-t border-zinc-700">
          <div className="flex justify-between items-end mb-6">
            <div className="text-zinc-400">
              <p className="text-sm">Reste à payer</p>
              <div className="flex items-center gap-1 text-xs mt-1">
                <CreditCard className="w-3 h-3" />
                via Carte Bancaire
              </div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-white">
                <AnimatedCounter value={finalAmount} suffix=" DH" />
              </span>
              {useXP && (
                <p className="text-xs text-zinc-500 line-through">{totalAmount.toFixed(2)} DH</p>
              )}
            </div>
          </div>

          <Button 
            className="w-full h-12 text-lg font-bold bg-white text-black hover:bg-zinc-200"
            onClick={() => onConfirm(xpToUse, finalAmount)}
          >
            Confirmer le paiement
          </Button>
        </div>
      </div>
    </Card>
  )
}

