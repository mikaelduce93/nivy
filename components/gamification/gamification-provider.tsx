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
import { LevelUpModal } from "./level-up-modal"
import { AchievementUnlockModal, AchievementToast } from "./achievement-unlock"
import { StreakBrokenModal } from "./streak-flame"
import { CelebrationOverlay, CelebrationType } from "./celebration-overlay"
import { useXPFloat, XPFloatContainer } from "./xp-float"

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
   * Declenche la modale LevelUpModal (audit Phase 3.1).
   * @param level Nouveau niveau
   * @param xpToNext XP restant pour le prochain niveau (optionnel)
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
  const [levelUpModal, setLevelUpModal] = useState<{
    level: number
    xpToNext?: number
  } | null>(null)
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

  // Callbacks pour les événements
  const handleXPGain = useCallback((event: XPGainEvent) => {
    // If coordinates are provided in the event (custom property), use floating text
    // Otherwise fall back to popup or use center screen float?
    // For now, let's stick to popup for general events, but we can expose a way to trigger float
    setXPPopup({ amount: event.amount, reason: event.reason })
  }, [])

  const handleLevelUp = useCallback((newLevel: number, oldLevel: number) => {
    // Audit Phase 3.1: declenche la LevelUpModal dediee (confetti + rewards).
    // CelebrationOverlay reste en place pour les autres types de celebrations.
    setLevelUpModal({ level: newLevel })
    setCelebration({
      isOpen: true,
      type: 'level-up',
      title: `NIVEAU ${newLevel} !`,
      subtitle: `Tu es passé du niveau ${oldLevel} au niveau ${newLevel}`,
      xpEarned: undefined // XP is gained before level up usually
    })
    // setLevelUp({ from: oldLevel, to: newLevel }) // Disable old animation
  }, [])

  const handleAchievementUnlock = useCallback((event: AchievementUnlockEvent) => {
    const rarity = event.achievement.rarity || "common"
    if (rarity === "common" || rarity === "rare") {
      setAchievementToast(event.achievement)
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
      // setAchievementModal(event.achievement) // Disable old modal
    }
  }, [])

  const handleStreakUpdate = useCallback((streak: StreakData) => {
    // Vérifier si le streak a été cassé
  }, [])

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
  }, [showFloat])

  const showLevelUp = useCallback((fromLevel: number, toLevel: number) => {
    setLevelUpModal({ level: toLevel })
    setCelebration({
      isOpen: true,
      type: 'level-up',
      title: `NIVEAU ${toLevel} !`,
      subtitle: `Tu es passé du niveau ${fromLevel} au niveau ${toLevel}`,
    })
  }, [])

  const triggerLevelUp = useCallback((level: number, xpToNext?: number) => {
    setLevelUpModal({ level, xpToNext })
  }, [])

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
    } else {
      setAchievementToast(achievement)
    }
  }, [])

  const showStreakBroken = useCallback((previousStreak: number) => {
    setStreakBroken(previousStreak)
  }, [])

  const triggerCelebration = useCallback((type: CelebrationType, title: string, subtitle?: string, xpEarned?: number) => {
    setCelebration({
      isOpen: true,
      type,
      title,
      subtitle,
      xpEarned
    })
  }, [])

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

      {/* Level Up Modal (audit Phase 3.1) */}
      <LevelUpModal
        isOpen={levelUpModal !== null}
        newLevel={levelUpModal?.level ?? 1}
        xpToNextLevel={levelUpModal?.xpToNext}
        onClose={() => setLevelUpModal(null)}
      />

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
