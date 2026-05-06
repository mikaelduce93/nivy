"use client"

import { useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { NeonButton } from "@/components/ui/neon-button"
import { TrustBanner } from "@/components/trust-banner"
import { Sparkles, Calendar, Trophy, Users, Shield, Heart, MapPin, ArrowRight, UserCheck, PartyPopper, Crown, Palette } from 'lucide-react'
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { AvatarDashboard } from "@/components/gamification/avatar-dashboard"
import Image from "next/image"

export default function HomePage() {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])

  // Static, neutral preview values displayed in the marketing AvatarDashboard.
  // These are NOT user stats - the home page is anonymous marketing content.
  // The block is labelled as a preview ("Apercu") below.
  const previewUser = {
    username: "Aperçu",
    avatarUrl: undefined,
    globalLevel: 1
  }

  const previewStats = {
    party: { level: 1, currentXP: 0, maxXP: 1000 },
    vitality: { level: 1, currentXP: 0, maxXP: 1000 },
    intellect: { level: 1, currentXP: 0, maxXP: 1000 },
    prestige: { level: 1, currentXP: 0, maxXP: 1000 },
  }

  useEffect(() => {
    // Dynamically compute countdown to next event or fallback to next Saturday 17h
    const getNextEventDate = () => {
      if (upcomingEvents.length > 0 && upcomingEvents[0].event_date) {
        return new Date(upcomingEvents[0].event_date)
      }
      // Fallback: next Saturday at 17h
      const now = new Date()
      const nextSaturday = new Date(now)
      nextSaturday.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7))
      nextSaturday.setHours(17, 0, 0, 0)
      return nextSaturday
    }
    
    const timer = setInterval(() => {
      const targetDate = getNextEventDate()
      const now = new Date().getTime()
      const distance = targetDate.getTime() - now
      
      if (distance < 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }
      
      setCountdown({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [upcomingEvents])

  useEffect(() => {
    async function loadHomeData() {
      const supabase = createClient()
      const { data: events } = await supabase.from("events").select("*").gte("event_date", new Date().toISOString()).order("event_date").limit(3)
      if (events) setUpcomingEvents(events)
    }
    loadHomeData()
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-gen-z-lavender/30">
      <div className="relative z-10">
        <TrustBanner />

        {/* HERO SECTION */}
        <section className="relative pt-32 pb-20 px-6" aria-label="Accueil">
          <div className="container mx-auto max-w-7xl grid lg:grid-cols-2 gap-12 items-center">

            {/* Left Content - Gen-Z Hero */}
            <div className="text-center lg:text-left space-y-8">
              {/* Live badge */}
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/50 shadow-lg" role="status" aria-live="polite">
                <div className="w-2.5 h-2.5 rounded-full bg-gen-z-lime animate-pulse shadow-[0_0_12px_var(--gen-z-lime)]" aria-hidden="true" />
                <span className="text-sm font-bold text-gen-z-lime tabular-nums">Prochaine soirée dans {countdown.days}j {countdown.hours}h</span>
              </div>

              {/* Main heading - Gen-Z gradient */}
              <h1 className="text-6xl md:text-8xl font-black leading-[0.85] tracking-tighter">
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-gen-z-lavender via-gen-z-coral to-gen-z-lime animate-gradient-x bg-[length:200%_100%]">
                  TEEN&nbsp;LIFE
                </span>
                <span className="block text-foreground mt-2">
                  UNLEASHED
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed text-balance">
                Bienvenue dans le <span className="text-foreground font-bold">1er Écosystème Lifestyle</span> pour les 13–17&nbsp;ans au Maroc.
                <br/>
                <span className="text-gen-z-grape font-semibold">Soirées</span> • <span className="text-gen-z-lime font-semibold">Sport</span> • <span className="text-gen-z-sky font-semibold">Études</span> • <span className="text-gen-z-coral font-semibold">Créativité</span>
              </p>

              {/* CTA buttons */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                <Link href="/onboarding" prefetch={true}>
                  <NeonButton variant="party" size="lg" glow className="rounded-2xl px-8">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Rejoins le Club
                  </NeonButton>
                </Link>
                <Link href="/agenda" prefetch={true}>
                  <NeonButton variant="outline" size="lg" className="border-border/50 text-foreground hover:bg-muted rounded-2xl px-8">
                    <Calendar className="w-5 h-5 mr-2" />
                    Agenda
                  </NeonButton>
                </Link>
              </div>

              {/* Trust badges */}
              <div className="flex items-center justify-center lg:justify-start gap-4 pt-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gen-z-lime/10 text-gen-z-lime text-sm font-semibold">
                  <Shield className="w-4 h-4" aria-hidden="true" /> 100% Sécurisé
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gen-z-lavender/10 text-gen-z-lavender text-sm font-semibold">
                  <UserCheck className="w-4 h-4" aria-hidden="true" /> 13–17&nbsp;Ans
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gen-z-coral/10 text-gen-z-coral text-sm font-semibold">
                  <Shield className="w-4 h-4" aria-hidden="true" /> 0% Alcool
                </div>
              </div>
            </div>

            {/* Right Content - Avatar Dashboard Preview */}
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 rounded-full blur-3xl animate-spin-slow" />
              <GlassCard intensity="high" className="relative p-8 border-white/10">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-zinc-400 mb-2" aria-label="Aperçu non personnalisé">
                    Aperçu
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">Ton Tableau de Bord</h3>
                  <p className="text-zinc-400 text-sm">Voici à quoi ressemble ton dashboard une fois inscrit</p>
                </div>
                <AvatarDashboard user={previewUser} stats={previewStats} />
                <p className="mt-6 text-center text-xs text-zinc-500">
                  Crée ton profil pour gagner du XP réel et débloquer tes piliers.
                </p>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* PILLARS SECTION - Gen-Z styled */}
        <section className="py-24 px-6" aria-labelledby="pillars-heading">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full bg-gen-z-lavender/10 text-gen-z-lavender text-sm font-bold mb-4">
                🎮 GAMIFIE TA VIE
              </span>
              <h2 id="pillars-heading" className="text-4xl md:text-6xl font-black text-foreground mb-4 text-balance">4 Piliers pour <span className="text-gen-z-gradient">Level Up</span></h2>
              <p className="text-muted-foreground text-lg text-balance max-w-2xl mx-auto">Choisis ta voie et gagne des récompenses réelles</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* VITALITY */}
              <GlassCard neon="vitality" variant="hover" className="p-6 relative group overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-green-500/20 transition-all" />
                <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center mb-6 text-green-400 border border-green-500/30">
                  <Heart className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2 group-hover:text-green-400 transition-colors">VITALITY</h3>
                <p className="text-zinc-400 text-sm mb-6">Clubs de sport, défis fitness et santé. Bouge pour gagner.</p>
                <Link href="/clubs?category=sport">
                  <NeonButton variant="vitality" size="sm" className="w-full">Explorer Sport</NeonButton>
                </Link>
              </GlassCard>

              {/* INTELLECT */}
              <GlassCard neon="intellect" variant="hover" className="p-6 relative group overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-cyan-500/20 transition-all" />
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 flex items-center justify-center mb-6 text-cyan-400 border border-cyan-500/30">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2 group-hover:text-cyan-400 transition-colors">INTELLECT</h3>
                <p className="text-zinc-400 text-sm mb-6">Clubs tech, aide aux devoirs et focus timer. Muscle ton cerveau.</p>
                <Link href="/clubs?category=tech">
                  <NeonButton variant="intellect" size="sm" className="w-full">Explorer Tech</NeonButton>
                </Link>
              </GlassCard>

              {/* CREATIVITY */}
              <GlassCard neon="creativity" variant="hover" className="p-6 relative group overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-500/20 transition-all" />
                <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center mb-6 text-orange-400 border border-orange-500/30">
                  <Palette className="w-7 h-7" /> {/* Replaced Paintbrush with Palette if needed, using Palette for consistency */}
                </div>
                <h3 className="text-2xl font-black text-white mb-2 group-hover:text-orange-400 transition-colors">CREATIVITY</h3>
                <p className="text-zinc-400 text-sm mb-6">Arts, musique, danse et théâtre. Exprime ton talent.</p>
                <Link href="/clubs?category=art">
                  <NeonButton variant="default" size="sm" className="w-full bg-orange-600 hover:bg-orange-500 border border-orange-400/50 shadow-[0_0_15px_-5px_orange]">Explorer Arts</NeonButton>
                </Link>
              </GlassCard>

              {/* PARTY */}
              <GlassCard neon="party" variant="hover" className="p-6 relative group overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-purple-500/20 transition-all" />
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6 text-purple-400 border border-purple-500/30">
                  <PartyPopper className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2 group-hover:text-purple-400 transition-colors">SOCIAL</h3>
                <p className="text-zinc-400 text-sm mb-6">Les meilleures soirées ados du Maroc. 100% Fun, 0% Alcool.</p>
                <Link href="/agenda">
                  <NeonButton variant="party" size="sm" className="w-full">Voir Soirées</NeonButton>
                </Link>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* EVENTS SECTION */}
        <section className="py-20 px-6 bg-black/40 backdrop-blur-sm border-y border-white/5" aria-labelledby="events-heading">
          <div className="container mx-auto max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
              <div>
                <h2 id="events-heading" className="text-4xl font-black text-white mb-2 text-balance">Events à venir</h2>
                <p className="text-zinc-400">Ne rate pas les prochaines dates</p>
              </div>
              <Link href="/agenda">
                <NeonButton variant="outline" className="border-white/10 text-zinc-300 hover:text-white">
                  Tout voir <ArrowRight className="w-4 h-4 ml-2" />
                </NeonButton>
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {upcomingEvents.length > 0 ? upcomingEvents.slice(0, 3).map((event) => (
                <GlassCard key={event.id} variant="hover" neon="party" className="overflow-hidden group h-full flex flex-col">
                  <div className="relative h-56">
                    <Image
                      src={event.image_url || "/nightclub-confetti-celebration-crowd.jpg"}
                      alt={event.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                    <div className="absolute top-4 right-4 bg-purple-600 text-white font-bold px-3 py-1 rounded-lg text-xs shadow-lg shadow-purple-500/50">
                      J-{Math.max(0, Math.floor((new Date(event.event_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-xl font-bold text-white leading-tight mb-1">{event.title}</h3>
                      <div className="flex items-center text-xs text-zinc-300">
                        <MapPin className="w-3 h-3 mr-1 text-purple-400" />
                        {event.city || "Casablanca"}
                      </div>
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-end">
                    <Link href={`/agenda/${event.id}`} prefetch={true} className="w-full">
                      <NeonButton variant="party" className="w-full">Réserver</NeonButton>
                    </Link>
                  </div>
                </GlassCard>
              )) : (
                <div className="col-span-3 py-12 text-center text-zinc-500 bg-white/5 rounded-3xl border border-white/5">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Aucun événement programmé pour le moment.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CTA SECTION - Gen-Z styled */}
        <section className="py-28 px-6 relative overflow-hidden" aria-labelledby="cta-heading">
          {/* Gen-Z gradient background */}
          <div className="absolute inset-0 bg-gen-z-hero pointer-events-none" aria-hidden="true" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gen-z-lavender/20 rounded-full blur-[150px]" />
          
          <div className="container mx-auto max-w-4xl relative z-10 text-center">
            {/* Floating elements - hidden on reduced motion, subtle decorative */}
            <div className="hidden motion-safe:block absolute -top-10 left-10 text-4xl animate-float opacity-40 select-none" aria-hidden="true">✨</div>
            <div className="hidden motion-safe:block absolute bottom-10 right-10 text-3xl animate-float delay-500 opacity-40 select-none" aria-hidden="true">🎮</div>
            
            <h2 id="cta-heading" className="text-5xl md:text-7xl font-black text-foreground mb-8 tracking-tight text-balance">
              PRÊT À <span className="text-transparent bg-clip-text bg-gradient-to-r from-gen-z-lavender via-gen-z-coral to-gen-z-lime">LEVEL&nbsp;UP</span> ?
            </h2>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto text-balance">
              Rejoins +15,000&nbsp;ados qui vivent leur meilleure vie. Crée ton profil, rejoins un crew et commence à gagner des XP dès aujourd'hui.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/auth/sign-up" prefetch={true}>
                <NeonButton variant="prestige" size="lg" className="w-full sm:w-auto px-12 h-16 text-lg font-black rounded-2xl" glow>
                  <Crown className="w-6 h-6 mr-2" />
                  CRÉER MON PROFIL
                </NeonButton>
              </Link>
              <Link href="/a-propos" prefetch={true}>
                <NeonButton variant="outline" size="lg" className="w-full sm:w-auto h-16 text-lg border-border/50 text-foreground hover:bg-muted rounded-2xl">
                  En savoir plus
                </NeonButton>
              </Link>
            </div>

            {/* Social proof */}
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gen-z-lavender" />
                <span><span className="text-foreground font-bold">15K+</span> membres</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gen-z-coral" />
                <span><span className="text-foreground font-bold">50+</span> événements</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-gen-z-lime" />
                <span><span className="text-foreground font-bold">1M+</span> XP gagnés</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
