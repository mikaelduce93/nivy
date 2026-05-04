'use client'

/**
 * TEENS PARTY MOROCCO - Clubs Queries
 * ====================================
 * 
 * Hooks React Query pour la gestion des clubs
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'

type Club = Database['public']['Tables']['clubs']['Row']

interface ClubsQueryParams {
  category?: string
  city?: string
  isActive?: boolean
  limit?: number
}

/**
 * Hook pour récupérer les clubs
 * 
 * @param params - Paramètres de filtrage
 * @returns Query result avec les clubs
 */
export function useClubs(params: ClubsQueryParams = {}) {
  return useQuery({
    queryKey: ['clubs', params],
    queryFn: async () => {
      const supabase = createClient()
      
      let query = supabase
        .from('clubs')
        .select('*')
        .order('name', { ascending: true })
      
      if (params.isActive !== undefined) {
        query = query.eq('is_active', params.isActive)
      } else {
        query = query.eq('is_active', true)
      }
      
      if (params.category) {
        query = query.eq('category', params.category)
      }
      
      if (params.city) {
        query = query.eq('city', params.city)
      }
      
      if (params.limit) {
        query = query.limit(params.limit)
      }
      
      const { data, error } = await query
      
      if (error) {
        throw new Error(`Failed to fetch clubs: ${error.message}`)
      }
      
      return data as Club[]
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook pour récupérer un club par slug
 * 
 * @param slug - Slug du club
 * @param enabled - Activer/désactiver la query
 * @returns Query result avec le club
 */
export function useClub(slug: string | null, enabled = true) {
  return useQuery({
    queryKey: ['clubs', slug],
    queryFn: async () => {
      if (!slug) return null
      
      const supabase = createClient()
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('slug', slug)
        .single()
      
      if (error) {
        throw new Error(`Failed to fetch club: ${error.message}`)
      }
      
      return data as Club
    },
    enabled: enabled && !!slug,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook pour récupérer les clubs avec pagination infinie
 */
export function useClubsInfinite(params: ClubsQueryParams = {}) {
  const PAGE_SIZE = 10

  return useInfiniteQuery({
    queryKey: ['clubs', 'infinite', params],
    queryFn: async ({ pageParam = 0 }) => {
      const supabase = createClient()
      
      let query = supabase
        .from('clubs')
        .select('*')
        .eq('is_active', params.isActive !== undefined ? params.isActive : true)
        .order('name', { ascending: true })
        .range(pageParam, pageParam + PAGE_SIZE - 1)
      
      if (params.category) {
        query = query.eq('category', params.category)
      }
      
      if (params.city) {
        query = query.eq('city', params.city)
      }
      
      const { data, error } = await query
      
      if (error) {
        throw new Error(`Failed to fetch clubs: ${error.message}`)
      }
      
      return {
        data: (data as Club[]) || [],
        nextPage: (data?.length || 0) === PAGE_SIZE ? pageParam + PAGE_SIZE : undefined,
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 1000 * 60 * 5,
  })
}

