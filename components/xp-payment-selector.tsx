"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles, Zap, Info, CheckCircle2 } from "lucide-react"
import {
  xpToDH,
  dhToXP,
  calculateMaxXPUsable,
  calculateHybridPayment,
  formatXP,
  XP_TO_DH_RATE,
  MAX_XP_PAYMENT_PERCENTAGE,
  MIN_XP_FOR_PAYMENT,
} from "@/lib/xp-payment"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface XPPaymentSelectorProps {
  totalPrice: number
  availableXP: number
  onXPAmountChange: (xpAmount: number, dhAmount: number) => void
  disabled?: boolean
}

export function XPPaymentSelector({
  totalPrice,
  availableXP,
  onXPAmountChange,
  disabled = false,
}: XPPaymentSelectorProps) {
  const [xpToUse, setXpToUse] = useState(0)
  const [isEnabled, setIsEnabled] = useState(false)

  const maxXPUsable = calculateMaxXPUsable(totalPrice, availableXP)
  const canUseXP = availableXP >= MIN_XP_FOR_PAYMENT && totalPrice > 0
  const xpValueInDH = xpToDH(availableXP)

  const payment = calculateHybridPayment(totalPrice, xpToUse, availableXP)

  useEffect(() => {
    if (isEnabled) {
      onXPAmountChange(xpToUse, payment.dhAmount)
    } else {
      onXPAmountChange(0, totalPrice)
    }
  }, [xpToUse, isEnabled, totalPrice])

  const handleSliderChange = (value: number[]) => {
    // Round to nearest 10 XP (= 1 DH at the unified peg) for cleaner values.
    const rounded = Math.round(value[0] / 10) * 10
    setXpToUse(Math.min(rounded, maxXPUsable))
  }

  const handleQuickSelect = (percentage: number) => {
    const xpAmount = Math.floor(maxXPUsable * percentage)
    const rounded = Math.round(xpAmount / 10) * 10
    setXpToUse(rounded)
  }

  if (!canUseXP) {
    return (
      <Card className="p-4 bg-card border-ink opacity-60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-mute" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm text-mute">Payer avec mes XP</p>
            <p className="text-xs text-mute">
              {availableXP < MIN_XP_FOR_PAYMENT
                ? `Minimum ${MIN_XP_FOR_PAYMENT} XP requis (vous avez ${formatXP(availableXP)} XP)`
                : "Non disponible"}
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card
      className={`p-4 transition-all ${
        isEnabled
          ? "bg-gradient-to-br from-pink/10 to-pink/10 border-pink/30"
          : "bg-card border-ink"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              isEnabled
                ? "bg-gradient-to-br from-pink to-pink"
                : "bg-card"
            }`}
          >
            <Sparkles
              className={`w-5 h-5 ${isEnabled ? "text-ink" : "text-mute"}`}
            />
          </div>
          <div>
            <p className="font-semibold text-sm">Payer avec mes XP</p>
            <p className="text-xs text-mute">
              Vous avez <span className="text-pink font-bold">{formatXP(availableXP)} XP</span>
              {" "}(≈ {xpValueInDH} DH)
            </p>
          </div>
        </div>

        <Button
          variant={isEnabled ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setIsEnabled(!isEnabled)
            if (!isEnabled) {
              setXpToUse(0)
            }
          }}
          disabled={disabled}
          className={isEnabled ? "bg-pink hover:bg-pink" : ""}
        >
          {isEnabled ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Activé
            </>
          ) : (
            "Activer"
          )}
        </Button>
      </div>

      {isEnabled && (
        <div className="space-y-4 pt-4 border-t border-ink">
          {/* Info Banner */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-pink/10 border border-pink/20">
            <Info className="w-4 h-4 text-pink mt-0.5 flex-shrink-0" />
            <p className="text-xs text-pink">
              {XP_TO_DH_RATE} XP = 1 DH • Maximum {Math.floor(MAX_XP_PAYMENT_PERCENTAGE * 100)}% du total payable en XP
            </p>
          </div>

          {/* Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-mute">XP à utiliser</span>
              <span className="font-bold text-pink">{formatXP(xpToUse)} XP</span>
            </div>

            <Slider
              value={[xpToUse]}
              min={0}
              max={maxXPUsable}
              step={10}
              onValueChange={handleSliderChange}
              disabled={disabled}
              className="py-2"
            />

            <div className="flex justify-between text-xs text-mute">
              <span>0 XP</span>
              <span>{formatXP(maxXPUsable)} XP max</span>
            </div>
          </div>

          {/* Quick Select */}
          <div className="flex gap-2">
            {[0.25, 0.5, 0.75, 1].map((pct) => (
              <Button
                key={pct}
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(pct)}
                disabled={disabled}
                className={`flex-1 text-xs ${
                  xpToUse === Math.round(Math.floor(maxXPUsable * pct) / 10) * 10
                    ? "border-pink bg-pink/10 text-pink"
                    : "border-ink"
                }`}
              >
                {pct * 100}%
              </Button>
            ))}
          </div>

          {/* Payment Breakdown */}
          <div className="space-y-2 pt-3 border-t border-ink">
            <div className="flex justify-between text-sm">
              <span className="text-mute">Valeur XP utilisés</span>
              <span className="text-pink font-medium">-{payment.xpValue} DH</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-mute">Reste à payer</span>
              <span className="font-bold text-ink">{payment.dhAmount} DH</span>
            </div>
          </div>

          {/* XP Balance After */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-card">
            <span className="text-xs text-mute">Solde XP après paiement</span>
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-gold" />
              <span className="font-bold text-sm">{formatXP(availableXP - xpToUse)} XP</span>
            </div>
          </div>

          {!payment.isValid && payment.errorMessage && (
            <p className="text-xs text-destructive">{payment.errorMessage}</p>
          )}
        </div>
      )}
    </Card>
  )
}

/**
 * Compact XP badge to show in price displays
 */
export function XPPaymentBadge({
  availableXP,
  price,
  className,
}: {
  availableXP: number
  price: number
  className?: string
}) {
  const canUseXP = availableXP >= MIN_XP_FOR_PAYMENT
  const maxXPUsable = calculateMaxXPUsable(price, availableXP)
  const maxDiscount = xpToDH(maxXPUsable)

  if (!canUseXP || maxDiscount === 0) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`border-pink/50 text-pink text-[10px] cursor-help ${className}`}
          >
            <Sparkles className="w-2.5 h-2.5 mr-1" />
            Jusqu'à -{maxDiscount} DH en XP
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-card border-ink">
          <p className="text-xs">
            Utilisez vos {formatXP(availableXP)} XP pour réduire le prix
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
