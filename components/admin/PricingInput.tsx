'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Star, Crown, Users } from 'lucide-react'

interface PricingInputProps {
  priceStandard: string
  priceVip: string
  pricePremium: string
  onStandardChange: (value: string) => void
  onVipChange: (value: string) => void
  onPremiumChange: (value: string) => void
  currency?: string
  label?: string
}

export default function PricingInput({
  priceStandard,
  priceVip,
  pricePremium,
  onStandardChange,
  onVipChange,
  onPremiumChange,
  currency = 'DH',
  label = 'Tarification'
}: PricingInputProps) {
  // Calculer automatiquement les réductions suggérées
  const suggestVipPrice = () => {
    if (priceStandard) {
      const standard = parseFloat(priceStandard)
      const suggested = (standard * 0.8).toFixed(2)
      onVipChange(suggested)
    }
  }

  const suggestPremiumPrice = () => {
    if (priceStandard) {
      const standard = parseFloat(priceStandard)
      const suggested = (standard * 0.7).toFixed(2)
      onPremiumChange(suggested)
    }
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          {label}
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Définissez les prix pour chaque type de compte utilisateur
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Prix Standard */}
        <div className="space-y-2">
          <Label htmlFor="price-standard" className="text-zinc-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            Prix Standard ({currency}) <span className="text-red-400">*</span>
          </Label>
          <Input
            id="price-standard"
            type="number"
            min="0"
            step="0.01"
            value={priceStandard}
            onChange={(e) => onStandardChange(e.target.value)}
            placeholder="150.00"
            className="bg-zinc-950 border-zinc-700 text-white"
            required
          />
          <p className="text-xs text-zinc-500">Prix pour les utilisateurs sans abonnement</p>
        </div>

        {/* Prix VIP */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="price-vip" className="text-zinc-300 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              Prix VIP ({currency}) <span className="text-red-400">*</span>
            </Label>
            <button
              type="button"
              onClick={suggestVipPrice}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              -20% suggéré
            </button>
          </div>
          <Input
            id="price-vip"
            type="number"
            min="0"
            step="0.01"
            value={priceVip}
            onChange={(e) => onVipChange(e.target.value)}
            placeholder="120.00"
            className="bg-zinc-950 border-zinc-700 text-white border-yellow-500/30"
            required
          />
          <p className="text-xs text-zinc-500">
            Prix pour les membres avec carte VIP (réduction recommandée : 20%)
          </p>
        </div>

        {/* Prix Premium */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="price-premium" className="text-zinc-300 flex items-center gap-2">
              <Crown className="w-4 h-4 text-purple-400" />
              Prix Premium ({currency}) <span className="text-red-400">*</span>
            </Label>
            <button
              type="button"
              onClick={suggestPremiumPrice}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              -30% suggéré
            </button>
          </div>
          <Input
            id="price-premium"
            type="number"
            min="0"
            step="0.01"
            value={pricePremium}
            onChange={(e) => onPremiumChange(e.target.value)}
            placeholder="105.00"
            className="bg-zinc-950 border-zinc-700 text-white border-purple-500/30"
            required
          />
          <p className="text-xs text-zinc-500">
            Prix pour les membres Premium/Platinum (réduction recommandée : 30%)
          </p>
        </div>

        {/* Aperçu des prix */}
        {priceStandard && priceVip && pricePremium && (
          <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <p className="text-sm font-semibold text-cyan-400 mb-2">Aperçu de la tarification :</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-zinc-300">
                <span className="flex items-center gap-2">
                  <Users className="w-3 h-3 text-blue-400" />
                  Standard
                </span>
                <span className="font-semibold">{parseFloat(priceStandard).toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between text-yellow-300">
                <span className="flex items-center gap-2">
                  <Star className="w-3 h-3 text-yellow-400" />
                  VIP
                </span>
                <span className="font-semibold">
                  {parseFloat(priceVip).toFixed(2)} {currency}
                  <span className="text-xs ml-2 text-yellow-400">
                    (-{Math.round((1 - parseFloat(priceVip) / parseFloat(priceStandard)) * 100)}%)
                  </span>
                </span>
              </div>
              <div className="flex justify-between text-purple-300">
                <span className="flex items-center gap-2">
                  <Crown className="w-3 h-3 text-purple-400" />
                  Premium
                </span>
                <span className="font-semibold">
                  {parseFloat(pricePremium).toFixed(2)} {currency}
                  <span className="text-xs ml-2 text-purple-400">
                    (-{Math.round((1 - parseFloat(pricePremium) / parseFloat(priceStandard)) * 100)}%)
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
