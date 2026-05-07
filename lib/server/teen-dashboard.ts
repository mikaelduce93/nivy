import "server-only"

import { createClient } from "@/lib/supabase/server"
import { getActivityFeed } from "@/gamification-system/features/activity-feed/actions"
import { getDailyMissions } from "@/gamification-system/features/missions/actions"
import { getActivityHistory, getLifetimeStats, updateLoginStreak } from "@/gamification-system/features/stats-dashboard/actions"
import { getRewards, getUsablePurchases } from "@/gamification-system/features/shop/actions"

type PermissionsSummaryItem = {
  label: string
  allowed: boolean
}

export type DashboardEvent = {
  id: string
  title: string
  date: string
  time?: string | null
  venue?: string | null
  city?: string | null
  imageUrl?: string | null
  category?: string | null
  rsvpStatus: "confirmed" | "pending" | "cancelled" | "none"
  rsvpLabel: string
  capacity: number | null
  remaining: number | null
  distanceLabel: string | null
  isFeatured: boolean
  score: number
}

export type TeenDashboardData = {
  teenId: string | null
  parentId: string | null
  interests: string[]
  currentStreak: number
  xp: {
    total: number
    level: number
    xpToNextLevel: number
    xpInLevel: number
    progressPercent: number
  }
  /** Real coin balance from `user_coins.balance`, plus this-week cashback total. */
  coins: {
    balance: number
    cashbackThisWeek: number
  }
  nextReward: {
    name: string
    xpCost: number
    progressPercent: number
  } | null
  upcomingEvents: DashboardEvent[]
  nextBestAction: {
    mission?: {
      id: string
      name: string
      xp: number
      progress: number
      status: string
    }
    event?: DashboardEvent
    reward?: {
      id: string
      name: string
      expiresAt?: string | null
    }
  }
  dailyMissions: any[]
  socialFeed: any[]
  permissionsSummary: PermissionsSummaryItem[]
  weeklyGoals: Array<{ label: string; current: number; target: number }>
  monthlyGoals: Array<{ label: string; current: number; target: number }>
  shopHighlights: {
    featured?: { name: string; xpCost: number }
    newDrop?: { name: string; xpCost: number }
    promo?: { name: string; xpCost: number; originalXpCost: number }
  }
}

function calculateLevelProgress(totalXp: number) {
  let level = 1
  let xpRequired = 0
  let xpForNext = Math.floor(100 * level * 1.5)

  while (totalXp >= xpRequired + xpForNext) {
    xpRequired += xpForNext
    level += 1
    xpForNext = Math.floor(100 * level * 1.5)
  }

  const xpInLevel = Math.max(0, totalXp - xpRequired)
  const progressPercent = xpForNext > 0 ? Math.round((xpInLevel / xpForNext) * 100) : 0

  return { level, xpToNextLevel: xpForNext, xpInLevel, progressPercent }
}

function pickNumber(value: any): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function getCoordinate(source: any, keys: string[]): number | null {
  for (const key of keys) {
    const value = pickNumber(source?.[key])
    if (value !== null) return value
  }
  return null
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return 6371 * c
}

function buildDistanceLabel(event: any, teenProfile: any): string | null {
  const teenLat = getCoordinate(teenProfile, ["latitude", "lat", "geo_lat", "location_lat"])
  const teenLng = getCoordinate(teenProfile, ["longitude", "lng", "geo_lng", "location_lng"])
  const eventLat = getCoordinate(event, ["latitude", "lat", "venue_lat", "venue_latitude"])
  const eventLng = getCoordinate(event, ["longitude", "lng", "venue_lng", "venue_longitude"])

  if (teenLat !== null && teenLng !== null && eventLat !== null && eventLng !== null) {
    const distanceKm = haversineKm(teenLat, teenLng, eventLat, eventLng)
    return `${Math.round(distanceKm)} km`
  }

  const teenCity = teenProfile?.city || teenProfile?.city_name
  const eventCity = event?.city || event?.location
  if (teenCity && eventCity) {
    return teenCity === eventCity ? "Dans ta ville" : `À ${eventCity}`
  }

  return eventCity ? `À ${eventCity}` : null
}

function getCapacity(event: any): number | null {
  return (
    pickNumber(event?.capacity) ??
    pickNumber(event?.max_capacity) ??
    pickNumber(event?.total_capacity) ??
    pickNumber(event?.seats_available) ??
    null
  )
}

