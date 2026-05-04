import { Notification } from "./types"

export function showBrowserNotification(notification: Notification) {
  if (typeof window === 'undefined' || Notification.permission !== 'granted' || document.visibilityState === 'visible') return
  const options = {
    body: notification.message,
    icon: notification.image_url || '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: notification.id,
    renotify: true,
    data: { url: notification.action_url || '/notifications', id: notification.id },
  } as NotificationOptions & { renotify?: boolean }
  navigator.serviceWorker?.ready.then((reg) => reg.showNotification(notification.title, options))
}

export function queueOfflineAction(type: string, data: Record<string, any>) {
  if (typeof window === 'undefined' || !navigator.serviceWorker?.controller) return
  navigator.serviceWorker.controller.postMessage({ type: 'QUEUE_ACTION', payload: { type, data, timestamp: Date.now() } })
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}
