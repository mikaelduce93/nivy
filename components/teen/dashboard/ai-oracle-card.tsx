"use client"

import { motion } from "framer-motion"
import { Sparkles, Brain, Zap, Target, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function AIOracleCard() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-[3rem] p-[2px] bg-gradient-to-br from-brand-soft via-info-soft to-success-soft shadow-[0_30px_80px_rgba(139,92,246,0.3)]"
    >
      <div className="relative h-full w-full bg-background rounded-[2.9rem] overflow-hidden p-10 flex flex-col md:flex-row items-center gap-10">
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-soft/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-success-soft/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Oracle Visual */}
        <div className="relative shrink-0">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="w-32 h-32 md:w-40 md:h-40 rounded-[3rem] bg-gradient-to-br from-white/10 to-transparent border border-ink flex items-center justify-center shadow-2xl "
          >
            <Sparkles className="w-16 h-16 text-ink animate-pulse" />
          </motion.div>
          
          {/* Floating Badges */}
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute -top-4 -right-4 w-12 h-12 rounded-2xl bg-brand-soft flex items-center justify-center border-4 border-ink shadow-xl"
          >
            <Brain className="w-6 h-6 text-ink" />
          </motion.div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 text-center md:text-left relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-paper-2 text-ink text-[10px] font-black tracking-[0.3em] uppercase border border-ink ">
              AI ORACLE PREDICTION
            </div>
            <h3 className="text-4xl md:text-5xl font-black text-ink tracking-tighter uppercase italic leading-none">
              Balance thy <span className="text-gen-z-gradient">Inner Pillars.</span>
            </h3>
          </div>
          
          <p className="text-mute text-lg font-medium leading-relaxed max-w-xl">
            Tu as dominé les quêtes Intellect cette semaine. Ton pilier <span className="text-gen-z-lime font-bold">Vitalité</span> est en retard. Active ce défi de 15 min pour débloquer ton aura.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex items-center gap-3 bg-paper-2 px-6 py-3 rounded-2xl border border-ink">
              <Zap className="w-5 h-5 text-gen-z-yellow fill-current" />
              <span className="font-black text-ink text-xl">+250 XP</span>
            </div>
            <Button className="h-16 px-10 rounded-[2rem] bg-white text-ink font-black text-xl hover:scale-105 transition-all group shadow-2xl">
              ACTIVATE NOW
              <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
