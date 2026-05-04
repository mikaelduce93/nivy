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
      color: "var(--gen-z-coral)",
      icon: "👟"
    },
    {
      id: 2,
      brand: "Megarama",
      offer: "1 place achetée = 1 offerte",
      cost: "1200 XP",
      color: "var(--gen-z-lavender)",
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
          className="group relative border-white/5"
        >
          <div className="flex flex-col h-full justify-between">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl border border-white/10 shadow-inner">
                {deal.icon}
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Cost</span>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <Zap className="w-3 h-3 text-gen-z-yellow" />
                  <span className="text-xs font-black text-white">{deal.cost}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{deal.brand}</p>
              <h4 className="text-lg font-black text-white leading-tight group-hover:text-gen-z-coral transition-colors">
                {deal.offer}
              </h4>
            </div>

            <Button variant="ghost" className="w-full mt-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-[10px] font-black uppercase tracking-widest gap-2 group/btn">
              Unlock Reward
              <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </div>
        </BentoCard>
      ))}
    </div>
  )
}
