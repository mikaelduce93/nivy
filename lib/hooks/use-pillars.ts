"use client"

import { useState, useEffect, useCallback } from "react"
import type { PillarScores } from "@/components/gamification/pillars"

interface UsePillarsOptions {
  teenId: string
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UsePillarsReturn {
  scores: PillarScores | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  recalculate: (pillar?: "school" | "sport" | "crea") => Promise<void>
  claimBonus: () => Promise<{ success: boolean; xpBonus?: number; tier?: string }>
}

export function usePillars({
  teenId,
  autoRefresh = false,
  refreshInterval = 60000,
}: UsePillarsOptions): UsePillarsReturn {
  const [scores, setScores] = useState<PillarScores | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchScores = useCallback(async () => {
    if (!teenId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { fetchWithTimeout } = await import('@/lib/fetch/with-timeout')
      const response = await fetchWithTimeout(`/api/gamification/pillars?teenId=${teenId}`, {
        timeout: 10000, // 10 seconds
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch pillar scores")
      }

      setScores(data.scores)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [teenId])

  const recalculate = useCallback(async (pillar?: "school" | "sport" | "crea") => {
    if (!teenId) return

    try {
      setLoading(true)
      setError(null)

      const { fetchWithTimeout } = await import('@/lib/fetch/with-timeout')
      const response = await fetchWithTimeout("/api/gamification/pillars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teenId,
          action: "recalculate",
          pillar,
        }),
        timeout: 10000, // 10 seconds
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to recalculate")
      }

      // Refetch to get updated scores
      await fetchScores()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [teenId, fetchScores])

  const claimBonus = useCallback(async () => {
    if (!teenId) {
      return { success: false }
    }

    try {
      setLoading(true)
      setError(null)

      const { fetchWithTimeout } = await import('@/lib/fetch/with-timeout')
      const response = await fetchWithTimeout("/api/gamification/pillars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teenId,
          action: "claim_bonus",
        }),
        timeout: 10000, // 10 seconds
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to claim bonus")
      }

      // Refetch to get updated scores
      await fetchScores()

      return {
        success: data.result?.success || false,
        xpBonus: data.result?.bonus_xp,
        tier: data.result?.balance_tier,
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      return { success: false }
    } finally {
      setLoading(false)
    }
  }, [teenId, fetchScores])

  // Initial fetch
  useEffect(() => {
    fetchScores()
  }, [fetchScores])

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !teenId) return

    const interval = setInterval(fetchScores, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchScores, teenId])

  return {
    scores,
    loading,
    error,
    refetch: fetchScores,
    recalculate,
    claimBonus,
  }
}
