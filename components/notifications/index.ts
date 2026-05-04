/**
 * TEENS PARTY MOROCCO - Notifications Components
 * ==============================================
 *
 * Export centralisé des composants de notification.
 *
 * Usage:
 * import { NotificationCenter } from '@/components/notifications'
 */

export { NotificationCenter } from './notification-center'

// Re-export hooks for convenience
export {
  useNotifications,
  useServiceWorker,
} from './notification-center'
