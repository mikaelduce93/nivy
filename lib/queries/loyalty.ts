'use client'

/**
 * TEENS PARTY MOROCCO - Loyalty Points Queries
 * =============================================
 * 
 * Hooks React Query pour la gestion des points de fidélité
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

interface LoyaltyPoints {
  id: string
  parent_id: string
  points: number
  level: string
  created_at: string
  updated_at: string
}

interface LoyaltyTransaction {
  id: string
  parent_id: string
  points: number
  transaction_type: string
  description: string
  created_at: string
}

/**
 * Hook pour récupérer les points de fidélité de l'utilisateur
 * 
 * @param parentId - ID du parent (optionnel, utilise l'utilisateur actuel si non fourni)
 * @returns Query result avec les points de fidélité
 */
export function useLoyaltyPoints(parentId?: string) {
  return useQuery({
    queryKey: ['loyalty-points', parentId || 'current'],
    queryFn: async () => {
      const supabase = createClient()
      
      // Vérifier l'authentification
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('User not authenticated')
      }
      
      const targetParentId = parentId || user.id
      
      const { data, error } = await supabase
        .from('loyalty_points')
        .select('*')
        .eq('parent_id', targetParentId)
        .single()
      
      if (error) {
        // Si pas de points, retourner une valeur par défaut
        if (error.code === 'PGRST116') {
          return {
            id: '',
            parent_id: targetParentId,
            points: 0,
            level: 'Bronze',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as LoyaltyPoints
        }
        throw new Error(`Failed to fetch loyalty points: ${error.message}`)
      }
      
      return data as LoyaltyPoints
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Hook pour récupérer l'historique des transactions de points
 * 
 * @param parentId - ID du parent (optionnel)
 * @param limit - Nombre de transactions à récupérer (défaut: 20)
 * @returns Query result avec les transactions
 */
export function useLoyaltyTransactions(parentId?: string, limit = 20) {
  return useQuery({
    queryKey: ['loyalty-transactions', parentId || 'current', limit],
    queryFn: async () => {
      const supabase = createClient()
      
      // Vérifier l'authentification
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('User not authenticated')
      }
      
      const targetParentId = parentId || user.id
      
      const { data, error } = await supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('parent_id', targetParentId)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) {
        throw new Error(`Failed to fetch loyalty transactions: ${error.message}`)
      }
      
      return (data as LoyaltyTransaction[]) || []
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Hook pour invalider le cache des points de fidélité
 */
export function useInvalidateLoyalty() {
  const queryClient = useQueryClient()
  
  return {
    invalidatePoints: (parentId?: string) => {
      queryClient.invalidateQueries({ 
        queryKey: ['loyalty-points', parentId || 'current'] 
      })
    },
    invalidateTransactions: (parentId?: string) => {
      queryClient.invalidateQueries({ 
        queryKey: ['loyalty-transactions', parentId || 'current'] 
      })
    },
    invalidateAll: (parentId?: string) => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-points'] })
      queryClient.invalidateQueries({ queryKey: ['loyalty-transactions'] })
    },
  }
}

