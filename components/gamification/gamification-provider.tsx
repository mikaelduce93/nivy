"use client"

/**
 * GamificationProvider
 * --------------------
 * Centralise les UI de feedback gamification: XP popups, level up, badges,
 * streaks, celebrations.
 *
 * Wiring LevelUpModal (audit AUDIT_LEVEL_UP_ET_DEFIS Phase 3.1):
 *   - Le provider expose `triggerLevelUp(level, xp)` via le contexte.
 *   - Toute action XP (server action ou cote client) peut declencher la
 *     modale de celebration en l'appelant. Le hook `useGamification`
 *     declenche automatiquement la modale lorsque `XPData.level` augmente
 *     (callback `onLevelUp`).
 *   - LevelUpModal est rendu en superposition avec un z-index 100, sans
 *     interferer avec la CelebrationOverlay.
 */

import * as React from "react"
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import { AnimatePresence } from "framer-motion"
import {
  useGamification,
  type XPData,
  type StreakData,
  type Achievement,
  type DailyChallenge,
  type XPGainEvent,
  type AchievementUnlockEvent,
} from "@/lib/hooks/use-gamification"
import { XPGainPopup } from "./xp-bar"
import { LevelUpAnimation } from "./level-badge"
import { AchievementUnlockModal, AchievementToast } from "./achievement-unlock"
import { StreakBrokenModal } from "./streak-flame"
import { CelebrationOverlay, CelebrationType } from "./celebration-overlay"
import { useXPFloat, XPFloatContainer } from "./xp-float"
import { useJuice } from "@/lib/hooks/use-juice"
import { useAnnounce } from "@/components/a11y/announce-region"
import { NivCelebration } from "@/components/brand"
import { Button } from "@/components/ui/button"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface GamificationContextValue {
  // State
  xp: XPData | null
  streak: StreakData | null
  achievements: Achievement[]
  dailyChallenges: DailyChallenge[]
  loading: boolean
  error: string | null

  // Actions
  refresh: () => void
  showXPGain: (amount: number, reason?: string, coords?: { x: number, y: number }) => void
  showLevelUp: (fromLevel: number, toLevel: number) => void
  /**
   * Déclenche le moment de pic level-up (#187 — surface <NivCelebration>).
   * @param level Nouveau niveau
   * @param xpToNext Conservé pour compat de signature (non utilisé par le pic)
   */
  triggerLevelUp: (level: number, xpToNext?: number) => void
  showAchievementUnlock: (achievement: Achievement, fullModal?: boolean) => void
  showStreakBroken: (previousStreak: number) => void
  triggerCelebration: (type: CelebrationType, title: string, subtitle?: string, xpEarned?: number) => void

  // Teen ID
  teenId: string | null
  setTeenId: (id: string | null) => void
}

const GamificationContext = createContext<GamificationContextValue | null>(null)

/* ==========================================================================
   PROVIDER
   ========================================================================== */

interface GamificationProviderProps {
  children: ReactNode
  initialTeenId?: string
}

