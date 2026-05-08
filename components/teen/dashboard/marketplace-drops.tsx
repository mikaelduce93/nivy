"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Zap, Timer, ArrowRight, ShoppingBag } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const DROPS = [
  {
    id: 1,
    brand: "McDonald's",
    offer: "Crew Menu -30%",
    cost: 200,
    timeLeft: "2h 15m",
    color: "var(--accent-soft)",
    image: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400&h=400&fit=crop"
  },
  {
    id: 2,
    brand: "Virgin Megastore",
    offer: "Gaming Pass 24h",
    cost: 500,
    timeLeft: "5h 40m",
    color: "var(--brand-soft)",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=400&fit=crop"
  }
]

export function MarketplaceDrops() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
      {DROPS.map((drop, idx) => (
        <motion.div
          key={drop.id}
          initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="group relative overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[3rem] bg-zinc-900 border border-white/5 shadow-2xl"
        >
          {/* Image Background */}
          <div className="absolute inset-0 z-0">
            <Image
              src={drop.image}
              alt={drop.brand}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover opacity-20 grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
          </div>

          <div className="relative z-10 p-5 sm:p-7 md:p-10 h-full flex flex-col justify-between space-y-6 sm:space-y-8 md:space-y-12">
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-1.5 sm:space-y-2 min-w-0">
                <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md">
                  <Timer className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-accent-soft shrink-0" />
                  <span className="text-[7px] sm:text-[8px] font-black text-white uppercase tracking-widest truncate">{drop.timeLeft} LEFT</span>
                </div>
                <h3 className="text-xs sm:text-sm font-black text-zinc-500 uppercase tracking-[0.2em] sm:tracking-[0.3em] truncate">{drop.brand}</h3>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-2 bg-black/40 backdrop-blur-xl px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-white/10">
                  <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-gen-z-yellow fill-current" />
                  <span className="font-black text-white text-xs sm:text-base">{drop.cost} XP</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              <h4 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tighter uppercase italic leading-none">
                {drop.offer}
              </h4>
              
              <Button className="w-full h-12 sm:h-14 md:h-16 rounded-xl sm:rounded-2xl bg-white text-black font-black text-sm sm:text-base md:text-lg hover:scale-[1.02] transition-all group/btn">
                <span className="hidden sm:inline">COOPERATIVE UNLOCK</span>
                <span className="sm:hidden">UNLOCK</span>
                <ArrowRight className="ml-1.5 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
