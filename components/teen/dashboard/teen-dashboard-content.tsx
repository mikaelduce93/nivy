'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { PullToRefresh } from '@/components/ui/pull-to-refresh'
import { Hero, type HeroVariant } from "@/components/teen/dashboard/hero"
import { PriorityMission } from "@/components/teen/dashboard/priority-mission"
import { OnlineFriends } from "@/components/teen/dashboard/online-friends"
import { QuickAccessGrid } from "@/components/teen/dashboard/quick-access-grid"
import { PurchasingPower } from "@/components/gamification/xp-purchase-power"
import { ProfileQuest } from "@/components/teen/dashboard/profile-quest"
import { MapPreview } from "@/components/teen/dashboard/map-preview"
import { ClientErrorBoundary } from "@/components/common/client-error-boundary"
import { GrainOverlay, MeshGradient, GlowBlob } from "@/components/ui/gen-z-effects"
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid"
import { ParallaxContainer, ParallaxLayer } from "@/components/ui/parallax-container"
import { CrewHub } from "@/components/teen/dashboard/crew-hub"
import { LazySocialFeed, LazyMarketplaceOverlay } from "./lazy-components"
import { MobileBottomNav } from "./mobile-nav"
import { MapSkeleton, QuickAccessSkeleton, CardSkeleton } from "@/components/ui/skeleton-variants"
import { useDashboardContext } from "@/lib/hooks/teen-dashboard"
import { EliteProviders } from "@/components/providers/elite-providers"
import { RevealElement, CursorHoverArea } from "@/components/ui/effects"
import type { UserRoleInfo } from "@/lib/auth/get-user-role"

// Hero variant based on user level
function getHeroVariant(level: number, streak: number): HeroVariant {
  if (level >= 50 || streak >= 30) return 'legendary'
  if (level >= 20 || streak >= 14) return 'elite'
  return 'standard'
}

interface TeenDashboardContentProps {
  userInfo: UserRoleInfo
  teenId: string
  xpData: {
    total: number
    level: number
    xpToNextLevel?: number
    xpInLevel?: number
    xpForNextLevel?: number
    progressPercent?: number
  }
  currentStreak: number
  displayAction: {
    mission: {
      id?: string
      name: string
      description: string
      xp: number
      progress: number
      type: 'daily' | 'weekly' | 'challenge' | 'special'
    }
  }
  socialFeed: any[]
  nextReward: {
    name: string
    xpCost: number
    progressPercent: number
  } | null
}