function computeEventScore(event: any, interests: string[]): number {
  let score = 0
  if (event?.is_featured) score += 30
  if (event?.category && interests.includes(event.category)) score += 20
  if (event?.event_date) {
    const daysUntil = Math.max(
      0,
      Math.round((new Date(event.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    )
    score += Math.max(0, 20 - daysUntil)
  }
  return score
}

export async function getTeenDashboardData(options?: { eventsLimit?: number }): Promise<TeenDashboardData | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: teenProfile } = await supabase
    .from("teen_full_profile")
    .select(
      "id, full_name, interests, level, total_xp, coins_balance, coins_earned, coins_topup, streak, primary_parent_id, city"
    )
    .eq("id", user.id)
    .limit(1)
    .maybeSingle()

  const teenId = teenProfile?.id || null
  const parentId = teenProfile?.primary_parent_id || null
  const interests = Array.isArray(teenProfile?.interests) ? teenProfile.interests : []

  const [missionsResult, lifetimeStats, streakResult, weeklyHistory, monthlyHistory, feedResult, rewardsResult, usablePurchases] =
    await Promise.all([
      getDailyMissions().catch(() => ({ success: false, data: [] })),
      getLifetimeStats().catch(() => null),
      updateLoginStreak().catch(() => ({ success: false, currentStreak: 0 })),
      getActivityHistory(7).catch(() => []),
      getActivityHistory(30).catch(() => []),
      getActivityFeed({ feedType: "friends", limit: 6 }).catch(() => ({ success: false, activities: [] })),
      getRewards().catch((err) => ({ data: [], error: err.message })),
      getUsablePurchases().catch((err) => ({ data: [], error: err.message })),
    ])

  const totalXp = teenProfile?.total_xp ?? lifetimeStats?.total_xp ?? 0
  const xpProgress = calculateLevelProgress(totalXp)

  // Coins — read live from user_coins (W3.1). The teen_full_profile mirror may
  // be stale; user_coins is the source of truth for the balance.
  const { data: coinsRow } = await supabase
    .from("user_coins")
    .select("balance")
    .eq("teen_id", user.id)
    .limit(1)
    .maybeSingle()
  const coinBalance = coinsRow?.balance ?? teenProfile?.coins_balance ?? 0

  // This-week cashback total (XP earned via spend cashback in last 7 days).
  // Source: xp_transactions where source_type='cashback' (provenance from
  // add_xp_to_user). Falls back to 0 if the table/column is absent.
  let cashbackThisWeek = 0
  try {
    const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: cashbackRows } = await supabase
      .from("xp_transactions")
      .select("amount, source_type, created_at")
      .eq("teen_id", user.id)
      .eq("source_type", "cashback")
      .gte("created_at", sinceIso)
    cashbackThisWeek = (cashbackRows || []).reduce(
      (acc: number, row: { amount?: number | null }) => acc + (row.amount || 0),
      0
    )
  } catch {
    cashbackThisWeek = 0
  }
  const currentStreak = streakResult.success
    ? streakResult.currentStreak
    : teenProfile?.streak ?? lifetimeStats?.current_login_streak ?? 0

  const rewards = rewardsResult.data || []
  const nextRewardCandidate = rewards
    .filter((reward) => reward.xp_cost > totalXp)
    .sort((a, b) => a.xp_cost - b.xp_cost)[0]

  const nextReward = nextRewardCandidate
    ? {
        name: nextRewardCandidate.name,
        xpCost: nextRewardCandidate.xp_cost,
        progressPercent: Math.min(100, Math.round((totalXp / nextRewardCandidate.xp_cost) * 100)),
      }
    : null

  const todayIso = new Date().toISOString()
  const eventsLimit = options?.eventsLimit ?? 6
  const { data: eventsData } = await supabase
    .from("events")
    .select("*")
    .gte("event_date", todayIso)
    .order("event_date", { ascending: true })
    .limit(eventsLimit)

  const eventIds = (eventsData || []).map((event: any) => event.id).filter(Boolean)

  let bookingsData: any[] = []
  if (eventIds.length > 0) {
    let query = supabase
      .from("bookings")
      .select("id, status, event_id, teen_id, parent_id")
      .in("event_id", eventIds)

    if (teenId) {
      query = query.eq("teen_id", teenId)
    } else if (parentId) {
      query = query.eq("parent_id", parentId)
    }

    const { data } = await query
    bookingsData = data || []
  }

  const bookingsByEvent = new Map<string, any>()
  bookingsData.forEach((booking) => {
    if (booking?.event_id) bookingsByEvent.set(booking.event_id, booking)
  })

  const upcomingEvents: DashboardEvent[] = (eventsData || []).map((event: any) => {
    const booking = bookingsByEvent.get(event.id)
    const status = booking?.status || "none"
    const rsvpStatus =
      status === "confirmed" ? "confirmed" : status === "pending" ? "pending" : status === "cancelled" ? "cancelled" : "none"
    const rsvpLabel =
      rsvpStatus === "confirmed" ? "Inscrit" : rsvpStatus === "pending" ? "En attente" : rsvpStatus === "cancelled" ? "Annulé" : "Disponible"
    const capacity = getCapacity(event)
    const remaining =
      pickNumber(event?.remaining_spots) ??
      pickNumber(event?.available_spots) ??
      (capacity !== null
        ? Math.max(0, capacity - (pickNumber(event?.current_attendees) ?? pickNumber(event?.booked_count) ?? 0))
        : null)

    return {
      id: event.id,
      title: event.title,
      date: event.event_date,
      time: event.event_time,
      venue: event.venue_name,
      city: event.city,
      imageUrl: event.image_url,
      category: event.category,
      rsvpStatus,
      rsvpLabel,
      capacity,
      remaining,
      distanceLabel: buildDistanceLabel(event, teenProfile),
      isFeatured: !!event.is_featured,
      score: computeEventScore(event, interests),
    }
  })

  const recommendedEvents = [...upcomingEvents].sort((a, b) => b.score - a.score)

  const dailyMissions = missionsResult.data || []
  const bestMission = dailyMissions.find(
    (mission: any) => mission.status !== "completed" && mission.status !== "claimed"
  )

  const bestEvent = recommendedEvents.find((event) => event.rsvpStatus === "none")
  const rewardPurchase = (usablePurchases.data || [])[0]

  const weeklyTotals = weeklyHistory.reduce(
    (acc, day) => {
      acc.xp += day.xp_earned || 0
      acc.challenges += day.challenges_completed || 0
      acc.events += day.events_attended || 0
      acc.coins += day.coins_earned || 0
      acc.social += (day.messages_sent || 0) + (day.friends_made || 0)
      return acc
    },
    { xp: 0, challenges: 0, events: 0, coins: 0, social: 0 }
  )

  const monthlyTotals = monthlyHistory.reduce(
    (acc, day) => {
      acc.xp += day.xp_earned || 0
      acc.challenges += day.challenges_completed || 0
      acc.events += day.events_attended || 0
      acc.coins += day.coins_earned || 0
      acc.social += (day.messages_sent || 0) + (day.friends_made || 0)
      return acc
    },
    { xp: 0, challenges: 0, events: 0, coins: 0, social: 0 }
  )

  const { data: relationship } = await supabase
    .from("parent_teen_links")
    .select("*")
    .eq("teen_id", teenId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle()

  const permissions = (relationship as { permissions?: Record<string, boolean> } | null)?.permissions || {}
  const permissionsSummary: PermissionsSummaryItem[] = [
    { label: "Voir ton activité", allowed: !!permissions.can_view_activity },
    { label: "Valider les events", allowed: !!permissions.can_approve_events },
    { label: "Recharger des crédits", allowed: !!permissions.can_topup_credits },
    { label: "Fixer un budget", allowed: !!permissions.can_set_spending_limit },
    { label: "Voir ta localisation", allowed: !!permissions.can_view_location },
  ]

  const featured = rewards.find((reward) => reward.is_featured)
  const newDrop = rewards.find((reward) => reward.is_new)
  const promo = rewards.find((reward) => reward.original_xp_cost && reward.original_xp_cost > reward.xp_cost)

  return {
    teenId,
    parentId,
    interests,
    currentStreak,
    xp: {
      total: totalXp,
      level: xpProgress.level,
      xpToNextLevel: xpProgress.xpToNextLevel,
      xpInLevel: xpProgress.xpInLevel,
      progressPercent: xpProgress.progressPercent,
    },
    coins: {
      balance: coinBalance,
      cashbackThisWeek,
    },
    nextReward,
    upcomingEvents,
    nextBestAction: {
      mission: bestMission
        ? {
            id: bestMission.id,
            name: bestMission.name,
            xp: bestMission.xp_reward,
            progress: bestMission.progress_percentage,
            status: bestMission.status,
          }
        : undefined,
      event: bestEvent || undefined,
      reward: rewardPurchase
        ? {
            id: rewardPurchase.purchase_id,
            name: rewardPurchase.reward_name,
            expiresAt: rewardPurchase.expires_at,
          }
        : undefined,
    },
    dailyMissions,
    socialFeed: feedResult.success ? feedResult.activities || [] : [],
    permissionsSummary,
    weeklyGoals: [
      { label: "XP gagné", current: weeklyTotals.xp, target: 500 },
      { label: "Coins gagnés", current: weeklyTotals.coins, target: 300 },
      { label: "Défis complétés", current: weeklyTotals.challenges, target: 5 },
      { label: "Social", current: weeklyTotals.social, target: 20 },
      { label: "Events participés", current: weeklyTotals.events, target: 2 },
    ],
    monthlyGoals: [
      { label: "XP mensuel", current: monthlyTotals.xp, target: 2000 },
      { label: "Coins mensuels", current: monthlyTotals.coins, target: 1200 },
      { label: "Défis mensuels", current: monthlyTotals.challenges, target: 20 },
      { label: "Social mensuel", current: monthlyTotals.social, target: 80 },
      { label: "Events mensuels", current: monthlyTotals.events, target: 6 },
    ],
    shopHighlights: {
      featured: featured ? { name: featured.name, xpCost: featured.xp_cost } : undefined,
      newDrop: newDrop ? { name: newDrop.name, xpCost: newDrop.xp_cost } : undefined,
      promo: promo && promo.original_xp_cost
        ? { name: promo.name, xpCost: promo.xp_cost, originalXpCost: promo.original_xp_cost }
        : undefined,
    },
  }
}

