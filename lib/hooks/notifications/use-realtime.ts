import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Notification, UseNotificationsOptions } from './types'
import { showBrowserNotification, queueOfflineAction } from './utils'

export function useNotificationsRealtime(options: UseNotificationsOptions) {
  const { userId, limit = 50 } = options
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = useRef(createClient())

  const fetchNotifications = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const { data, error } = await supabase.current.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit)
      if (error) throw error
      setNotifications(data || [])
    } catch (err) { setError(err as Error) }
    finally { setIsLoading(false) }
  }, [userId, limit])

  useEffect(() => {
    if (!userId) return
    fetchNotifications()
    const channel = supabase.current.channel(`notifications:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (p: any) => {
        const n = p.new as Notification
        setNotifications(prev => [n, ...prev])
        showBrowserNotification(n)
        window.dispatchEvent(new CustomEvent('notification:new', { detail: n }))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (p: any) => {
        const n = p.new as Notification
        setNotifications(prev => prev.map(old => old.id === n.id ? n : old))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (p: any) => {
        setNotifications(prev => prev.filter(old => old.id !== p.old.id))
      })
      .subscribe()
    return () => { supabase.current.removeChannel(channel) }
  }, [userId, fetchNotifications])

  const markAsRead = async (id: string) => {
    if (!userId) return
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    const { error } = await supabase.current.from('notifications').update({ read: true }).eq('id', id).eq('user_id', userId)
    if (error) { fetchNotifications(); queueOfflineAction('mark-read', { id }) }
  }

  const markAllAsRead = async () => {
    if (!userId) return
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    const { error } = await supabase.current.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    if (error) fetchNotifications()
  }

  const deleteNotification = async (id: string) => {
    if (!userId) return
    setNotifications(prev => prev.filter(n => n.id !== id))
    const { error } = await supabase.current.from('notifications').delete().eq('id', id).eq('user_id', userId)
    if (error) { fetchNotifications(); queueOfflineAction('delete', { id }) }
  }

  return { notifications, isLoading, error, markAsRead, markAllAsRead, deleteNotification, refresh: fetchNotifications }
}
