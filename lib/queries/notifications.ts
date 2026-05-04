'use client'

/**
 * TEENS PARTY MOROCCO - Notifications Queries
 * ============================================
 * 
 * Hooks React Query pour la gestion des notifications
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  read: boolean
  created_at: string
  link?: string
}

interface NotificationsQueryParams {
  unreadOnly?: boolean
  limit?: number
}

/**
 * Hook pour récupérer les notifications de l'utilisateur
 * 
 * @param params - Paramètres de filtrage
 * @returns Query result avec les notifications
 */
export function useNotifications(params: NotificationsQueryParams = {}) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => {
      const supabase = createClient()
      
      // Vérifier l'authentification
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('User not authenticated')
      }
      
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (params.unreadOnly) {
        query = query.eq('read', false)
      }
      
      if (params.limit) {
        query = query.limit(params.limit)
      } else {
        query = query.limit(50) // Limite par défaut
      }
      
      const { data, error } = await query
      
      if (error) {
        throw new Error(`Failed to fetch notifications: ${error.message}`)
      }
      
      return (data as Notification[]) || []
    },
    staleTime: 1000 * 60 * 1, // 1 minute (notifications changent souvent)
    refetchInterval: 1000 * 60 * 2, // Refetch toutes les 2 minutes
  })
}

/**
 * Hook pour récupérer le nombre de notifications non lues
 * 
 * @returns Query result avec le count
 */
export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const supabase = createClient()
      
      // Vérifier l'authentification
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return 0
      }
      
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
      
      if (error) {
        console.error('Failed to fetch unread count:', error)
        return 0
      }
      
      return count || 0
    },
    staleTime: 1000 * 60 * 1, // 1 minute
    refetchInterval: 1000 * 60 * 1, // Refetch toutes les minutes
  })
}

/**
 * Hook pour marquer une notification comme lue
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const supabase = createClient()
      
      // Vérifier l'authentification
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('User not authenticated')
      }
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)
      
      if (error) {
        throw new Error(`Failed to mark notification as read: ${error.message}`)
      }
    },
    onSuccess: () => {
      // Invalider les queries de notifications
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

/**
 * Hook pour marquer toutes les notifications comme lues
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      
      // Vérifier l'authentification
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('User not authenticated')
      }
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)
      
      if (error) {
        throw new Error(`Failed to mark all notifications as read: ${error.message}`)
      }
    },
    onSuccess: () => {
      // Invalider les queries de notifications
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

