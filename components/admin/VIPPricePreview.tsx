'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Award } from 'lucide-react'

interface VIPPricePreviewProps {
  basePrice: string
  currency?: string
}

const VIP_LEVELS = [
  { type: 'silver', name: 'Silver', discount: 10, color: 'text-ink-2', bgColor: 'bg-muted', borderColor: 'border-line' },
  { type: 'gold', name: 'Gold', discount: 20, color: 'text-gold', bgColor: 'bg-gold/20', borderColor: 'border-gold/30' },
  { type: 'platinum', name: 'Platinum', discount: 30, color: 'text-pink', bgColor: 'bg-pink/20', borderColor: 'border-pink/30' },
]

export default function VIPPricePreview({ basePrice, currency = 'DH' }: VIPPricePreviewProps) {
  const price = parseFloat(basePrice) || 0

  if (price <= 0) {
    return null
  }

  return (
    <Card className="bg-card border-ink">
      <CardHeader>
        <CardTitle className="text-ink flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Aperçu de la tarification
        </CardTitle>
        <CardDescription className="text-mute">
          Prix calculés automatiquement selon le niveau VIP
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Prix Standard */}
        <div className="flex justify-between items-center p-3 bg-background rounded-lg">
          <span className="text-ink-2 flex items-center gap-2">
            <Award className="w-4 h-4 text-teal" />
            Standard (sans carte VIP)
          </span>
          <span className="font-bold text-ink">
            {price.toFixed(2)} {currency}
          </span>
        </div>

        {/* Prix VIP */}
        {VIP_LEVELS.map((level) => {
          const discountedPrice = price * (1 - level.discount / 100)
          return (
            <div
              key={level.type}
              className={`flex justify-between items-center p-3 rounded-lg ${level.bgColor} border ${level.borderColor}`}
            >
              <span className={`flex items-center gap-2 ${level.color} font-semibold`}>
                <Award className="w-4 h-4" />
                {level.name} VIP
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${level.color} font-medium`}>
                  -{level.discount}%
                </span>
                <span className={`font-bold ${level.color}`}>
                  {discountedPrice.toFixed(2)} {currency}
                </span>
              </div>
            </div>
          )
        })}

        {/* Note sur les codes promo */}
        <div className="mt-4 p-3 bg-teal/10 border border-teal/30 rounded-lg">
          <p className="text-xs text-teal">
            💡 Les codes promo ambassadeur s'appliquent en plus de la réduction VIP
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
