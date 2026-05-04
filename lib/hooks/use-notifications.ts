'use client'

import { useNotificationsRealtime } from './notifications/use-realtime'
import { usePushNotifications } from './notifications/use-push'
import { UseNotificationsOptions } from './notifications/types'
import { useEffect, useState, useCallback } from 'react'

export * from './notifications/types'

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { userId, autoSubscribe = false } = options
  const realtime = useNotificationsRealtime(options)
  const push = usePushNotifications(userId)

  useEffect(() => {
    if (autoSubscribe && push.isSupported && push.permission === 'granted' && !push.isEnabled) {
      push.subscribe()
    }
  }, [autoSubscribe, push])

  return {
    notifications: realtime.notifications,
    unreadCount: realtime.notifications.filter(n => !n.read).length,
    isLoading: realtime.isLoading,
    error: realtime.error,
    pushSupported: push.isSupported,
    pushPermission: push.permission,
    isPushEnabled: push.isEnabled,
    markAsRead: realtime.markAsRead,
    markAllAsRead: realtime.markAllAsRead,
    deleteNotification: realtime.deleteNotification,
    clearAll: async () => { /* implement if needed or move to realtime */ },
    requestPushPermission: push.requestPermission,
    subscribeToPush: push.subscribe,
    unsubscribeFromPush: push.unsubscribe,
    refresh: realtime.refresh,
  }
}

export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      setRegistration(reg)
      reg.addEventListener('updatefound', () => {
        const next = reg.installing
        next?.addEventListener('statechange', () => {
          if (next.state === 'installed' && navigator.serviceWorker.controller) setUpdateAvailable(true)
        })
      })
    })
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.type === 'ANALYTICS') window.dispatchEvent(new CustomEvent('sw:analytics', { detail: e.data.payload }))
    })
  }, [])

  return {
    registration,
    updateAvailable,
    skipWaiting: () => {
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        window.location.reload()
      }
    }
  }
}