export function TeenDashboardContent({
  userInfo,
  teenId,
  xpData,
  currentStreak,
  displayAction,
  socialFeed,
  nextReward,
}: TeenDashboardContentProps) {
  // Use unified dashboard context hook
  const { isMobile, prefersReducedMotion, mounted } = useDashboardContext()
  const router = useRouter()

  // SSR fallback - render with defaults
  const mobile = mounted ? isMobile : false
  const reducedMotion = mounted ? prefersReducedMotion : false

  // Pull-to-refresh: revalidate the server component (XP, missions, feed).
  const handleRefresh = React.useCallback(async () => {
    router.refresh()
    // Give the server roundtrip a brief, predictable end so the spinner
    // doesn't disappear instantly on fast networks.
    await new Promise((resolve) => setTimeout(resolve, 450))
  }, [router])

  // Wrap content with elite providers on desktop
  const content = (
    <div className="relative min-h-screen bg-[#020203] text-white selection:bg-brand-soft/30 overflow-x-hidden">
      {/* 1. BACKGROUND - Reduced on mobile for performance */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <MeshGradient className="opacity-20" />
        
        {/* Only render heavy effects on desktop */}
        {!mobile && !reducedMotion && (
          <>
            <ParallaxLayer speed={-0.05}>
              <GlowBlob color="var(--brand-soft)" size={1000} className="-top-[10%] -right-[10%] opacity-15" />
            </ParallaxLayer>
            <ParallaxLayer speed={0.08}>
              <GlowBlob color="var(--accent-soft)" size={800} className="bottom-[10%] -left-[10%] opacity-10" />
            </ParallaxLayer>
          </>
        )}
        
        {/* Simpler background for mobile */}
        {/* NOTE: orb sizes 400-600px and blur-[80px]/[100px]/[150px]/[180px] are intentionally
            above Tailwind canonical scale — ambient full-viewport gradient orbs. */}
        {mobile && (
          <>
            <div className="absolute -top-[10%] -right-[10%] w-[600px] h-[600px] rounded-full bg-brand-soft/10 blur-[100px]" />
            <div className="absolute bottom-[10%] -left-[10%] w-[400px] h-[400px] rounded-full bg-accent-soft/10 blur-[80px]" />
          </>
        )}
        
        <GrainOverlay opacity={0.04} />
      </div>

      <ParallaxContainer 
        className="relative z-10 py-6 sm:py-8 md:py-10 px-3 sm:px-4 md:px-8 max-w-[1600px] mx-auto space-y-6 sm:space-y-8 md:space-y-12 pb-24 md:pb-10"
        disabled={mobile || reducedMotion}
      >
        
        {/* 2. HERO SECTION - Unified Hero with variant based on level */}
        <RevealElement delay={0} direction="up" distance={40}>
          <Hero 
            variant={getHeroVariant(xpData.level, currentStreak)}
            user={userInfo} 
            xpData={xpData} 
            currentStreak={currentStreak} 
          />
        </RevealElement>

        {/* 3. BENTO GRID - Priority-based hierarchy for $300M+ UX */}
        <BentoGrid 
          className="auto-rows-[minmax(140px,auto)] sm:auto-rows-[minmax(160px,auto)] md:auto-rows-[minmax(180px,auto)]"
          aria-label="Dashboard principal"
        >
          {/* ROW 1: Priority Mission (6 cols) + Quick Actions (3 cols) + Friends (3 cols) */}
          
          {/* Priority Mission - THE focal point */}
          <BentoCard 
            cols={6} 
            rows={1} 
            variant="glow"
            tiltIntensity={mobile ? 0 : 8}
            className="col-span-full md:col-span-6 order-1"
            style={{ "--primary-glow": "var(--accent-soft)" } as React.CSSProperties}
          >
            <PriorityMission action={displayAction} />
          </BentoCard>

          {/* Quick Actions - Essential navigation */}
          <BentoCard
            cols={3}
            rows={2}
            variant="glass"
            tiltIntensity={mobile ? 0 : 5}
            className="col-span-full sm:col-span-6 md:col-span-3 p-0 border-white/5 order-2"
          >
            <Suspense fallback={<QuickAccessSkeleton />}>
              <QuickAccessGrid userId={teenId} />
            </Suspense>
          </BentoCard>

          {/* Online Friends - Social pulse */}
          <BentoCard
            cols={3}
            rows={1}
            variant="glass"
            tiltIntensity={mobile ? 0 : 5}
            className="col-span-full sm:col-span-6 md:col-span-3 bg-white/[0.02] border-white/5 order-3"
          >
            <Suspense fallback={<CardSkeleton />}>
              <OnlineFriends userId={teenId} />
            </Suspense>
          </BentoCard>

          {/* ROW 2: Map (5 cols) + Crew Hub (7 cols) */}
          
          {/* Discovery Map - Exploration gateway */}
          <BentoCard 
            cols={5} 
            rows={2} 
            variant="default" 
            className="col-span-full md:col-span-5 p-0 overflow-hidden min-h-[200px] sm:min-h-[250px] order-4"
            tiltIntensity={mobile ? 0 : 3}
          >
            <Suspense fallback={<MapSkeleton />}>
              <ClientErrorBoundary fallback={<div className="h-full flex items-center justify-center text-zinc-400 font-black uppercase tracking-widest bg-zinc-900/50">Map Offline</div>}>
                <MapPreview userId={teenId} />
              </ClientErrorBoundary>
            </Suspense>
          </BentoCard>

          {/* Crew Hub - Team collaboration */}
          <BentoCard
            cols={7}
            rows={2}
            variant="accent"
            tiltIntensity={mobile ? 0 : 4}
            className="col-span-full md:col-span-7 bg-indigo-950/20 border-indigo-500/20 order-5"
          >
            <Suspense fallback={<CardSkeleton className="h-full" />}>
              <CrewHub />
            </Suspense>
          </BentoCard>

          {/* ROW 3: Profile Quest (4 cols) + XP Power (4 cols) + Feed (4 cols) */}
          
          {/* Purchasing Power - XP rewards */}
          <BentoCard 
            cols={4} 
            rows={1} 
            variant="glass"
            tiltIntensity={mobile ? 0 : 5}
            className="col-span-full sm:col-span-6 md:col-span-4 order-6"
          >
            <PurchasingPower currentXP={xpData.total} nextReward={nextReward} />
          </BentoCard>

          {/* Profile Quest - Profile completion gamification */}
          <BentoCard
            cols={4}
            rows={1}
            variant="default"
            tiltIntensity={mobile ? 0 : 6}
            className="col-span-full sm:col-span-6 md:col-span-4 bg-zinc-900/40 border-white/5 order-7"
          >
            <Suspense fallback={<CardSkeleton />}>
              <ProfileQuest />
            </Suspense>
          </BentoCard>

          {/* Activity Feed - Community pulse */}
          <BentoCard 
            cols={8} 
            rows={2} 
            variant="glass" 
            tiltIntensity={mobile ? 0 : 3}
            className="col-span-full md:col-span-8 flex flex-col border-white/5 bg-white/[0.01] order-8"
            aria-label="Fil d'activité en direct"
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8 px-4 pt-4 sm:px-6 sm:pt-6">
              <h2 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tighter flex items-center gap-2 sm:gap-3 italic">
                <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-accent-soft/10 flex items-center justify-center text-accent-soft border border-accent-soft/20 shadow-inner text-sm sm:text-base">🎉</span>
                LIVE FEED
              </h2>
              <div className="flex gap-1.5 items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-soft animate-ping" />
                <span className="text-[9px] sm:text-[10px] font-black text-accent-soft uppercase tracking-widest">Live</span>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <ClientErrorBoundary fallback={<div className="text-sm text-zinc-700 font-black uppercase tracking-[0.3em] p-12 text-center">Syncing...</div>}>
                <LazySocialFeed initialActivities={socialFeed} />
              </ClientErrorBoundary>
            </div>
          </BentoCard>

        </BentoGrid>

        {/* Marketplace Overlay */}
        <LazyMarketplaceOverlay />
        
      </ParallaxContainer>

      {/* 4. FLOATING ORBS - Only on desktop */}
      {!mobile && (
        <>
          <div className="fixed bottom-0 -left-40 w-[500px] h-[500px] bg-accent-soft/5 rounded-full blur-[150px] pointer-events-none animate-pulse-slow" />
          <div className="fixed top-0 -right-40 w-[600px] h-[600px] bg-brand-soft/5 rounded-full blur-[180px] pointer-events-none animate-pulse-slow delay-700" />
        </>
      )}

      {/* 5. MOBILE BOTTOM NAVIGATION */}
      <MobileBottomNav />
    </div>
  )

  // Wrap with elite providers on desktop for cursor effects (elite/legendary variants)
  const heroVariant = getHeroVariant(xpData.level, currentStreak)
  const useEliteProviders = (heroVariant === 'elite' || heroVariant === 'legendary') && !mobile && mounted

  // Mobile: wrap in pull-to-refresh so a downward swipe revalidates dashboard data.
  const wrappedContent = mobile ? (
    <PullToRefresh onRefresh={handleRefresh} disabled={!mounted}>
      {content}
    </PullToRefresh>
  ) : (
    content
  )

  if (useEliteProviders) {
    return (
      <EliteProviders cursor={true}>
        {wrappedContent}
      </EliteProviders>
    )
  }

  return wrappedContent
}
