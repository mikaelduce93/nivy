"use client"

import { Zap, ArrowRight } from "lucide-react"
import { BentoCard } from "@/components/ui/bento-grid"
import { Button } from "@/components/ui/button"

export function MarketplaceOverlay() {
  const deals = [
    {
      id: 1,
      brand: "Nike Morocco",
      offer: "-20% sur la collection Jordan",
      cost: "500 XP",
      color: "var(--accent-soft)",
      icon: "👟"
    },
    {
      id: 2,
      brand: "Megarama",
      offer: "1 place achetée = 1 offerte",
      cost: "1200 XP",
      color: "var(--brand-soft)",
      icon: "🎬"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {deals.map((deal) => (
        <BentoCard 
          key={deal.id}
          cols={1}
          rows={1}
          variant="glass"
          tiltIntensity={10}
          className="group relative border-ink"
        >
          <div className="flex flex-col h-full justify-between">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-paper-2 flex items-center justify-center text-2xl border border-ink shadow-inner">
                {deal.icon}
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-mute uppercase tracking-widest mb-1">Cost</span>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper-2 border border-ink">
                  <Zap className="w-3 h-3 text-gold" />
                  <span className="text-xs font-black text-ink">{deal.cost}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-black text-mute uppercase tracking-[0.2em]">{deal.brand}</p>
              <h4 className="text-lg font-black text-ink leading-tight group-hover:text-accent-soft transition-colors">
                {deal.offer}
              </h4>
            </div>

            <Button variant="ghost" className="w-full mt-4 rounded-xl bg-paper-2 border border-ink hover:bg-paper-2 hover:border-ink text-[10px] font-black uppercase tracking-widest gap-2 group/btn">
              Unlock Reward
              <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </div>
        </BentoCard>
      ))}
    </div>
  )
}
