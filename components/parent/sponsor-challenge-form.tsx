"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Target, Zap, Plus, Camera, ArrowRight, X, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface SponsorChallengeFormProps {
  teenId: string
  teenName: string
}

export function SponsorChallengeForm({ teenName }: SponsorChallengeFormProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setIsExpanded(false)
      toast.success(`DÉFI LANCÉ : ${teenName} a reçu la quête !`)
    }, 1500)
  }

  return (
    <div className="relative">
      {!isExpanded ? (
        <motion.button
          onClick={() => setIsExpanded(true)}
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          className="w-full h-24 rounded-[2.5rem] bg-gradient-to-r from-gen-z-teal via-teal-500 to-indigo-600 p-[2px] shadow-2xl group overflow-hidden"
        >
          <div className="w-full h-full rounded-[calc(2.5rem-2px)] bg-zinc-950 flex items-center justify-between px-10 group-hover:bg-transparent transition-colors duration-500">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-gen-z-teal/10 flex items-center justify-center border border-gen-z-teal/20 shadow-inner group-hover:bg-white/20 transition-colors">
                <Target className="h-7 w-7 text-gen-z-teal group-hover:text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-black text-white tracking-tight uppercase italic group-hover:text-white">Sponsor Quest</h3>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest group-hover:text-white/80 transition-colors">Challenge {teenName} now</p>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <Plus className="w-6 h-6 text-white group-hover:rotate-90 transition-transform" />
            </div>
          </div>
        </motion.button>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="rounded-[3rem] bg-zinc-900 border border-white/10 p-10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative overflow-hidden"
        >
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gen-z-teal/10 rounded-full blur-[100px] -mr-32 -mt-32" />
          
          <button 
            onClick={() => setIsExpanded(false)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic">Create a Mission</h3>
              <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Define the objective and the prize</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] px-2">The Goal</label>
                <div className="relative">
                  <Input 
                    required
                    className="h-16 rounded-2xl bg-black/40 border-white/10 text-white font-bold px-6 focus:border-gen-z-teal transition-all" 
                    placeholder="Ex: Nettoyer la chambre..." 
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Target className="w-4 h-4 text-zinc-500" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] px-2">The Reward (Credits/XP)</label>
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Input 
                      type="number"
                      defaultValue={100}
                      className="h-16 rounded-2xl bg-black/40 border-white/10 text-white font-bold px-12 focus:border-gen-z-teal transition-all" 
                    />
                    <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="relative flex-1">
                    <Input 
                      type="number"
                      defaultValue={50}
                      className="h-16 rounded-2xl bg-black/40 border-white/10 text-white font-bold px-12 focus:border-gen-z-teal transition-all" 
                    />
                    <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gen-z-teal/10 flex items-center justify-center border border-gen-z-teal/20">
                  <Camera className="w-5 h-5 text-gen-z-teal" />
                </div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Require photo proof?</span>
              </div>
              <div className="w-12 h-6 rounded-full bg-gen-z-teal p-1 flex justify-end cursor-pointer">
                <div className="w-4 h-4 rounded-full bg-white" />
              </div>
            </div>

            <Button 
              type="submit"
              disabled={loading}
              className="w-full h-20 rounded-[2rem] bg-white text-black font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl"
            >
              {loading ? "Transmitting..." : "ACTIVATE MISSION"}
              <ArrowRight className="ml-3 w-6 h-6" />
            </Button>
          </form>
        </motion.div>
      )}
    </div>
  )
}
