/**
 * CANONICAL URL MAP — teen domain (Wave 1 + Wave 2, routes-deduplicator)
 * -----------------------------------------------------------------------
 * Domain              Canonical URL                   Non-canonical (redirects to canonical)
 * ------------------- ------------------------------- -------------------------------------------
 * Shop / XP Store     /teen/wallet?tab=shop           /teen/shop  →  canonical (redirect in place)
 * Leaderboard         /gamification/leaderboard       /teen/leaderboard  →  canonical (redirect in place)
 * Achievements        /teen/achievements              /gamification/achievements  →  (if exists, redirect)
 * Défis physiques     /teen/defis-physiques           /gamification/defis-physiques  →  canonical
 *                                                     /teen/challenges  →  re-exports defis-physiques
 * Défis amis          /gamification/defis             (no teen mirror)
 * Missions            /gamification/missions          (no teen/missions; /teen/quests = different feature)
 * Quests              /teen/quests                    (no gamification mirror)
 * Aide scolaire       /teen/aide-scolaire             /gamification/aide-scolaire  →  canonical
 *                                                     /teen/academic  →  handled by duplicate-page-merger (OUT OF SCOPE)
 * Circles / Crews     /teen/circles                   /gamification/crews  →  canonical
 * -----------------------------------------------------------------------
 */
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { TeenSidebar } from "@/components/dashboard/teen/sidebar"
import { TeenHeader } from "@/components/dashboard/teen/header"
import { GamificationProvider } from "@/components/gamification/gamification-provider"
import { EliteAICompanion } from "@/components/ai/elite-ai-companion"
import { ClientErrorBoundary } from "@/components/common/client-error-boundary"
import { PushPermissionPrompt } from "@/components/teen/push-permission-prompt"
import { SkipToContent } from "@/components/ui/skip-to-content"

export default async function TeenLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userInfo = await getUserRole()

  if (!userInfo) {
    redirect("/auth/login")
  }

  if (userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  return (
    <GamificationProvider initialTeenId={userInfo.teenData?.id}>
      <div className="min-h-screen bg-background text-foreground">
        {/* TICKET-049: keyboard skip-link must be the FIRST focusable element
            in the role layout so Tab from the URL bar reveals it before any
            header / sidebar item. */}
        <SkipToContent />
        <div className="pointer-events-none fixed inset-0 bg-dots opacity-20" />
        <TeenHeader userInfo={userInfo} />
        <div className="flex relative">
          <TeenSidebar />
          {/*
            V1.3-B: layout adds a baseline pb-24 mobile / pb-6 desktop to clear the
            ~80px mobile dock for any page that forgets it (e.g. Wave 3 stubs like
            /teen/food, /teen/rides). Pages that already specify pb-32 simply get
            slightly extra trailing space — no layout breakage. This is the
            "lift dock-clearance to layout" recommendation from V3 §1 systemic fix.
          */}
          <main
            id="main-content"
            tabIndex={-1}
            className="relative flex-1 p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6 md:ml-64 outline-none"
          >
            {children}
          </main>
        </div>
        <ClientErrorBoundary>
          <EliteAICompanion
            role="teen"
            teenName={userInfo.fullName?.split(' ')[0] || 'Champ'}
            userId={userInfo.teenData?.id}
            context={userInfo.teenData}
          />
        </ClientErrorBoundary>
        {/*
          V1.2 Wave 3 U3 — deferred push permission prompt. Mounts globally for
          the teen domain, but only renders after the user has demonstrated
          engagement (first quiz pass / first chore complete). The wrapper
          lifts the prompt above the ~80px mobile dock without modifying the
          component itself (constraint: do not touch push-permission-prompt).
        */}
        <ClientErrorBoundary>
          <div className="[&>div]:!bottom-24 md:[&>div]:!bottom-6">
            <PushPermissionPrompt />
          </div>
        </ClientErrorBoundary>
      </div>
    </GamificationProvider>
  )
}
