"use client"

import { BentoGrid, BentoCard } from "@/components/ui/bento-grid"
import { GlassCard } from "@/components/ui/glass-card"
import { AnimatedCounter } from "@/components/ui/animated-counter"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Star, 
  ArrowRight, 
  Zap, 
  Gift, 
  MessageSquare,
  ChevronRight,
  Plus
} from "lucide-react"
import { UniversalScanner } from "@/components/partner/universal-scanner"
import { ParallaxContainer, ParallaxLayer } from "@/components/ui/parallax-container"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { motion } from "framer-motion"
import Link from "next/link"

export default function PartnerDashboard() {
  // Mock data for demo
  const stats = [
    { 
      label: "Chiffre d'Affaires", 
      value: 12450, 
      prefix: "", 
      suffix: " DH", 
      icon: DollarSign, 
      trend: "+12%", 
      color: "emerald",
      description: "Revenus ce mois"
    },
    { 
      label: "Teens Accueillis", 
      value: 342, 
      prefix: "", 
      suffix: "", 
      icon: Users, 
      trend: "+8%", 
      color: "blue",
      description: "Visites uniques"
    },
    { 
      label: "Note Moyenne", 
      value: 4.8, 
      prefix: "", 
      suffix: "/5", 
      icon: Star, 
      trend: "Stable", 
      color: "yellow",
      description: "Satisfaction client"
    },
    { 
      label: "Paiements XP", 
      value: 45000, 
      prefix: "", 
      suffix: " XP", 
      icon: TrendingUp, 
      trend: "+24%", 
      color: "purple",
      description: "Total accumulé"
    },
  ]

  const activeOffers = [
    { title: "Menu Burger XP", sales: 45, status: "Active", icon: Zap },
    { title: "Happy Hour -50%", sales: 12, status: "Active", icon: Gift },
  ]

  return (
    <ParallaxContainer className="min-h-screen bg-[#030303] text-white selection:bg-purple-500/30 overflow-hidden">
      {/* Dynamic Background Elements */}
      <ParallaxLayer speed={-0.15} className="z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      </ParallaxLayer>

      <div className="relative z-10 max-w-7xl mx-auto p-6 md:p-10 space-y-10">
        
        {/* Header - High Contrast & Premium */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-purple-500/20">
                Partner Elite
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
              Tableau de Bord
            </h1>
            <p className="text-zinc-400 text-lg mt-2 font-medium">
              Pilotez votre croissance et gérez l'expérience Teen.
            </p>
          </motion.div>
          
          <motion.div 
            className="flex gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Button variant="outline" className="h-14 px-8 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold transition-all">
              Centre d'Aide
            </Button>
            <MagneticButton>
              <Button className="h-14 px-8 rounded-2xl bg-white text-black hover:bg-zinc-200 font-black shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)]">
                <Plus className="w-5 h-5 mr-2 stroke-[3px]" />
                Créer une Offre
              </Button>
            </MagneticButton>
          </motion.div>
        </div>

        {/* Bento Grid System */}
        <BentoGrid>
          
          {/* Main Action: Scanner - Priority Level High */}
          <BentoCard cols={8} rows={2} variant="default" className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-blue-600/5 pointer-events-none" />
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                    <Zap className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Validation Instantanée</h3>
                    <p className="text-sm text-zinc-500">Scannez le QR Code du Teen</p>
                  </div>
                </div>
                <div className="flex -space-x-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-[#030303] bg-zinc-800 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                      <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="Teen" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full border-2 border-[#030303] bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                    +12
                  </div>
                </div>
              </div>
              
              <div className="flex-grow min-h-[300px]">
                <UniversalScanner />
              </div>
            </div>
          </BentoCard>

          {/* Status Card: Gold Partner - High Contrast Luxury */}
          <BentoCard cols={4} rows={2} variant="accent" className="bg-gradient-to-br from-zinc-900 to-black border-white/5 ring-1 ring-white/10">
            <div className="h-full flex flex-col justify-between py-4">
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-yellow-400/20 blur-2xl rounded-full animate-pulse" />
                    <Star className="w-20 h-20 text-yellow-400 relative z-10 fill-yellow-400/20 stroke-[1.5px]" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-black tracking-tight">Membre Gold</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed px-4">
                    Plus que <span className="text-white font-bold">58 ventes</span> pour débloquer le statut Platinum et <span className="text-emerald-400 font-bold">-50% de commission</span> !
                  </p>
                </div>
              </div>

              <div className="space-y-4 px-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Progression</span>
                  <span className="text-2xl font-black">72%</span>
                </div>
                <div className="w-full bg-white/5 h-4 rounded-full overflow-hidden p-1 border border-white/5">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-200 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.5)]" 
                    initial={{ width: 0 }}
                    animate={{ width: "72%" }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </div>
                <Button variant="ghost" className="w-full text-zinc-500 hover:text-white hover:bg-white/5 text-xs font-bold rounded-xl h-10">
                  DÉTAILS DES AVANTAGES <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </BentoCard>

          {/* KPI Section - Dynamic Counter & Glass Effect */}
          {stats.map((stat, i) => (
            <BentoCard key={i} cols={3} rows={1} variant={i === 0 ? "glow" : "glass"} className="overflow-hidden group">
              <div className="flex flex-col h-full justify-between">
                <div className="flex justify-between items-start">
                  <div className={cn(
                    "p-3 rounded-2xl border",
                    stat.color === "emerald" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                    stat.color === "blue" ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                    stat.color === "yellow" ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" :
                    "bg-purple-500/10 border-purple-500/20 text-purple-400"
                  )}>
                    <stat.icon className="w-6 h-6 stroke-[2.5px]" />
                  </div>
                  <div className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider",
                    stat.trend.startsWith('+') ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800 text-zinc-400 border border-white/5"
                  )}>
                    {stat.trend}
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">{stat.label}</div>
                  <div className="flex items-baseline gap-1">
                    <AnimatedCounter 
                      value={stat.value} 
                      prefix={stat.prefix} 
                      suffix={stat.suffix} 
                      className="text-4xl font-black tracking-tighter"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-2 font-medium">{stat.description}</p>
                </div>
              </div>
            </BentoCard>
          ))}

          {/* Bottom Grid: Offers & Activity */}
          <BentoCard cols={6} rows={2} variant="glass" className="border-white/5">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black tracking-tight">Offres Actives</h3>
              <Button variant="ghost" className="text-zinc-400 hover:text-white group text-sm">
                Gérer <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
            <div className="grid gap-4">
              {activeOffers.map((offer, i) => (
                <GlassCard key={i} variant="hover" className="p-5 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-purple-500/10 transition-colors">
                      <offer.icon className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-white">{offer.title}</p>
                      <p className="text-xs text-zinc-500 font-medium">{offer.sales} ventes ce mois-ci</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-400">Performant</div>
                      <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">STATUT</div>
                    </div>
                    <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
            
            <div className="mt-8 p-6 rounded-[2rem] bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-white/5 flex items-center justify-between">
              <div>
                <p className="font-bold text-purple-200">Booster vos ventes ?</p>
                <p className="text-xs text-purple-300/60">Mettez une offre en avant pour 24h.</p>
              </div>
              <Button size="sm" className="bg-purple-500 hover:bg-purple-400 text-white font-black rounded-xl">
                BOOSTER
              </Button>
            </div>
          </BentoCard>

          <BentoCard cols={6} rows={2} variant="glass" className="border-white/5">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black tracking-tight">Transactions Récentes</h3>
              <Button variant="ghost" className="text-zinc-400 hover:text-white group text-sm">
                Historique <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
            <div className="space-y-6">
              {[
                { name: "Paiement via XP", user: "Teen #4829", time: "il y a 5 min", amount: "+500 XP", icon: Zap, color: "text-emerald-400" },
                { name: "Validation Offre", user: "Teen #3102", time: "il y a 12 min", amount: "Burger XP", icon: Gift, color: "text-purple-400" },
                { name: "Paiement Direct", user: "Teen #9921", time: "il y a 45 min", amount: "+45 DH", icon: DollarSign, color: "text-blue-400" },
                { name: "Note Reçue", user: "Teen #4829", time: "il y a 1h", amount: "5.0 ★", icon: Star, color: "text-yellow-400" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between group cursor-default">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <item.icon className={cn("w-5 h-5 relative z-10", item.color)} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">{item.name}</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">{item.user} • {item.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={cn("text-base font-black tracking-tighter", item.color)}>{item.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          </BentoCard>

        </BentoGrid>

        {/* Support & Quick Links */}
        <div className="flex flex-wrap gap-4 pt-10">
          {["Factures", "Paramètres", "Support", "Marketing", "Communauté"].map((link) => (
            <Link key={link} href="#" className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 text-xs font-bold text-zinc-500 hover:bg-white/10 hover:text-white hover:border-white/10 transition-all">
              {link}
            </Link>
          ))}
        </div>
      </div>
    </ParallaxContainer>
  )
}

