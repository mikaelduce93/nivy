'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cake, Users, Calendar, DollarSign, Send, Check, Sparkles, Zap, Star, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MeshGradient, GrainOverlay, GlowBlob } from '@/components/ui/gen-z-effects'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { submitBirthdayRequest } from './actions'
import { cn } from '@/lib/utils'

const PACKS = [
  { 
    id: 'starter', 
    label: "Intimate Crew", 
    guests: 10, 
    price: 3500, 
    color: "var(--gen-z-lavender)",
    icon: Users,
    tag: "MOST POPULAR"
  },
  { 
    id: 'plus', 
    label: "The Big Bash", 
    guests: 20, 
    price: 5500, 
    color: "var(--gen-z-coral)",
    icon: Star,
    tag: "HYPE"
  },
  { 
    id: 'vip-premium', 
    label: "Legendary Night", 
    guests: 50, 
    price: 12000, 
    color: "var(--gen-z-yellow)",
    icon: Sparkles,
    tag: "EXTREME"
  }
]

export default function OrganizeBirthdayPage() {
  const [step, setStep] = useState(1)
  const [selectedPack, setSelectedPack] = useState(PACKS[0])
  const [date, setDate] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSendToParent = async () => {
    if (!date) {
      toast.error("Choisis une date pour la Hype !")
      return
    }
    setLoading(true)
    try {
      await submitBirthdayRequest({
        guestCount: selectedPack.guests,
        celebrationDate: date,
        packSlug: selectedPack.id,
        totalPrice: selectedPack.price
      })
      setStep(2)
      toast.success("Demande de budget envoyée à ton sponsor !")
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[#020203] text-white overflow-hidden selection:bg-gen-z-lavender/30">
      <MeshGradient className="opacity-30" />
      <GrainOverlay opacity={0.05} />
      <GlowBlob color="var(--gen-z-lavender)" className="-top-20 -right-20 opacity-20" size={600} />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-16"
            >
              <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto border border-white/10 shadow-2xl">
                  <Cake className="w-12 h-12 text-gen-z-lavender animate-pulse" />
                </div>
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic leading-none">
                  Plan thy <span className="text-gen-z-gradient">Legendary Night.</span>
                </h1>
                <p className="text-zinc-500 text-xl font-medium max-w-xl mx-auto">AI has pre-calculated the best vibes for you.</p>
              </div>

              {/* Pack Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PACKS.map((pack) => (
                  <motion.div
                    key={pack.id}
                    whileHover={{ y: -10 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedPack(pack)}
                    className={cn(
                      "relative p-1 rounded-[3rem] cursor-pointer transition-all duration-500",
                      selectedPack.id === pack.id ? "bg-gradient-to-br from-white/40 to-transparent" : "bg-white/5 border border-white/10"
                    )}
                  >
                    <div className={cn(
                      "h-full w-full rounded-[2.9rem] p-8 flex flex-col justify-between space-y-8 transition-all duration-500",
                      selectedPack.id === pack.id ? "bg-zinc-900" : "bg-transparent"
                    )}>
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                            <pack.icon className="w-6 h-6" style={{ color: pack.color }} />
                          </div>
                          {pack.tag && (
                            <span className="text-[8px] font-black tracking-widest px-2 py-1 rounded-full bg-white/10 text-white border border-white/5">
                              {pack.tag}
                            </span>
                          )}
                        </div>
                        <h3 className="text-2xl font-black tracking-tight leading-none uppercase italic">{pack.label}</h3>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{pack.guests} GUESTS MAX</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-3xl font-black tracking-tighter">{pack.price} DH</p>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase">All Inclusive</p>
                      </div>
                    </div>
                    {selectedPack.id === pack.id && (
                      <motion.div 
                        layoutId="active-ring"
                        className="absolute inset-0 rounded-[3rem] border-2 border-white/50 pointer-events-none"
                      />
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Date & Trigger */}
              <div className="max-w-md mx-auto space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] px-2">Set the Date</label>
                  <input 
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-20 rounded-[2rem] bg-white/5 border border-white/10 px-8 text-xl font-black uppercase tracking-tighter focus:border-white/40 transition-all outline-none"
                  />
                </div>

                <Button 
                  onClick={handleSendToParent}
                  disabled={loading || !date}
                  className="w-full h-24 rounded-[2.5rem] bg-white text-black font-black text-2xl uppercase italic hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_80px_rgba(255,255,255,0.2)]"
                >
                  {loading ? "Transmitting..." : "Send to Sponsor"}
                  <Send className="ml-4 w-8 h-8" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="step2"
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="text-center space-y-12 py-10"
            >
              <div className="w-40 h-40 bg-gen-z-mint/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_100px_rgba(45,212,191,0.3)] border border-gen-z-mint/30">
                <ShieldCheck className="w-20 h-20 text-gen-z-mint" />
              </div>
              <div className="space-y-6">
                <h2 className="text-6xl font-black uppercase italic tracking-tighter">REQUEST ACTIVE.</h2>
                <p className="text-zinc-500 text-xl font-medium max-w-md mx-auto leading-relaxed">
                  Thy sponsor (Parent) has received the invite. Stand by for validation.
                </p>
              </div>
              <div className="pt-8">
                <Button 
                  onClick={() => router.push('/teen')}
                  variant="outline" 
                  className="rounded-3xl h-16 px-12 border-white/10 text-white font-black text-lg hover:bg-white/5"
                >
                  RETURN TO HUB
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
