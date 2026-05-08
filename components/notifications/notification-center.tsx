'use client'

/**
 * TEENS PARTY MOROCCO - Notification Center
 * =========================================
 *
 * Composant UI complet pour les notifications avec:
 * - Dropdown avec liste des notifications
 * - Badge compteur
 * - Actions (lire, supprimer)
 * - Push permission request
 * - Realtime updates
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  Bell,
  BellOff,
  BellRing,
  Check,
  CheckCheck,
  Trash2,
  X,
  Settings,
  ExternalLink,
  Calendar,
  Users,
  Trophy,
  CreditCard,
  Sparkles,
  AlertCircle,
  Gift,
  Clock,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SwipeableCard } from '@/components/ui/swipeable-card'
import { cn } from '@/lib/utils'
import {
  useNotifications,
  useServiceWorker,
  type Notification,
  type NotificationType,
} from '@/lib/hooks/use-notifications'

/* ==========================================================================
   TYPES & CONSTANTS
   ========================================================================== */

interface NotificationCenterProps {
  userId: string
  className?: string
}

const NOTIFICATION_ICONS: Record<NotificationType, typeof Bell> = {
  event: Calendar,
  booking: CreditCard,
  club: Users,
  pass: CreditCard,
  gamification: Trophy,
  system: AlertCircle,
  promo: Gift,
  reminder: Clock,
}

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  event: 'from-pink-500 to-rose-500',
  booking: 'from-green-500 to-emerald-500',
  club: 'from-blue-500 to-cyan-500',
  pass: 'from-yellow-500 to-orange-500',
  gamification: 'from-purple-500 to-pink-500',
  system: 'from-gray-500 to-slate-500',
  promo: 'from-red-500 to-orange-500',
  reminder: 'from-indigo-500 to-violet-500',
}

/* ==========================================================================
   NOTIFICATION CENTER COMPONENT
   ========================================================================== */

