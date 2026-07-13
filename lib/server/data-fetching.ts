/**
 * TEENS PARTY MOROCCO - Server-Side Data Fetching Utilities
 * =========================================================
 *
 * Utilitaires pour le fetching de données côté serveur.
 * Ces fonctions sont conçues pour être utilisées UNIQUEMENT dans les Server Components.
 *
 * IMPORTANT: Ne jamais importer ce fichier dans un composant 'use client'
 */

import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'

/* ==========================================================================
   TYPES
   ========================================================================== */

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasMore: boolean
}

/* ==========================================================================
   EVENTS
   ========================================================================== */

/**
 * Fetch all upcoming events (cached per request)
 */
export const getUpcomingEvents = cache(async (params?: PaginationParams) => {
  const supabase = await createClient()
  const page = params?.page ?? 1
  const limit = params?.limit ?? 10
  const offset = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('events')
    .select('*', { count: 'exact' })
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[Server] Error fetching events:', error)
    return { data: [], total: 0, page, limit, totalPages: 0, hasMore: false }
  }

  const total = count ?? 0
  const totalPages = Math.ceil(total / limit)

  return {
    data: data ?? [],
    total,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages,
  }
})

/**
 * Fetch a single event by ID (cached per request)
 */
export const getEventById = cache(async (id: string) => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('[Server] Error fetching event:', error)
    return null
  }

  return data
})

/**
 * Fetch featured events for homepage
 */
export const getFeaturedEvents = cache(async (limit = 6) => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('event_date', new Date().toISOString())
    .eq('is_featured', true)
    .order('event_date', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('[Server] Error fetching featured events:', error)
    return []
  }

  return data ?? []
})

/* ==========================================================================
   CLUBS
   ========================================================================== */

// Wave 6E — `getClubs` and `getClubBySlug` removed. Both queried the
// deprecated `public.clubs` table (PGRST205 in prod), had zero callers
// in app/ or components/, and would route to the now-redirect-stubbed
// /clubs/[slug] anyway. The canonical surface is /clubs (Wave 6A list
// page), which queries `sport_clubs` directly without going through
// this helper.

/* ==========================================================================
   USER DATA (Authenticated)
   ========================================================================== */

/**
 * Get current user's profile
 */
export const getCurrentUserProfile = cache(async () => {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('[Server] Error fetching profile:', error)
    return null
  }

  return data
})

/**
 * Get user's reservations
 */
export const getUserReservations = cache(async (params?: PaginationParams) => {
  const supabase = await createClient()
  const page = params?.page ?? 1
  const limit = params?.limit ?? 10
  const offset = (page - 1) * limit

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: [], total: 0, page, limit, totalPages: 0, hasMore: false }
  }

  const { data, error, count } = await supabase
    .from('bookings')
    .select('*, events(*)', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[Server] Error fetching reservations:', error)
    return { data: [], total: 0, page, limit, totalPages: 0, hasMore: false }
  }

  const total = count ?? 0
  const totalPages = Math.ceil(total / limit)

  return {
    data: data ?? [],
    total,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages,
  }
})

/**
 * Get user's notifications
 */
export const getUserNotifications = cache(async (unreadOnly = false) => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  // Live schema: the canonical table is `user_notifications` (no `notifications`
  // table exists) and the read flag is `is_read` (no `read` column).
  let query = supabase
    .from('user_notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (unreadOnly) {
    query = query.eq('is_read', false)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Server] Error fetching notifications:', error)
    return []
  }

  return data ?? []
})

/**
 * Get user's children profiles.
 *
 * @deprecated #28 — no callers in app/components/lib. Repointed to the
 * canonical `teens` table (no `children` table exists) for consistency; prefer
 * /api/parent/teens (parent_teens_overview) for new code.
 */
export const getUserChildren = cache(async () => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('teens')
    .select('*')
    .eq('parent_id', user.id)
    .order('first_name', { ascending: true })

  if (error) {
    console.error('[Server] Error fetching teens:', error)
    return []
  }

  return data ?? []
})

/* ==========================================================================
   ADMIN DATA
   ========================================================================== */

/**
 * Get admin dashboard stats
 */
export const getAdminStats = cache(async () => {
  const supabase = await createClient()

  // Wave 6E — `clubs` count dropped (deprecated `public.clubs` table,
  // PGRST205 in prod). When the canonical sport_clubs admin surface
  // ships, add `supabase.from('sport_clubs')` back here.
  const [
    { count: eventsCount },
    { count: usersCount },
    { count: bookingsCount },
  ] = await Promise.all([
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
  ])

  return {
    events: eventsCount ?? 0,
    users: usersCount ?? 0,
    bookings: bookingsCount ?? 0,
  }
})

/* ==========================================================================
   STATIC DATA (can be revalidated)
   ========================================================================== */

// NOTE: `getTestimonials` was removed — no `testimonials` table exists in the
// live schema (the query always failed with PGRST205). The /temoignages page
// already renders an honest empty state; re-add a fetcher when a real moderated
// testimonials source is wired up.

/**
 * Get partners list
 */
export const getPartners = cache(async () => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('[Server] Error fetching partners:', error)
    return []
  }

  return data ?? []
})
