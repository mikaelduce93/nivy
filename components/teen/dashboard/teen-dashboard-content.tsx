'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { PullToRefresh } from '@/components/ui/pull-to-refresh'
import { QuickAccessGrid } from "@/components/teen/dashboard/quick-access-grid"
import { ProfileQuest } from "@/components/teen/dashboard/profile-quest"
import { MeshBackground } from "@/components/ui/effects/mesh-background"
import { StickerCard } from "@/components/ui/sticker-card"
import { QuickAccessSkeleton, CardSkeleton } from "@/components/ui/skeleton-variants"
import { useDashboardContext } from "@/lib/hooks/teen-dashboard"

/**
 * Teen dashboard — below-the-fold content (#205 refonte).
 *
 * L'accueil est un LANCEUR D'ACTION, pas un tableau de bord exhaustif. Cible :
 * 4 blocs max, 1 chiffre = 1 affichage.
 *  - Bloc 1 (Devise) + Bloc 2 (Prochaine action = AvatarCoach) vivent
 *    above-the-fold dans `app/teen/page.tsx`.
 *  - Bloc 3 (Accès rapide = 4 piliers) + Bloc 4 (Complète ton profil,
 *    conditionnel) vivent ici.
 *
 * Retirés de l'accueil (déplacés vers leurs hubs ou supprimés) : 2e hero +
 * OrbitingTokens chiffré, StatHero XP, PriorityMission, OnlineFriends,
 * MapPreview, CrewHub (→ hub Social #207), PurchasingPower (→ Wallet #206),
 * SocialFeed (→ Social), MarketplaceOverlay (mock, supprimé #201).
 */
interface TeenDashboardContentProps {
  teenId: string
}

/** Coiffe une section : eyebrow mono UPPERCASE charte (§3). */
function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="eyebrow mb-3 block tracking-[0.16em] text-mute">
      {children}
    </span>
  )
}

export function TeenDashboardContent({ teenId }: TeenDashboardContentProps) {
  const { isMobile, mounted } = useDashboardContext()
  const router = useRouter()

  const mobile = mounted ? isMobile : false

  // Pull-to-refresh: revalidate the server component (XP, missions, gauge).
  const handleRefresh = React.useCallback(async () => {
    router.refresh()
    await new Promise((resolve) => setTimeout(resolve, 450))
  }, [router])

  const content = (
    <div className="relative min-h-screen bg-paper text-ink overflow-x-hidden">
      {/* Fond mesh paper conforme charte (§3) — aucun blur/glow/grain. */}
      <MeshBackground className="fixed inset-0 z-0" intensity={0.8} />

      <div className="relative z-10 px-3 sm:px-4 md:px-8 max-w-[1200px] mx-auto space-y-6 md:space-y-8 pb-24 md:pb-10">

        {/* BLOC 3 — ACCÈS RAPIDE (4 piliers) */}
        <section>
          <SectionEyebrow>Accès rapide</SectionEyebrow>
          <StickerCard className="overflow-hidden p-0">
            <Suspense fallback={<QuickAccessSkeleton />}>
              <QuickAccessGrid userId={teenId} />
            </Suspense>
          </StickerCard>
        </section>

        {/* BLOC 4 — COMPLÈTE TON PROFIL (conditionnel : ProfileQuest se masque
            lui-même quand le profil est complet). */}
        <section>
          <SectionEyebrow>Complète ton profil</SectionEyebrow>
          <StickerCard className="overflow-hidden p-4 sm:p-6">
            <Suspense fallback={<CardSkeleton />}>
              <ProfileQuest />
            </Suspense>
          </StickerCard>
        </section>

      </div>
    </div>
  )

  // Mobile: wrap in pull-to-refresh so a downward swipe revalidates dashboard data.
  return mobile ? (
    <PullToRefresh onRefresh={handleRefresh} disabled={!mounted}>
      {content}
    </PullToRefresh>
  ) : (
    content
  )
}
