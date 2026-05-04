'use client'

/**
 * TEENS PARTY MOROCCO - Events Queries
 * ====================================
 * 
 * Hooks React Query pour la gestion des événements
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'

type Event = Database['public']['Tables']['events']['Row']

interface EventsQueryParams {
  city?: string
  category?: string
  featured?: boolean
  limit?: number
}

/**
 * Hook pour récupérer les événements à venir
 * 
 * @param params - Paramètres de filtrage
 * @returns Query result avec les événements
 * 
 * @example
 * ```tsx
 * const { data: events, isLoading } = useEvents({ city: 'Casablanca' })
 * ```
 */
export function useEvents(params: EventsQueryParams = {}) {
  return useQuery({
    queryKey: ['events', 'upcoming', params],
    queryFn: async () => {
      const supabase = createClient()
      
      let query = supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
      
      if (params.city) {
        query = query.eq('city', params.city)
      }
      
      if (params.category) {
        query = query.eq('category', params.category)
      }
      
      if (params.featured) {
        query = query.eq('is_featured', true)
      }
      
      if (params.limit) {
        query = query.limit(params.limit)
      }
      
      const { data, error } = await query
      
      if (error) {
        throw new Error(`Failed to fetch events: ${error.message}`)
      }
      
      return data as Event[]
    },
    staleTime: 1000 * 60 * 2, // 2 minutes (événements changent souvent)
  })
}

/**
 * Hook pour récupérer un événement par ID
 * 
 * @param eventId - ID de l'événement
 * @param enabled - Activer/désactiver la query
 * @returns Query result avec l'événement
 */
export function useEvent(eventId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['events', eventId],
    queryFn: async () => {
      if (!eventId) return null
      
      const supabase = createClient()
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()
      
      if (error) {
        throw new Error(`Failed to fetch event: ${error.message}`)
      }
      
      return data as Event
    },
    enabled: enabled && !!eventId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook pour récupérer les événements avec pagination infinie
 * 
 * @param params - Paramètres de filtrage
 * @returns Infinite query result
 * 
 * @example
 * ```tsx
 * const {
 *   data,
 *   fetchNextPage,
 *   hasNextPage,
 *   isFetchingNextPage
 * } = useEventsInfinite({ city: 'Casablanca' })
 * ```
 */
export function useEventsInfinite(params: EventsQueryParams = {}) {
  const PAGE_SIZE = 10

  return useInfiniteQuery({
    queryKey: ['events', 'infinite', params],
    queryFn: async ({ pageParam = 0 }) => {
      const supabase = createClient()
      
      let query = supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .range(pageParam, pageParam + PAGE_SIZE - 1)
      
      if (params.city) {
        query = query.eq('city', params.city)
      }
      
      if (params.category) {
        query = query.eq('category', params.category)
      }
      
      if (params.featured) {
        query = query.eq('is_featured', true)
      }
      
      const { data, error } = await query
      
      if (error) {
        throw new Error(`Failed to fetch events: ${error.message}`)
      }
      
      return {
        data: (data as Event[]) || [],
        nextPage: (data?.length || 0) === PAGE_SIZE ? pageParam + PAGE_SIZE : undefined,
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Hook pour récupérer les événements mis en avant
 * 
 * @param limit - Nombre d'événements à récupérer (défaut: 6)
 * @returns Query result avec les événements mis en avant
 */
export function useFeaturedEvents(limit = 6) {
  return useQuery({
    queryKey: ['events', 'featured', limit],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .eq('is_featured', true)
        .order('event_date', { ascending: true })
        .limit(limit)
      
      if (error) {
        throw new Error(`Failed to fetch featured events: ${error.message}`)
      }
      
      return data as Event[]
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook pour invalider le cache des événements
 * 
 * Utile après une mutation (création, mise à jour, suppression)
 */
export function useInvalidateEvents() {
  const queryClient = useQueryClient()
  
  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
    invalidateEvent: (eventId: string) => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId] })
    },
    invalidateUpcoming: () => {
      queryClient.invalidateQueries({ queryKey: ['events', 'upcoming'] })
    },
  }
}

