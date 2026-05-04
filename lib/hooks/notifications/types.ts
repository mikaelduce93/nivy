export type NotificationType = 'event' | 'booking' | 'club' | 'pass' | 'gamification' | 'system' | 'promo' | 'reminder'
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
  action_url?: string
  image_url?: string
  priority: NotificationPriority
  read: boolean
  created_at: string
  expires_at?: string
}

export interface UseNotificationsOptions {
  userId?: string
  autoSubscribe?: boolean
  limit?: number
}
