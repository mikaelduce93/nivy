"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js"

type AnyRow = Record<string, unknown>
type RealtimePayload<T extends AnyRow = AnyRow> = RealtimePostgresChangesPayload<T>

/* ==========================================================================
   TYPES
   ========================================================================== */

export interface XPData {
  total_xp: number
  level: number
  xp_to_next_level: number
}

export interface StreakData {
  current_streak: number
  longest_streak: number
  last_activity_date: string | null
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  points: number
  category: string
  rarity?: "common" | "rare" | "epic" | "legendary"
  unlocked_at?: string | null
  progress?: number
  requirement?: number
}

export interface DailyChallenge {
  id: string
  teen_id: string
  challenge_id: string
  challenge_date: string
  status: "pending" | "completed" | "skipped"
  completed_at?: string | null
  xp_earned?: number
  challenge: {
    id: string
    category: string
    title: string
    description?: string
    xp_reward: number
    validation_type: string
  }
}

export interface GamificationState {
  xp: XPData | null
  streak: StreakData | null
  achievements: Achievement[]
  dailyChallenges: DailyChallenge[]
  loading: boolean
  error: string | null
}

export interface XPGainEvent {
  amount: number
  reason: string
  newTotal: number
  levelUp: boolean
  newLevel?: number
}

export interface AchievementUnlockEvent {
  achievement: Achievement
}

/* ==========================================================================
   HOOK: useGamification
   ========================================================================== */

interface UseGamificationOptions {
  teenId?: string
  enableRealtime?: boolean
  onXPGain?: (event: XPGainEvent) => void
  onLevelUp?: (newLevel: number, oldLevel: number) => void
  onAchievementUnlock?: (event: AchievementUnlockEvent) => void
  onStreakUpdate?: (streak: StreakData) => void
}

export function useGamification(options: UseGamificationOptions = {}) {
  const {
    teenId,
    enableRealtime = true,
    onXPGain,
    onLevelUp,
    onAchievementUnlock,
    onStreakUpdate,
  } = options

  const [state, setState] = useState<GamificationState>({
    xp: null,
    streak: null,
    achievements: [],
    dailyChallenges: [],
    loading: true,
    error: null,
  })

  const channelRef = useRef<RealtimeChannel | null>(null)
  const previousLevelRef = useRef<number | null>(null)

  // Charger les données initiales
  const loadGamificationData = useCallback(async () => {
    if (!teenId) {
      setState((prev) => ({ ...prev, loading: false }))
      return
    }

    try {
      const supabase = createClient()

      // Charger XP
      const { data: xpData, error: xpError } = await supabase
        .from("user_xp")
        .select("*")
        .eq("teen_id", teenId)
        .maybeSingle()

      if (xpError && xpError.code !== "PGRST116") throw xpError

      // Charger Streak
      const { data: streakData, error: streakError } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("teen_id", teenId)
        .maybeSingle()

      if (streakError && streakError.code !== "PGRST116") throw streakError

      // Charger Achievements
      const { data: achievementsData, error: achievementsError } = await supabase
        .from("user_achievements")
        .select(`
          *,
          achievements (*)
        `)
        .eq("teen_id", teenId)

      if (achievementsError) throw achievementsError

      // Charger Daily Challenges
      const today = new Date().toISOString().split("T")[0]
      const { data: challengesData, error: challengesError } = await supabase
        .from("user_challenges")
        .select(`
          *,
          challenge:challenge_id (*)
        `)
        .eq("teen_id", teenId)
        .eq("challenge_date", today)

      if (challengesError) throw challengesError

      const xp: XPData = xpData || { total_xp: 0, level: 1, xp_to_next_level: 100 }
      const streak: StreakData = streakData || {
        current_streak: 0,
        longest_streak: 0,
        last_activity_date: null,
      }

      previousLevelRef.current = xp.level

      setState({
        xp,
        streak,
        achievements: achievementsData?.map((item: any) => ({
          ...item.achievements,
          unlocked_at: item.unlocked_at,
          progress: item.progress,
        })) || [],
        dailyChallenges: challengesData || [],
        loading: false,
        error: null,
      })
    } catch (error: any) {
      console.error("Error loading gamification data:", error)
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }))
    }
  }, [teenId])

  // Setup Realtime
  useEffect(() => {
    if (!teenId || !enableRealtime) return

    const supabase = createClient()

    // Cleanup previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Create new channel
    const channel = supabase
      .channel(`gamification:${teenId}`)
      // XP changes
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_xp",
          filter: `teen_id=eq.${teenId}`,
        },
        (payload: RealtimePayload) => {
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            const newXP = payload.new as unknown as XPData & { teen_id: string }

            setState((prev) => {
              const oldLevel = prev.xp?.level || 1
              const newLevel = newXP.level

              // Détecter level up
              if (newLevel > oldLevel && onLevelUp) {
                onLevelUp(newLevel, oldLevel)
              }

              // Calculer XP gagné
              if (onXPGain && prev.xp) {
                const xpGained = newXP.total_xp - prev.xp.total_xp
                if (xpGained > 0) {
                  onXPGain({
                    amount: xpGained,
                    reason: "Action",
                    newTotal: newXP.total_xp,
                    levelUp: newLevel > oldLevel,
                    newLevel: newLevel > oldLevel ? newLevel : undefined,
                  })
                }
              }

              return {
                ...prev,
                xp: {
                  total_xp: newXP.total_xp,
                  level: newXP.level,
                  xp_to_next_level: newXP.xp_to_next_level,
                },
              }
            })
          }
        }
      )
      // Streak changes
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_streaks",
          filter: `teen_id=eq.${teenId}`,
        },
        (payload: RealtimePayload) => {
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            const newStreak = payload.new as unknown as StreakData & { teen_id: string }

            setState((prev) => ({
              ...prev,
              streak: {
                current_streak: newStreak.current_streak,
                longest_streak: newStreak.longest_streak,
                last_activity_date: newStreak.last_activity_date,
              },
            }))

            if (onStreakUpdate) {
              onStreakUpdate({
                current_streak: newStreak.current_streak,
                longest_streak: newStreak.longest_streak,
                last_activity_date: newStreak.last_activity_date,
              })
            }
          }
        }
      )
      // Achievement unlocks
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_achievements",
          filter: `teen_id=eq.${teenId}`,
        },
        async (payload: RealtimePayload) => {
          const newRow = payload.new as unknown as { achievement_id: string; unlocked_at: string; progress: number }
          const { data: achievementData } = await supabase
            .from("achievements")
            .select("*")
            .eq("id", newRow.achievement_id)
            .single()

          if (achievementData) {
            const newAchievement: Achievement = {
              ...achievementData,
              unlocked_at: newRow.unlocked_at,
              progress: newRow.progress,
            }

            setState((prev) => ({
              ...prev,
              achievements: [...prev.achievements, newAchievement],
            }))

            if (onAchievementUnlock) {
              onAchievementUnlock({ achievement: newAchievement })
            }
          }
        }
      )
      // Challenge updates
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_challenges",
          filter: `teen_id=eq.${teenId}`,
        },
        async (payload: RealtimePayload) => {
          if (payload.eventType === "UPDATE") {
            setState((prev) => ({
              ...prev,
              dailyChallenges: prev.dailyChallenges.map((c) =>
                c.id === payload.new.id
                  ? { ...c, ...payload.new }
                  : c
              ),
            }))
          } else if (payload.eventType === "INSERT") {
            // Charger le challenge complet
            const { data: challengeData } = await supabase
              .from("user_challenges")
              .select(`*, challenge:challenge_id (*)`)
              .eq("id", payload.new.id)
              .single()

            if (challengeData) {
              setState((prev) => ({
                ...prev,
                dailyChallenges: [...prev.dailyChallenges, challengeData],
              }))
            }
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [teenId, enableRealtime, onXPGain, onLevelUp, onAchievementUnlock, onStreakUpdate])

  // Load initial data
  useEffect(() => {
    loadGamificationData()
  }, [loadGamificationData])

  // Refresh function
  const refresh = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true }))
    loadGamificationData()
  }, [loadGamificationData])

  return {
    ...state,
    refresh,
  }
}

