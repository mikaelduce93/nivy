'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Award } from 'lucide-react'

interface VIPPricePreviewProps {
  basePrice: string
  currency?: string
}

const VIP_LEVELS = [
  { type: 'silver', name: 'Silver', discount: 10, color: 'text-gray-300', bgColor: 'bg-gray-500/20', borderColor: 'border-gray-500/30' },
  { type: 'gold', name: 'Gold', discount: 20, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500/30' },
  { type: 'platinum', name: 'Platinum', discount: 30, color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/30' },
]

export default function VIPPricePreview({ basePrice, currency = 'DH' }: VIPPricePreviewProps) {
  const price = parseFloat(basePrice) || 0

  if (price <= 0) {
    return null
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Aperçu de la tarification
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Prix calculés automatiquement selon le niveau VIP
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Prix Standard */}
        <div className="flex justify-between items-center p-3 bg-zinc-950 rounded-lg">
          <span className="text-zinc-300 flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-400" />
            Standard (sans carte VIP)
          </span>
          <span className="font-bold text-white">
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
        <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <p className="text-xs text-cyan-400">
            💡 Les codes promo ambassadeur s'appliquent en plus de la réduction VIP
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
