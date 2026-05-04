'use client'

/**
 * TEENS PARTY MOROCCO - Profiles Queries
 * =======================================
 * 
 * Hooks React Query pour la gestion des profils utilisateurs
 */

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']
type Child = Database['public']['Tables']['children']['Row']

/**
 * Hook pour récupérer le profil de l'utilisateur actuel
 * 
 * @returns Query result avec le profil
 */
export function useProfile() {
  return useQuery({
    queryKey: ['profile', 'current'],
    queryFn: async () => {
      const supabase = createClient()
      
      // Vérifier l'authentification
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('User not authenticated')
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (error) {
        throw new Error(`Failed to fetch profile: ${error.message}`)
      }
      
      return data as Profile
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook pour récupérer les enfants d'un parent
 * 
 * @param parentId - ID du parent (optionnel, utilise l'utilisateur actuel si non fourni)
 * @returns Query result avec les enfants
 */
export function useChildren(parentId?: string) {
  return useQuery({
    queryKey: ['children', parentId || 'current'],
    queryFn: async () => {
      const supabase = createClient()
      
      // Vérifier l'authentification
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('User not authenticated')
      }
      
      const targetParentId = parentId || user.id
      
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', targetParentId)
        .order('prenom', { ascending: true })
      
      if (error) {
        throw new Error(`Failed to fetch children: ${error.message}`)
      }
      
      return (data as Child[]) || []
    },
    enabled: !!parentId || true, // Toujours activé si parentId fourni ou utilisateur connecté
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook pour récupérer un enfant par ID
 * 
 * @param childId - ID de l'enfant
 * @param enabled - Activer/désactiver la query
 * @returns Query result avec l'enfant
 */
export function useChild(childId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['children', childId],
    queryFn: async () => {
      if (!childId) return null
      
      const supabase = createClient()
      
      // Vérifier l'authentification
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('User not authenticated')
      }
      
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('id', childId)
        .single()
      
      if (error) {
        throw new Error(`Failed to fetch child: ${error.message}`)
      }
      
      // Vérifier que l'enfant appartient au parent
      if (data.parent_id !== user.id) {
        throw new Error('Unauthorized access to child')
      }
      
      return data as Child
    },
    enabled: enabled && !!childId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