/* ==========================================================================
   HOOK: useXP - Version simplifiée pour juste l'XP
   ========================================================================== */

export function useXP(teenId?: string) {
  const [xp, setXP] = useState<XPData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teenId) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    async function loadXP() {
      const { data, error } = await supabase
        .from("user_xp")
        .select("total_xp, level, xp_to_next_level")
        .eq("teen_id", teenId)
        .maybeSingle()

      if (!error && data) {
        setXP(data)
      }
      setLoading(false)
    }

    loadXP()

    // Realtime subscription
    const channel = supabase
      .channel(`xp:${teenId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_xp",
          filter: `teen_id=eq.${teenId}`,
        },
        (payload: RealtimePayload) => {
          if (payload.new) {
            setXP({
              total_xp: (payload.new as any).total_xp,
              level: (payload.new as any).level,
              xp_to_next_level: (payload.new as any).xp_to_next_level,
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teenId])

  return { xp, loading }
}

/* ==========================================================================
   HOOK: useStreak - Version simplifiée pour juste le streak
   ========================================================================== */

export function useStreak(teenId?: string) {
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teenId) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    async function loadStreak() {
      const { data, error } = await supabase
        .from("user_streaks")
        .select("current_streak, longest_streak, last_activity_date")
        .eq("teen_id", teenId)
        .maybeSingle()

      if (!error && data) {
        setStreak(data)
      }
      setLoading(false)
    }

    loadStreak()

    // Realtime subscription
    const channel = supabase
      .channel(`streak:${teenId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_streaks",
          filter: `teen_id=eq.${teenId}`,
        },
        (payload: RealtimePayload) => {
          if (payload.new) {
            setStreak({
              current_streak: (payload.new as any).current_streak,
              longest_streak: (payload.new as any).longest_streak,
              last_activity_date: (payload.new as any).last_activity_date,
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teenId])

  return { streak, loading }
}

/* ==========================================================================
   HOOK: useDailyChallenges
   ========================================================================== */

export function useDailyChallenges(teenId?: string) {
  const [challenges, setChallenges] = useState<DailyChallenge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teenId) {
      setLoading(false)
      return
    }

    const supabase = createClient()
    const today = new Date().toISOString().split("T")[0]

    async function loadChallenges() {
      const { data, error } = await supabase
        .from("user_challenges")
        .select(`
          *,
          challenge:challenge_id (*)
        `)
        .eq("teen_id", teenId)
        .eq("challenge_date", today)

      if (!error && data) {
        setChallenges(data)
      }
      setLoading(false)
    }

    loadChallenges()

    // Realtime subscription
    const channel = supabase
      .channel(`challenges:${teenId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_challenges",
          filter: `teen_id=eq.${teenId}`,
        },
        async (payload: RealtimePayload) => {
          if (payload.eventType === "UPDATE") {
            setChallenges((prev) =>
              prev.map((c) =>
                c.id === payload.new.id ? { ...c, ...payload.new } : c
              )
            )
          } else if (payload.eventType === "INSERT") {
            const { data } = await supabase
              .from("user_challenges")
              .select(`*, challenge:challenge_id (*)`)
              .eq("id", payload.new.id)
              .single()

            if (data) {
              setChallenges((prev) => [...prev, data])
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teenId])

  return { challenges, loading }
}
