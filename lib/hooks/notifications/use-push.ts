import { useState, useEffect, useCallback } from 'react'
import { urlBase64ToUint8Array } from './utils'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

export function usePushNotifications(userId?: string) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isEnabled, setIsEnabled] = useState(false)
  const isSupported = typeof window !== 'undefined' && 'PushManager' in window

  useEffect(() => {
    if (!isSupported) return
    setPermission(Notification.permission)
    navigator.serviceWorker?.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setIsEnabled(!!sub)
    })
  }, [isSupported])

  const requestPermission = async () => {
    if (!isSupported) return false
    const p = await Notification.requestPermission()
    setPermission(p)
    return p === 'granted'
  }

  const subscribe = async () => {
    if (!isSupported || !VAPID_PUBLIC_KEY || !userId) return false
    if (permission !== 'granted' && !(await requestPermission())) return false
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) })
      const res = await fetch('/api/notifications/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON(), userId }) })
      if (!res.ok) throw new Error('Save failed')
      setIsEnabled(true)
      return true
    } catch (e) { return false }
  }

  const unsubscribe = async () => {
    if (!isSupported || !userId) return
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await fetch('/api/notifications/push/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint, userId }) })
      }
      setIsEnabled(false)
    } catch (e) { console.error(e) }
  }

  return { isSupported, permission, isEnabled, requestPermission, subscribe, unsubscribe }
}
