"use client"

import { NotificationBell } from "./notification-bell"

interface NotificationBellWrapperProps {
  userId: string
}

export function NotificationBellWrapper({ userId }: NotificationBellWrapperProps) {
  return <NotificationBell userId={userId} />
}
