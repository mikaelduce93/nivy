'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { PullToRefresh } from '@/components/ui/pull-to-refresh'
import { PriorityMission } from "@/components/teen/dashboard/priority-mission"
import { OnlineFriends } from "@/components/teen/dashboard/online-friends"
import { QuickAccessGrid } from "@/components/teen/dashboard/quick-access-grid"
import { PurchasingPower } from "@/components/gamification/xp-purchase-power"
import { ProfileQuest } from "@/components/teen/dashboard/profile-quest"
import { MapPreview } from "@/components/teen/dashboard/map-preview"
import { ClientErrorBoundary } from "@/components/common/client-error-boundary"
import { MeshBackground } from "@/components/ui/effects/mesh-background"
import { StickerCard } from "@/components/ui/sticker-card"
import { Niv, StatHero } from "@/components/brand"
import { CrewHub } from "@/components/teen/dashboard/crew-hub"
import { LazySocialFeed, LazyMarketplaceOverlay } from "./lazy-components"
import { MobileBottomNav } from "./mobile-nav"
import { MapSkeleton, QuickAccessSkeleton, CardSkeleton } from "@/components/ui/skeleton-variants"
import { useDashboardContext } from "@/lib/hooks/teen-dashboard"
import type { UserRoleInfo } from "@/lib/auth/get-user-role"

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

/** Coiffe une section : eyebrow mono UPPERCASE charte (§3). */
function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="eyebrow mb-3 block tracking-[0.16em] text-mute">
      {children}
    </span>
  )
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
  void prefersReducedMotion

  // Pull-to-refresh: revalidate the server component (XP, missions, feed).
  const handleRefresh = React.useCallback(async () => {
    router.refresh()
    // Give the server roundtrip a brief, predictable end so the spinner
    // doesn't disappear instantly on fast networks.
    await new Promise((resolve) => setTimeout(resolve, 450))
  }, [router])

  const firstName = userInfo.fullName?.split(' ')[0] || 'champion'

  const content = (
    <div className="relative min-h-screen bg-paper text-ink overflow-x-hidden">
      {/* Fond mesh paper conforme charte (§3) — aucun blur/glow/grain. */}
      <MeshBackground className="fixed inset-0 z-0" intensity={0.8} />

      <div className="relative z-10 py-6 sm:py-8 md:py-10 px-3 sm:px-4 md:px-8 max-w-[1200px] mx-auto space-y-8 sm:space-y-10 md:space-y-12 pb-24 md:pb-10">

        {/* HERO ÉDITORIAL — eyebrow mono + titre Bricolage + Niv en grand. */}
        <section className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div className="flex-1 text-center sm:text-left">
            <span className="eyebrow tracking-[0.16em] text-pink">
              Ton crew · Aujourd&apos;hui
            </span>
            <h1 className="mt-2 font-display text-[clamp(2.25rem,7vw,3.5rem)] font-extrabold leading-[1.02] tracking-tight text-ink">
              Salut {firstName}, ton{' '}
              <em className="font-semibold italic text-pink">crew</em> t&apos;attend
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-mute sm:mx-0">
              Ta mission du jour, tes raccourcis et ton crew, réunis ici.
            </p>
          </div>
          <Niv mood="proud" float size={mobile ? 132 : 168} className="shrink-0" />
        </section>

        {/* SOLDE XP — surface sombre ponctuelle, chiffre Bricolage géant (F2). */}
        <StatHero
          eyebrow="XP cumulés"
          value={xpData.total.toLocaleString('fr-FR')}
          unit="XP"
          tone="gold"
          size="lg"
          meta={`Niveau ${xpData.level}`}
        />

        {/* MISSION PRIORITAIRE — CTA primaire dominant sous le hero. */}
        <section>
          <SectionEyebrow>Mission prioritaire</SectionEyebrow>
          <PriorityMission action={displayAction} />
        </section>

        {/* RACCOURCIS + AMIS */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <section className="md:col-span-7">
            <SectionEyebrow>Accès rapide</SectionEyebrow>
            <StickerCard className="overflow-hidden p-0">
              <Suspense fallback={<QuickAccessSkeleton />}>
                <QuickAccessGrid userId={teenId} />
              </Suspense>
            </StickerCard>
          </section>

          <section className="md:col-span-5">
            <SectionEyebrow>Amis en ligne</SectionEyebrow>
            <StickerCard className="p-4 sm:p-6">
              <Suspense fallback={<CardSkeleton />}>
                <OnlineFriends userId={teenId} />
              </Suspense>
            </StickerCard>
          </section>
        </div>

        {/* CARTE DÉCOUVERTE + CREW */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <section className="md:col-span-5">
            <SectionEyebrow>Carte découverte</SectionEyebrow>
            <StickerCard className="min-h-[200px] overflow-hidden p-0 sm:min-h-[250px]">
              <Suspense fallback={<MapSkeleton />}>
                <ClientErrorBoundary
                  fallback={
                    <div className="flex h-full items-center justify-center bg-white font-mono text-xs uppercase tracking-[0.16em] text-mute">
                      Carte indispo
                    </div>
                  }
                >
                  <MapPreview userId={teenId} />
                </ClientErrorBoundary>
              </Suspense>
            </StickerCard>
          </section>

          <section className="md:col-span-7">
            <SectionEyebrow>Ton crew</SectionEyebrow>
            <StickerCard className="overflow-hidden p-0">
              <Suspense fallback={<CardSkeleton className="h-full" />}>
                <CrewHub />
              </Suspense>
            </StickerCard>
          </section>
        </div>

        {/* OBJECTIF XP + PROFIL */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section>
            <SectionEyebrow>Prochain objectif</SectionEyebrow>
            <StickerCard className="overflow-hidden p-0">
              <PurchasingPower currentXP={xpData.total} nextReward={nextReward} />
            </StickerCard>
          </section>

          <section>
            <SectionEyebrow>Complète ton profil</SectionEyebrow>
            <StickerCard className="overflow-hidden p-4 sm:p-6">
              <Suspense fallback={<CardSkeleton />}>
                <ProfileQuest />
              </Suspense>
            </StickerCard>
          </section>
        </div>

        {/* FIL D'ACTIVITÉ */}
        <section aria-label="Fil d'activité en direct">
          <div className="mb-3 flex items-center justify-between">
            <span className="eyebrow tracking-[0.16em] text-mute">En direct</span>
            <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-pink">
              <span className="h-1.5 w-1.5 rounded-full bg-pink motion-safe:animate-ping" />
              En direct
            </span>
          </div>
          <StickerCard className="p-4 sm:p-6">
            <ClientErrorBoundary
              fallback={
                <div className="p-12 text-center font-mono text-sm uppercase tracking-[0.16em] text-mute">
                  Synchro…
                </div>
              }
            >
              <LazySocialFeed initialActivities={socialFeed} />
            </ClientErrorBoundary>
          </StickerCard>
        </section>

        {/* Marketplace Overlay */}
        <LazyMarketplaceOverlay />

      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <MobileBottomNav />
    </div>
  )

  // Mobile: wrap in pull-to-refresh so a downward swipe revalidates dashboard data.
  const wrappedContent = mobile ? (
    <PullToRefresh onRefresh={handleRefresh} disabled={!mounted}>
      {content}
    </PullToRefresh>
  ) : (
    content
  )

  return wrappedContent
}
