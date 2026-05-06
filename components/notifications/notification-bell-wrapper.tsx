"use client"

/**
 * Thin client wrapper around the canonical `NotificationBell`.
 *
 * Existe comme frontiere d'import depuis les Server Components (ex: `app/dashboard/page.tsx`)
 * qui passent un `userId` recupere cote serveur. Ne contient aucune logique additionnelle.
 *
 * Pour la doc complete (architecture des notifications): voir
 * `components/notifications/notification-bell.tsx`.
 */
import { NotificationBell } from "./notification-bell"

interface NotificationBellWrapperProps {
  userId: string
}

export function NotificationBellWrapper({ userId }: NotificationBellWrapperProps) {
  return <NotificationBell userId={userId} />
}
