'use client'

/**
 * TEENS PARTY MOROCCO - Mutations avec Invalidation Automatique
 * ============================================================
 * 
 * Hooks de mutation réutilisables avec invalidation automatique du cache
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'

/**
 * Hook pour créer un événement avec invalidation automatique
 */
export function useCreateEvent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (eventData: any) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalider toutes les queries d'événements
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

/**
 * Hook pour mettre à jour un événement avec invalidation automatique
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ eventId, eventData }: { eventId: string; eventData: any }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', eventId)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Invalider l'événement spécifique et la liste
      queryClient.invalidateQueries({ queryKey: ['events', data.id] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

/**
 * Hook pour supprimer un événement avec invalidation automatique
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
      
      if (error) throw error
      return eventId
    },
    onSuccess: () => {
      // Invalider toutes les queries d'événements
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

/**
 * Hook pour créer une réservation avec invalidation automatique
 */
export function useCreateBooking() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (bookingData: any) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalider toutes les queries de réservations
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      // Invalider aussi les événements (car le nombre de places peut changer)
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

/**
 * Hook pour mettre à jour une réservation avec invalidation automatique
 */
export function useUpdateBooking() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ bookingId, bookingData }: { bookingId: string; bookingData: any }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('bookings')
        .update(bookingData)
        .eq('id', bookingId)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Invalider la réservation spécifique et la liste
      queryClient.invalidateQueries({ queryKey: ['bookings', data.id] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

/**
 * Hook pour annuler une réservation avec invalidation automatique
 */
export function useCancelBooking() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalider toutes les queries de réservations
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      // Invalider aussi les événements
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

/**
 * Hook pour mettre à jour le profil avec invalidation automatique
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (profileData: any) => {
      const supabase = createClient()
      
      // Vérifier l'authentification
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('User not authenticated')
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalider le profil
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

/**
 * Hook pour créer un enfant avec invalidation automatique
 */
export function useCreateChild() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (childData: any) => {
      const supabase = createClient()
      
      // Vérifier l'authentification
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('User not authenticated')
      }
      
      const { data, error } = await supabase
        .from('children')
        .insert({ ...childData, parent_id: user.id })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalider la liste des enfants
      queryClient.invalidateQueries({ queryKey: ['children'] })
    },
  })
}

/**
 * Hook pour mettre à jour un enfant avec invalidation automatique
 */
export function useUpdateChild() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ childId, childData }: { childId: string; childData: any }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('children')
        .update(childData)
        .eq('id', childId)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Invalider l'enfant spécifique et la liste
      queryClient.invalidateQueries({ queryKey: ['children', data.id] })
      queryClient.invalidateQueries({ queryKey: ['children'] })
    },
  })
}

/**
 * Hook pour supprimer un enfant avec invalidation automatique
 */
export function useDeleteChild() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (childId: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('children')
        .delete()
        .eq('id', childId)
      
      if (error) throw error
      return childId
    },
    onSuccess: () => {
      // Invalider la liste des enfants
      queryClient.invalidateQueries({ queryKey: ['children'] })
    },
  })
}