export function NotificationCenter({ userId, className }: NotificationCenterProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [showPushPrompt, setShowPushPrompt] = useState(false)

  const {
    notifications,
    unreadCount,
    isLoading,
    pushSupported,
    pushPermission,
    isPushEnabled,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestPushPermission,
    subscribeToPush,
  } = useNotifications({ userId, autoSubscribe: true })

  const { updateAvailable, skipWaiting } = useServiceWorker()

  // Show push prompt if not yet requested
  useEffect(() => {
    if (pushSupported && pushPermission === 'default' && !isPushEnabled) {
      // Delay the prompt
      const timer = setTimeout(() => setShowPushPrompt(true), 5000)
      return () => clearTimeout(timer)
    }
  }, [pushSupported, pushPermission, isPushEnabled])

  // Handle notification click
  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      // Mark as read
      if (!notification.read) {
        await markAsRead(notification.id)
      }

      // Navigate if action URL exists
      if (notification.action_url) {
        setIsOpen(false)
        router.push(notification.action_url)
      }
    },
    [markAsRead, router]
  )

  // Handle push permission request
  const handleEnablePush = useCallback(async () => {
    const success = await subscribeToPush()
    if (success) {
      setShowPushPrompt(false)
    }
  }, [subscribeToPush])

  return (
    <>
      {/* Push Permission Prompt */}
      <AnimatePresence>
        {showPushPrompt && (
          <PushPermissionPrompt
            onEnable={handleEnablePush}
            onDismiss={() => setShowPushPrompt(false)}
          />
        )}
      </AnimatePresence>

      {/* Update Available Banner */}
      <AnimatePresence>
        {updateAvailable && (
          <UpdateBanner onUpdate={skipWaiting} />
        )}
      </AnimatePresence>

      {/* Notification Dropdown */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('relative', className)}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
          >
            <motion.div
              animate={unreadCount > 0 ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.5, repeat: unreadCount > 0 ? Infinity : 0, repeatDelay: 5 }}
            >
              {isPushEnabled ? (
                <Bell className="h-5 w-5" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
            </motion.div>

            {/* Unread Badge */}
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-[380px] p-0"
          sideOffset={8}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllAsRead()}
                  className="text-xs h-8"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Tout lu
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setIsOpen(false)
                  router.push('/notifications/preferences')
                }}
                aria-label="Préférences de notifications"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          {/* Notifications List */}
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <NotificationSkeleton />
            ) : notifications.length === 0 ? (
              <EmptyNotifications />
            ) : (
              <div className="divide-y">
                {notifications.slice(0, 10).map((notification) => (
                  // TICKET-038: swipe-to-dismiss. A 30 % horizontal drag in
                  // either direction calls deleteNotification. The card
                  // animates off-screen (or snaps under reduced-motion) and
                  // the realtime subscription will drop it from the list.
                  <SwipeableCard
                    key={notification.id}
                    onSwipeDelete={() => deleteNotification(notification.id)}
                    leftAction={
                      <span className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold">
                        Supprimer
                      </span>
                    }
                    rightAction={
                      <span className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold">
                        Supprimer
                      </span>
                    }
                  >
                    <NotificationItem
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                      onMarkRead={() => markAsRead(notification.id)}
                      onDelete={() => deleteNotification(notification.id)}
                    />
                  </SwipeableCard>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {notifications.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Button
                  variant="ghost"
                  className="w-full justify-center text-primary"
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/notifications')
                  }}
                >
                  Voir toutes les notifications
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

/* ==========================================================================
   NOTIFICATION ITEM
   ========================================================================== */

interface NotificationItemProps {
  notification: Notification
  onClick: () => void
  onMarkRead: () => void
  onDelete: () => void
}

function NotificationItem({
  notification,
  onClick,
  onMarkRead,
  onDelete,
}: NotificationItemProps) {
  const Icon = NOTIFICATION_ICONS[notification.type] || Bell
  const colorClass = NOTIFICATION_COLORS[notification.type] || 'from-gray-500 to-slate-500'

  const timeAgo = getTimeAgo(notification.created_at)

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={cn(
        'relative p-4 hover:bg-muted/50 cursor-pointer transition-colors',
        !notification.read && 'bg-primary/5'
      )}
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br',
            colorClass
          )}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn('text-sm font-medium line-clamp-1', !notification.read && 'text-foreground')}>
              {notification.title}
            </p>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {timeAgo}
            </span>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {notification.message}
          </p>

          {/* Action URL indicator */}
          {notification.action_url && (
            <div className="flex items-center gap-1 mt-2 text-xs text-primary">
              <ExternalLink className="h-3 w-3" />
              <span>Voir les détails</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex flex-col gap-1">
          {!notification.read && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation()
                onMarkRead()
              }}
              aria-label="Marquer comme lu"
            >
              <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            aria-label="Supprimer la notification"
          >
            <Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Unread indicator */}
      {!notification.read && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
      )}
    </motion.div>
  )
}

/* ==========================================================================
   PUSH PERMISSION PROMPT
   ========================================================================== */

interface PushPermissionPromptProps {
  onEnable: () => void
  onDismiss: () => void
}

function PushPermissionPrompt({ onEnable, onDismiss }: PushPermissionPromptProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-50 max-w-sm"
    >
      <Card className="p-4 shadow-lg border-primary/20">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <BellRing className="h-6 w-6 text-white" />
            </div>
          </div>

          <div className="flex-1">
            <h4 className="font-semibold mb-1">Activer les notifications ?</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Recevez des alertes pour les événements, réservations et offres exclusives.
            </p>

            <div className="flex gap-2">
              <Button size="sm" onClick={onEnable}>
                Activer
              </Button>
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                Plus tard
              </Button>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-8 w-8"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}

/* ==========================================================================
   UPDATE BANNER
   ========================================================================== */

interface UpdateBannerProps {
  onUpdate: () => void
}

function UpdateBanner({ onUpdate }: UpdateBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-primary to-purple-500 text-white py-2 px-4"
    >
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-medium">
            Une nouvelle version est disponible !
          </span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={onUpdate}
          className="bg-white/20 hover:bg-white/30 text-white border-0"
        >
          Mettre à jour
        </Button>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   EMPTY & LOADING STATES
   ========================================================================== */

function EmptyNotifications() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Bell className="h-8 w-8 text-muted-foreground" />
      </div>
      <h4 className="font-medium mb-1">Aucune notification</h4>
      <p className="text-sm text-muted-foreground">
        Vous serez notifié des événements importants
      </p>
    </div>
  )
}

function NotificationSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "À l'instant"
  if (diffMins < 60) return `${diffMins}min`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}j`

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export { useNotifications, useServiceWorker }
