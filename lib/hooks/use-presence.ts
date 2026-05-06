"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js"

/* ==========================================================================
   TYPES
   ========================================================================== */

export type PresenceStatus = "online" | "away" | "playing" | "busy" | "offline"

export interface UserPresence {
  user_id: string
  status: PresenceStatus
  current_activity: string | null
  current_page: string | null
  last_seen_at: string
  last_heartbeat_at: string
}

export interface FriendPresence {
  user_id: string
  full_name: string
  avatar_url: string | null
  status: PresenceStatus
  current_activity: string | null
  last_seen_at: string | null
}

export interface PresenceState {
  myPresence: UserPresence | null
  friendsPresence: FriendPresence[]
  onlineCount: number
  loading: boolean
  error: string | null
}

export interface PresenceChangeEvent {
  userId: string
  oldStatus: PresenceStatus
  newStatus: PresenceStatus
  activity?: string | null
}

/* ==========================================================================
   HOOK OPTIONS
   ========================================================================== */

interface UsePresenceOptions {
  userId?: string
  enableRealtime?: boolean
  enableHeartbeat?: boolean
  heartbeatInterval?: number // in ms, default 30000 (30s)
  onFriendOnline?: (friend: FriendPresence) => void
  onFriendOffline?: (friend: FriendPresence) => void
  onPresenceChange?: (event: PresenceChangeEvent) => void
}

/* ==========================================================================
   CONSTANTS
   ========================================================================== */

const DEFAULT_HEARTBEAT_INTERVAL = 30000 // 30 seconds
const VISIBILITY_AWAY_TIMEOUT = 60000 // 1 minute of inactivity = away
const API_ENDPOINT = "/api/presence"

/* ==========================================================================
   HOOK: usePresence
   ========================================================================== */

