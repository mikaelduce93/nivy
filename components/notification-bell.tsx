/**
 * Re-export shim for backwards compatibility.
 *
 * Canonical source: `@/components/notifications/notification-bell`.
 *
 * This file historically held a simpler `NotificationBell` (no props, real-time supabase subscription).
 * The canonical version under `components/notifications/` is feature-complete (popover, mark-as-read, polling)
 * and requires a `userId` prop. It is wrapped by `components/notifications/notification-bell-wrapper.tsx`.
 *
 * The gamification-specific `NotificationBell` in `gamification-system/components/notifications/notification-center.tsx`
 * is intentionally separate: it has a different contract (`unreadCount`, `onClick`) tied to the gamification feature.
 *
 * New code MUST import from `@/components/notifications/notification-bell`
 * (or use `NotificationBellWrapper` for the standard userId-driven flow).
 */
export { NotificationBell } from '@/components/notifications/notification-bell'