export function GamificationProvider({
  children,
  initialTeenId,
}: GamificationProviderProps) {
  // Teen ID state
  const [teenId, setTeenId] = useState<string | null>(initialTeenId || null)

  // UI states for animations/modals
  const [xpPopup, setXPPopup] = useState<{ amount: number; reason?: string } | null>(null)
  const [levelUp, setLevelUp] = useState<{ from: number; to: number } | null>(null)
  // #187 — moment de pic level-up : surface sombre charte <NivCelebration>.
  // Remplace l'ancienne triple pile (LevelUpModal + CelebrationOverlay + Celebrate).
  const [levelUpCelebration, setLevelUpCelebration] = useState<{ level: number } | null>(null)
  const [achievementModal, setAchievementModal] = useState<Achievement | null>(null)
  const [achievementToast, setAchievementToast] = useState<Achievement | null>(null)
  const [streakBroken, setStreakBroken] = useState<number | null>(null)

  // New Celebration Overlay State
  const [celebration, setCelebration] = useState<{
    isOpen: boolean
    type: CelebrationType
    title: string
    subtitle?: string
    xpEarned?: number
    image?: string
  }>({
    isOpen: false,
    type: 'mission-complete',
    title: ''
  })

  // XP Float Hook
  const { floats, showFloat } = useXPFloat()

  // Juice hook — sound + haptic + confetti for the big moments.
  const { play: playJuice } = useJuice()

  // Wave 3 / TICKET-050 — SR announcement on level-up, paired with the
  // existing modal + juice trigger so AT users hear "Niveau supérieur
  // débloqué!" while sighted users see the confetti.
  const announce = useAnnounce()

  // Streak milestones that deserve a flame burst (Phase 1 spec).
  const STREAK_MILESTONES = React.useMemo(() => new Set([3, 7, 14, 30, 60, 100]), [])
  const lastStreakRef = React.useRef<number | null>(null)

  // Callbacks pour les événements
  const handleXPGain = useCallback((event: XPGainEvent) => {
    // If coordinates are provided in the event (custom property), use floating text
    // Otherwise fall back to popup or use center screen float?
    // For now, let's stick to popup for general events, but we can expose a way to trigger float
    setXPPopup({ amount: event.amount, reason: event.reason })
    // Subtle ding + light haptic. Fired often, so kept light on confetti (soft preset).
    playJuice('xp_gain')
  }, [playJuice])

  const handleLevelUp = useCallback((newLevel: number, _oldLevel: number) => {
    // #187 — moment de pic charte : une seule surface <NivCelebration>
    // (confettis charte + prefers-reduced-motion gérés en interne).
    setLevelUpCelebration({ level: newLevel })
    // Big juicy moment: fanfare sound + success haptic + fireworks confetti.
    playJuice('level_up')
    // Wave 3 / TICKET-050 — single SR announcement on the same trigger.
    announce("Niveau supérieur débloqué!")
    // setLevelUp({ from: oldLevel, to: newLevel }) // Disable old animation
  }, [playJuice, announce])

  const handleAchievementUnlock = useCallback((event: AchievementUnlockEvent) => {
    const rarity = event.achievement.rarity || "common"
    if (rarity === "common" || rarity === "rare") {
      setAchievementToast(event.achievement)
      // Achievement toast still gets a meaningful (but lighter) celebration.
      playJuice('quest_complete')
    } else {
      // Use Celebration Overlay for significant achievements
      setCelebration({
        isOpen: true,
        type: 'badge-unlocked',
        title: 'BADGE DÉBLOQUÉ !',
        subtitle: event.achievement.name,
        image: event.achievement.icon,
        xpEarned: event.achievement.points
      })
      // Epic / legendary => full fanfare with heavy haptic.
      playJuice('achievement_unlock')
    }
  }, [playJuice])

  const handleStreakUpdate = useCallback((streak: StreakData) => {
    // Detect streak milestone crossings (3, 7, 14, 30, 60, 100 days).
    const previous = lastStreakRef.current
    const next = streak.current_streak
    lastStreakRef.current = next
    if (previous === null) return // first hydration
    if (next > previous && STREAK_MILESTONES.has(next)) {
      playJuice('streak_milestone')
    }
  }, [playJuice, STREAK_MILESTONES])

  // Hook principal
  const {
    xp,
    streak,
    achievements,
    dailyChallenges,
    loading,
    error,
    refresh,
  } = useGamification({
    teenId: teenId || undefined,
    enableRealtime: true,
    onXPGain: handleXPGain,
    onLevelUp: handleLevelUp,
    onAchievementUnlock: handleAchievementUnlock,
    onStreakUpdate: handleStreakUpdate,
  })

  // Actions manuelles
  const showXPGain = useCallback((amount: number, reason?: string, coords?: { x: number, y: number }) => {
    if (coords) {
      showFloat(coords.x, coords.y, amount)
    } else {
      setXPPopup({ amount, reason })
    }
    playJuice('xp_gain')
  }, [showFloat, playJuice])

  const showLevelUp = useCallback((_fromLevel: number, toLevel: number) => {
    setLevelUpCelebration({ level: toLevel })
    playJuice('level_up')
  }, [playJuice])

  const triggerLevelUp = useCallback((level: number, _xpToNext?: number) => {
    setLevelUpCelebration({ level })
    playJuice('level_up')
  }, [playJuice])

  const showAchievementUnlock = useCallback((achievement: Achievement, fullModal = false) => {
    if (fullModal) {
      setCelebration({
        isOpen: true,
        type: 'badge-unlocked',
        title: 'BADGE DÉBLOQUÉ !',
        subtitle: achievement.name,
        image: achievement.icon,
        xpEarned: achievement.points
      })
      playJuice('achievement_unlock')
    } else {
      setAchievementToast(achievement)
      playJuice('quest_complete')
    }
  }, [playJuice])

  const showStreakBroken = useCallback((previousStreak: number) => {
    setStreakBroken(previousStreak)
    playJuice('warning')
  }, [playJuice])

  const triggerCelebration = useCallback((type: CelebrationType, title: string, subtitle?: string, xpEarned?: number) => {
    setCelebration({
      isOpen: true,
      type,
      title,
      subtitle,
      xpEarned
    })
    // Map celebration type to the right juice signature.
    if (type === 'level-up') playJuice('level_up')
    else if (type === 'badge-unlocked') playJuice('achievement_unlock')
    else if (type === 'streak-milestone') playJuice('streak_milestone')
    else playJuice('quest_complete')
  }, [playJuice])

  return (
    <GamificationContext.Provider
      value={{
        xp,
        streak,
        achievements,
        dailyChallenges,
        loading,
        error,
        refresh,
        showXPGain,
        showLevelUp,
        triggerLevelUp,
        showAchievementUnlock,
        showStreakBroken,
        triggerCelebration,
        teenId,
        setTeenId,
      }}
    >
      {children}

      {/* Floating XP Text */}
      <XPFloatContainer floats={floats} />

      {/* XP Gain Popup */}
      <AnimatePresence>
        {xpPopup && (
          <XPGainPopup
            amount={xpPopup.amount}
            reason={xpPopup.reason}
            onComplete={() => setXPPopup(null)}
          />
        )}
      </AnimatePresence>

      {/* Level Up Animation - Keeping old one as fallback or if needed explicitly, but preferring CelebrationOverlay */}
      <AnimatePresence>
        {levelUp && (
          <LevelUpAnimation
            fromLevel={levelUp.from}
            toLevel={levelUp.to}
            onComplete={() => setLevelUp(null)}
          />
        )}
      </AnimatePresence>

      {/* Achievement Modal (full) - Keeping old one as fallback */}
      <AnimatePresence>
        {achievementModal && (
          <AchievementUnlockModal
            achievement={achievementModal}
            onClose={() => setAchievementModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Achievement Toast */}
      <AnimatePresence>
        {achievementToast && (
          <AchievementToast
            achievement={achievementToast}
            onClose={() => setAchievementToast(null)}
          />
        )}
      </AnimatePresence>

      {/* Streak Broken Modal */}
      <AnimatePresence>
        {streakBroken !== null && (
          <StreakBrokenModal
            previousStreak={streakBroken}
            onClose={() => setStreakBroken(null)}
          />
        )}
      </AnimatePresence>

      {/* #187 — moment de pic level-up : surface sombre charte plein écran.
          <NivCelebration> déclenche les confettis charte à l'apparition
          (coupés sous prefers-reduced-motion). */}
      {levelUpCelebration && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Niveau supérieur"
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink/80 p-4"
          onClick={() => setLevelUpCelebration(null)}
        >
          <div
            className="w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <NivCelebration
              tone="teal"
              palette="levelup"
              title="Niveau supérieur"
              value={levelUpCelebration.level}
              caption="Continue comme ça, tu déchires !"
              action={
                <Button variant="pink" onClick={() => setLevelUpCelebration(null)}>
                  C&apos;est parti
                </Button>
              }
            />
          </div>
        </div>
      )}

      {/* New Celebration Overlay */}
      <CelebrationOverlay
        isOpen={celebration.isOpen}
        type={celebration.type}
        title={celebration.title}
        subtitle={celebration.subtitle}
        xpEarned={celebration.xpEarned}
        image={celebration.image}
        onClose={() => setCelebration(prev => ({ ...prev, isOpen: false }))}
      />
    </GamificationContext.Provider>
  )
}

/* ==========================================================================
   HOOK
   ========================================================================== */

export function useGamificationContext() {
  const context = useContext(GamificationContext)

  if (!context) {
    throw new Error(
      "useGamificationContext must be used within a GamificationProvider"
    )
  }

  return context
}

/* ==========================================================================
   WRAPPER COMPONENT - Pour initialiser avec un teen spécifique
   ========================================================================== */

interface GamificationWrapperProps {
  teenId: string
  children: ReactNode
}

export function GamificationWrapper({ teenId, children }: GamificationWrapperProps) {
  const { setTeenId } = useGamificationContext()

  useEffect(() => {
    setTeenId(teenId)
    return () => setTeenId(null)
  }, [teenId, setTeenId])

  return <>{children}</>
}
