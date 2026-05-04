'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

/* ==========================================================================
   MOBILE DETECTION HOOK
   ========================================================================== */

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

interface MobileDetectionResult {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  deviceType: DeviceType
  mounted: boolean
}

export function useMobileDetection(): MobileDetectionResult {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    const checkDevice = () => {
      const width = window.innerWidth
      if (width < 640) {
        setDeviceType('mobile')
      } else if (width < 1024) {
        setDeviceType('tablet')
      } else {
        setDeviceType('desktop')
      }
    }
    
    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return {
    isMobile: mounted && deviceType === 'mobile',
    isTablet: mounted && deviceType === 'tablet',
    isDesktop: mounted && deviceType === 'desktop',
    deviceType: mounted ? deviceType : 'desktop',
    mounted,
  }
}

/* ==========================================================================
   REDUCED MOTION HOOK
   ========================================================================== */

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}

/* ==========================================================================
   TEEN DATA HOOK
   ========================================================================== */

interface TeenProfile {
  id: string
  full_name: string
  username?: string
  avatar_url?: string
  level: number
  total_xp: number
  current_streak: number
  coins: number
}

interface UseTeenDataResult {
  profile: TeenProfile | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useTeenData(userId: string | undefined): UseTeenDataResult {
  const [profile, setProfile] = useState<TeenProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const supabase = createClient()
      
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', userId)
        .single()
      
      if (profileError) throw profileError

      // Fetch teen-specific data
      const { data: teenData } = await supabase
        .from('teen_full_profile')
        .select('username, level')
        .eq('id', userId)
        .single()

      // Fetch XP
      const { data: xpData } = await supabase
        .rpc('get_user_xp', { user_id: userId })
        .single()

      // Fetch streak
      const { data: streakData } = await supabase
        .from('user_streaks')
        .select('current_streak')
        .eq('user_id', userId)
        .single()

      // Fetch coins
      const { data: coinsData } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', userId)
        .single()

      setProfile({
        id: userId,
        full_name: profileData?.full_name || 'Teen',
        username: teenData?.username,
        avatar_url: profileData?.avatar_url,
        level: teenData?.level || 1,
        total_xp: xpData?.total_xp || 0,
        current_streak: streakData?.current_streak || 0,
        coins: coinsData?.balance || 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { profile, loading, error, refetch: fetchData }
}

/* ==========================================================================
   REALTIME SUBSCRIPTION HOOK
   ========================================================================== */

interface RealtimeOptions {
  table: string
  filter?: string
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
}

export function useRealtime(userId: string | undefined, options: RealtimeOptions) {
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    
    const channel = supabase
      .channel(`${options.table}-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: options.table,
          filter: options.filter,
        },
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          if (payload.eventType === 'INSERT' && options.onInsert) {
            options.onInsert(payload.new)
          } else if (payload.eventType === 'UPDATE' && options.onUpdate) {
            options.onUpdate(payload.new)
          } else if (payload.eventType === 'DELETE' && options.onDelete) {
            options.onDelete(payload.old)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, options.table, options.filter, options.onInsert, options.onUpdate, options.onDelete])
}

/* ==========================================================================
   NOTIFICATIONS HOOK
   ========================================================================== */

interface NotificationCounts {
  quests: number
  social: number
  wallet: number
  total: number
}

export function useNotificationCounts(userId: string | undefined): NotificationCounts {
  const [counts, setCounts] = useState<NotificationCounts>({
    quests: 0,
    social: 0,
    wallet: 0,
    total: 0,
  })

  useEffect(() => {
    if (!userId) return

    const fetchCounts = async () => {
      const supabase = createClient()
      
      // Fetch unread notifications by type
      const { data } = await supabase
        .from('notifications')
        .select('type')
        .eq('user_id', userId)
        .eq('read', false)

      if (data) {
        const quests = data.filter((n: { type: string }) => n.type === 'quest' || n.type === 'challenge').length
        const social = data.filter((n: { type: string }) => n.type === 'friend' || n.type === 'crew').length
        const wallet = data.filter((n: { type: string }) => n.type === 'reward' || n.type === 'purchase').length
        
        setCounts({
          quests,
          social,
          wallet,
          total: quests + social + wallet,
        })
      }
    }

    fetchCounts()

    // Subscribe to new notifications
    const supabase = createClient()
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchCounts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return counts
}

/* ==========================================================================
   HAPTIC FEEDBACK HOOK
   ========================================================================== */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

export function useHaptic() {
  const trigger = useCallback((style: HapticStyle = 'light') => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    
    if ('vibrate' in navigator) {
      const patterns: Record<HapticStyle, number | number[]> = {
        light: 10,
        medium: 25,
        heavy: 50,
        success: [10, 50, 10],
        warning: [25, 50, 25],
        error: [50, 100, 50],
      }
      navigator.vibrate(patterns[style])
    }
  }, [])

  return { trigger }
}

/* ==========================================================================
   COMBINED DASHBOARD CONTEXT
   ========================================================================== */

export interface DashboardContext {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  deviceType: DeviceType
  prefersReducedMotion: boolean
  mounted: boolean
}

export function useDashboardContext(): DashboardContext {
  const { isMobile, isTablet, isDesktop, deviceType, mounted } = useMobileDetection()
  const prefersReducedMotion = useReducedMotion()

  return useMemo(() => ({
    isMobile,
    isTablet,
    isDesktop,
    deviceType,
    prefersReducedMotion,
    mounted,
  }), [isMobile, isTablet, isDesktop, deviceType, prefersReducedMotion, mounted])
}
