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

/**
 * Fetch all clubs (cached per request)
 */
export const getClubs = cache(async (params?: PaginationParams & { category?: string }) => {
  const supabase = await createClient()
  const page = params?.page ?? 1
  const limit = params?.limit ?? 10
  const offset = (page - 1) * limit

  let query = supabase
    .from('clubs')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (params?.category) {
    query = query.eq('category', params.category)
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1)

  if (error) {
    console.error('[Server] Error fetching clubs:', error)
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
 * Fetch a single club by slug
 */
export const getClubBySlug = cache(async (slug: string) => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    console.error('[Server] Error fetching club:', error)
    return null
  }

  return data
})

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

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (unreadOnly) {
    query = query.eq('read', false)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Server] Error fetching notifications:', error)
    return []
  }

  return data ?? []
})

/**
 * Get user's children profiles
 */
export const getUserChildren = cache(async () => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('parent_id', user.id)
    .order('first_name', { ascending: true })

  if (error) {
    console.error('[Server] Error fetching children:', error)
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

  const [
    { count: eventsCount },
    { count: usersCount },
    { count: bookingsCount },
    { count: clubsCount },
  ] = await Promise.all([
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('clubs').select('*', { count: 'exact', head: true }),
  ])

  return {
    events: eventsCount ?? 0,
    users: usersCount ?? 0,
    bookings: bookingsCount ?? 0,
    clubs: clubsCount ?? 0,
  }
})

/* ==========================================================================
   STATIC DATA (can be revalidated)
   ========================================================================== */

/**
 * Get testimonials for homepage
 */
export const getTestimonials = cache(async (limit = 6) => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[Server] Error fetching testimonials:', error)
    return []
  }

  return data ?? []
})

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
