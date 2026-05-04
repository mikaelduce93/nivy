'use client'

/**
 * TEENS PARTY MOROCCO - Bookings Queries
 * ======================================
 * 
 * Hooks React Query pour la gestion des réservations
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'

type Booking = Database['public']['Tables']['bookings']['Row']
type BookingWithEvent = Booking & {
  events?: Database['public']['Tables']['events']['Row']
  booking_tickets?: Array<Database['public']['Tables']['booking_tickets']['Row']>
}

interface BookingsQueryParams {
  status?: string
  parentId?: string
  teenId?: string
  eventId?: string
  limit?: number
}

/**
 * Hook pour récupérer les réservations d'un parent
 * 
 * @param params - Paramètres de filtrage
 * @returns Query result avec les réservations
 */
export function useBookings(params: BookingsQueryParams = {}) {
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: async () => {
      const supabase = createClient()
      
      // Vérifier l'authentification
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }
      
      let query = supabase
        .from('bookings')
        .select(`
          *,
          events (
            id,
            title,
            event_date,
            event_time,
            venue_name,
            city,
            image_url
          ),
          booking_tickets (
            id,
            ticket_type,
            price,
            qr_code,
            checked_in
          )
        `)
        .order('created_at', { ascending: false })
      
      // Filtrer par parent_id si pas spécifié dans params
      if (params.parentId) {
        query = query.eq('parent_id', params.parentId)
      } else {
        query = query.eq('parent_id', user.id)
      }
      
      if (params.status) {
        query = query.eq('status', params.status)
      }
      
      if (params.teenId) {
        query = query.eq('teen_id', params.teenId)
      }
      
      if (params.eventId) {
        query = query.eq('event_id', params.eventId)
      }
      
      if (params.limit) {
        query = query.limit(params.limit)
      }
      
      const { data, error } = await query
      
      if (error) {
        throw new Error(`Failed to fetch bookings: ${error.message}`)
      }
      
      return (data as BookingWithEvent[]) || []
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Hook pour récupérer une réservation par ID
 * 
 * @param bookingId - ID de la réservation
 * @param enabled - Activer/désactiver la query
 * @returns Query result avec la réservation
 */
export function useBooking(bookingId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['bookings', bookingId],
    queryFn: async () => {
      if (!bookingId) return null
      
      const supabase = createClient()
      
      // Vérifier l'authentification
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          events (
            id,
            title,
            description,
            event_date,
            event_time,
            venue_name,
            city,
            image_url,
            price
          ),
          booking_tickets (
            id,
            ticket_type,
            price,
            qr_code,
            checked_in,
            children (
              prenom,
              nom
            )
          )
        `)
        .eq('id', bookingId)
        .single()
      
      if (error) {
        throw new Error(`Failed to fetch booking: ${error.message}`)
      }
      
      // Vérifier que l'utilisateur a accès à cette réservation
      if (data.parent_id !== user.id) {
        throw new Error('Unauthorized access to booking')
      }
      
      return data as BookingWithEvent
    },
    enabled: enabled && !!bookingId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook pour récupérer les réservations avec pagination infinie
 * 
 * @param params - Paramètres de filtrage
 * @returns Infinite query result
 */
export function useBookingsInfinite(params: BookingsQueryParams = {}) {
  const PAGE_SIZE = 10

  return useInfiniteQuery({
    queryKey: ['bookings', 'infinite', params],
    queryFn: async ({ pageParam = 0 }) => {
      const supabase = createClient()
      
      // Vérifier l'authentification
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }
      
      let query = supabase
        .from('bookings')
        .select(`
          *,
          events (
            id,
            title,
            event_date,
            event_time,
            venue_name,
            city,
            image_url
          )
        `)
        .eq('parent_id', params.parentId || user.id)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1)
      
      if (params.status) {
        query = query.eq('status', params.status)
      }
      
      if (params.teenId) {
        query = query.eq('teen_id', params.teenId)
      }
      
      if (params.eventId) {
        query = query.eq('event_id', params.eventId)
      }
      
      const { data, error } = await query
      
      if (error) {
        throw new Error(`Failed to fetch bookings: ${error.message}`)
      }
      
      return {
        data: (data as BookingWithEvent[]) || [],
        nextPage: (data?.length || 0) === PAGE_SIZE ? pageParam + PAGE_SIZE : undefined,
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Hook pour récupérer les réservations à venir
 * 
 * @param params - Paramètres de filtrage
 * @returns Query result avec les réservations à venir
 */
export function useUpcomingBookings(params: Omit<BookingsQueryParams, 'status'> = {}) {
  return useQuery({
    queryKey: ['bookings', 'upcoming', params],
    queryFn: async () => {
      const supabase = createClient()
      
      // Vérifier l'authentification
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }
      
      const today = new Date().toISOString().split('T')[0]
      
      let query = supabase
        .from('bookings')
        .select(`
          *,
          events (
            id,
            title,
            event_date,
            event_time,
            venue_name,
            city,
            image_url
          )
        `)
        .eq('parent_id', params.parentId || user.id)
        .eq('status', 'confirmed')
        .gte('events.event_date', today)
        .order('events.event_date', { ascending: true })
      
      if (params.teenId) {
        query = query.eq('teen_id', params.teenId)
      }
      
      if (params.limit) {
        query = query.limit(params.limit)
      }
      
      const { data, error } = await query
      
      if (error) {
        throw new Error(`Failed to fetch upcoming bookings: ${error.message}`)
      }
      
      return (data as BookingWithEvent[]) || []
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Hook pour invalider le cache des réservations
 */
export function useInvalidateBookings() {
  const queryClient = useQueryClient()
  
  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
    invalidateBooking: (bookingId: string) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', bookingId] })
    },
    invalidateUpcoming: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'upcoming'] })
    },
  }
}