export function usePresence(options: UsePresenceOptions = {}) {
  const {
    userId,
    enableRealtime = true,
    enableHeartbeat = true,
    heartbeatInterval = DEFAULT_HEARTBEAT_INTERVAL,
    onFriendOnline,
    onFriendOffline,
    onPresenceChange,
  } = options

  const [state, setState] = useState<PresenceState>({
    myPresence: null,
    friendsPresence: [],
    onlineCount: 0,
    loading: true,
    error: null,
  })

  const channelRef = useRef<RealtimeChannel | null>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentStatusRef = useRef<PresenceStatus>("online")
  const lastActivityRef = useRef<number>(Date.now())

  // =========================================================================
  // API Helpers
  // =========================================================================

  const updatePresenceAPI = useCallback(async (
    status: PresenceStatus,
    activity?: string | null,
    page?: string | null
  ) => {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          activity,
          page,
          deviceType: getDeviceType(),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update presence")
      }

      return await response.json()
    } catch (error) {
      console.error("Presence update error:", error)
      return null
    }
  }, [])

  const fetchFriendsPresence = useCallback(async () => {
    try {
      const response = await fetch(`${API_ENDPOINT}?type=friends`)
      if (!response.ok) throw new Error("Failed to fetch friends presence")
      
      const data = await response.json()
      
      setState(prev => ({
        ...prev,
        friendsPresence: data.friends || [],
        onlineCount: (data.friends || []).filter(
          (f: FriendPresence) => f.status !== "offline"
        ).length,
        loading: false,
      }))
    } catch (error) {
      console.error("Error fetching friends presence:", error)
      setState(prev => ({ ...prev, loading: false, error: "Failed to load presence" }))
    }
  }, [])

  // =========================================================================
  // Heartbeat Logic
  // =========================================================================

  const sendHeartbeat = useCallback(() => {
    if (document.visibilityState === "hidden") return
    
    const status = currentStatusRef.current
    const page = typeof window !== "undefined" ? window.location.pathname : null
    
    updatePresenceAPI(status, null, page)
  }, [updatePresenceAPI])

  // =========================================================================
  // Visibility & Activity Detection
  // =========================================================================

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "hidden") {
      // Tab hidden - mark as away after timeout
      visibilityTimeoutRef.current = setTimeout(() => {
        currentStatusRef.current = "away"
        updatePresenceAPI("away")
      }, VISIBILITY_AWAY_TIMEOUT)
    } else {
      // Tab visible - mark as online
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current)
      }
      currentStatusRef.current = "online"
      updatePresenceAPI("online")
    }
  }, [updatePresenceAPI])

  // Debounced activity handler to avoid excessive updates
  const activityDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityUpdateRef = useRef<number>(0)
  const ACTIVITY_DEBOUNCE_MS = 10000 // Only update at most every 10 seconds
  
  const handleUserActivity = useCallback(() => {
    const now = Date.now()
    lastActivityRef.current = now
    
    // Only update if was away and now active
    if (currentStatusRef.current === "away") {
      currentStatusRef.current = "online"
      updatePresenceAPI("online")
      lastActivityUpdateRef.current = now
      return
    }
    
    // Debounce: only send activity update if enough time has passed
    if (now - lastActivityUpdateRef.current < ACTIVITY_DEBOUNCE_MS) {
      return
    }
    
    // Clear existing debounce timeout
    if (activityDebounceRef.current) {
      clearTimeout(activityDebounceRef.current)
    }
    
    // Debounce the update
    activityDebounceRef.current = setTimeout(() => {
      if (currentStatusRef.current === "online") {
        // Just refresh the heartbeat timestamp
        lastActivityUpdateRef.current = Date.now()
      }
    }, 1000)
  }, [updatePresenceAPI])

  // =========================================================================
  // Public Methods
  // =========================================================================

  const setStatus = useCallback((status: PresenceStatus, activity?: string) => {
    currentStatusRef.current = status
    updatePresenceAPI(status, activity)
    
    setState(prev => ({
      ...prev,
      myPresence: prev.myPresence 
        ? { ...prev.myPresence, status, current_activity: activity || null }
        : null
    }))
  }, [updatePresenceAPI])

  const setActivity = useCallback((activity: string) => {
    updatePresenceAPI(currentStatusRef.current, activity)
    
    setState(prev => ({
      ...prev,
      myPresence: prev.myPresence 
        ? { ...prev.myPresence, current_activity: activity }
        : null
    }))
  }, [updatePresenceAPI])

  const goOffline = useCallback(async () => {
    try {
      await fetch(API_ENDPOINT, { method: "DELETE" })
      currentStatusRef.current = "offline"
      
      setState(prev => ({
        ...prev,
        myPresence: prev.myPresence 
          ? { ...prev.myPresence, status: "offline" }
          : null
      }))
    } catch (error) {
      console.error("Error going offline:", error)
    }
  }, [])

  // =========================================================================
  // Realtime Subscription
  // =========================================================================

  useEffect(() => {
    if (!userId || !enableRealtime) return

    const supabase = createClient()

    // Cleanup previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Create realtime channel for presence changes
    const channel = supabase
      .channel(`presence:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
        },
        (payload: RealtimePostgresChangesPayload<UserPresence>) => {
          const newPresence = payload.new as UserPresence
          const oldPresence = payload.old as UserPresence | undefined
          
          // Update friends list if this is a friend
          setState(prev => {
            const friendIndex = prev.friendsPresence.findIndex(
              f => f.user_id === newPresence.user_id
            )

            if (friendIndex === -1) return prev // Not a friend, ignore

            const oldStatus = prev.friendsPresence[friendIndex].status
            const newStatus = newPresence.status

            // Trigger callbacks and dispatch window events for feed
            if (oldStatus !== newStatus) {
              const friend = prev.friendsPresence[friendIndex]
              
              if (newStatus !== "offline" && oldStatus === "offline") {
                // Friend came online
                if (onFriendOnline) {
                  onFriendOnline({ ...friend, status: newStatus })
                }
                // Dispatch window event for social feed
                dispatchPresenceWindowEvent('came_online', { ...friend, status: newStatus })
              } else if (newStatus === "offline" && oldStatus !== "offline") {
                if (onFriendOffline) {
                  onFriendOffline({ ...friend, status: newStatus })
                }
              } else if (newStatus === "playing" && oldStatus !== "playing") {
                // Friend started playing
                dispatchPresenceWindowEvent('started_playing', { ...friend, status: newStatus })
              }
              
              if (onPresenceChange) {
                onPresenceChange({
                  userId: newPresence.user_id,
                  oldStatus,
                  newStatus,
                  activity: newPresence.current_activity,
                })
              }
            }

            // Update friend in list
            const updatedFriends = [...prev.friendsPresence]
            updatedFriends[friendIndex] = {
              ...updatedFriends[friendIndex],
              status: newStatus,
              current_activity: newPresence.current_activity,
              last_seen_at: newPresence.last_seen_at,
            }

            return {
              ...prev,
              friendsPresence: updatedFriends,
              onlineCount: updatedFriends.filter(f => f.status !== "offline").length,
            }
          })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [userId, enableRealtime, onFriendOnline, onFriendOffline, onPresenceChange])

  // =========================================================================
  // Heartbeat Setup
  // =========================================================================

  useEffect(() => {
    if (!userId || !enableHeartbeat) return

    // Initial presence update
    updatePresenceAPI("online", null, window.location.pathname)

    // Setup heartbeat interval
    heartbeatRef.current = setInterval(sendHeartbeat, heartbeatInterval)

    // Setup visibility change listener
    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Setup activity listeners (debounced)
    const activityEvents = ["mousedown", "keydown", "touchstart", "scroll"]
    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true })
    })

    // Mark offline on page unload
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline marking
      navigator.sendBeacon?.(API_ENDPOINT, JSON.stringify({ 
        status: "offline",
        _method: "DELETE" 
      }))
    }
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (visibilityTimeoutRef.current) clearTimeout(visibilityTimeoutRef.current)
      
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity)
      })
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [userId, enableHeartbeat, heartbeatInterval, sendHeartbeat, handleVisibilityChange, handleUserActivity])

  // =========================================================================
  // Initial Data Load
  // =========================================================================

  useEffect(() => {
    if (userId) {
      fetchFriendsPresence()
    }
  }, [userId, fetchFriendsPresence])

  // =========================================================================
  // Return
  // =========================================================================

  return {
    ...state,
    setStatus,
    setActivity,
    goOffline,
    refresh: fetchFriendsPresence,
    isOnline: (friendId: string) => {
      const friend = state.friendsPresence.find(f => f.user_id === friendId)
      return friend?.status !== "offline"
    },
    getStatus: (friendId: string) => {
      const friend = state.friendsPresence.find(f => f.user_id === friendId)
      return friend?.status || "offline"
    },
  }
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

function getDeviceType(): "mobile" | "tablet" | "desktop" | "unknown" {
  if (typeof window === "undefined") return "unknown"
  
  const ua = navigator.userAgent
  if (/Mobi|Android/i.test(ua)) return "mobile"
  if (/Tablet|iPad/i.test(ua)) return "tablet"
  return "desktop"
}

// Dispatch window events for social feed integration
function dispatchPresenceWindowEvent(type: string, friend: FriendPresence) {
  if (typeof window === "undefined") return
  
  const eventName = type === 'came_online' 
    ? 'presence:friend_online' 
    : 'presence:friend_playing'
  
  window.dispatchEvent(new CustomEvent(eventName, {
    detail: { friend, type }
  }))
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export type { UsePresenceOptions }
