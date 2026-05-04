/**
 * TEENS PARTY MOROCCO - Notification Center Components
 * =====================================================
 *
 * Composants pour le centre de notifications.
 */

"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  Settings,
  Gift,
  ChevronRight,
  X,
  Sparkles,
  Trophy,
  Users,
  Calendar,
  Target,
} from "lucide-react"
import {
  type UserNotification,
  type NotificationCategory,
  type NotificationsResponse,
  CATEGORY_CONFIG,
  formatNotificationTime,
  hasRewards,
  groupNotifications,
  sortNotifications,
} from "../../features/notifications"

/* ==========================================================================
   NOTIFICATION CENTER PANEL
   ========================================================================== */

interface NotificationCenterProps {
  notifications: NotificationsResponse
  isOpen: boolean
  onClose: () => void
  onMarkAsRead: (ids?: string[]) => void
  onDismiss: (id: string) => void
  onDismissAll: () => void
  onClaimRewards: (id: string) => void
  onClaimAllRewards: () => void
  onNotificationClick: (notification: UserNotification) => void
  onOpenSettings: () => void
}

export function NotificationCenter({
  notifications,
  isOpen,
  onClose,
  onMarkAsRead,
  onDismiss,
  onDismissAll,
  onClaimRewards,
  onClaimAllRewards,
  onNotificationClick,
  onOpenSettings,
}: NotificationCenterProps) {
  const [filter, setFilter] = useState<"all" | "unread" | NotificationCategory>("all")
  const [showRewardsOnly, setShowRewardsOnly] = useState(false)

  // Filter and sort notifications
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications.notifications]

    // Filter by read status
    if (filter === "unread") {
      filtered = filtered.filter((n) => !n.is_read)
    }
    // Filter by category
    else if (filter !== "all") {
      filtered = filtered.filter((n) => (n.data as any)?.category === filter)
    }

    // Filter by rewards
    if (showRewardsOnly) {
      filtered = filtered.filter((n) => hasRewards(n))
    }

    return sortNotifications(filtered)
  }, [notifications.notifications, filter, showRewardsOnly])

  // Count rewards
  const rewardsCount = notifications.notifications.filter((n) => hasRewards(n)).length
  const totalPendingXp = notifications.notifications
    .filter((n) => hasRewards(n))
    .reduce((sum, n) => sum + n.xp_reward, 0)
  const totalPendingCoins = notifications.notifications
    .filter((n) => hasRewards(n))
    .reduce((sum, n) => sum + n.coin_reward, 0)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-zinc-900 border-l border-zinc-800 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-white">Notifications</h2>
                {notifications.unread_count > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-white text-xs font-bold">
                    {notifications.unread_count}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenSettings}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Rewards banner */}
            {rewardsCount > 0 && (
              <div className="p-3 mx-4 mt-4 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    <div>
                      <p className="text-sm font-medium text-white">
                        {rewardsCount} récompense{rewardsCount > 1 ? "s" : ""} en attente
                      </p>
                      <p className="text-xs text-zinc-400">
                        {totalPendingXp > 0 && `${totalPendingXp} XP`}
                        {totalPendingXp > 0 && totalPendingCoins > 0 && " • "}
                        {totalPendingCoins > 0 && `${totalPendingCoins} coins`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClaimAllRewards}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-600 transition-colors"
                  >
                    Tout réclamer
                  </button>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
              <FilterChip
                active={filter === "all"}
                onClick={() => setFilter("all")}
              >
                Toutes
              </FilterChip>
              <FilterChip
                active={filter === "unread"}
                onClick={() => setFilter("unread")}
                count={notifications.unread_count}
              >
                Non lues
              </FilterChip>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <FilterChip
                  key={key}
                  active={filter === key}
                  onClick={() => setFilter(key as NotificationCategory)}
                >
                  {config.name}
                </FilterChip>
              ))}
            </div>

            {/* Actions bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
              <button
                onClick={() => onMarkAsRead()}
                className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Tout marquer lu
              </button>

              <button
                onClick={onDismissAll}
                className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer lues
              </button>
            </div>

            {/* Notifications list */}
            <div className="flex-1 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <EmptyNotifications filter={filter} />
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {filteredNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={() => onNotificationClick(notification)}
                      onDismiss={() => onDismiss(notification.id)}
                      onClaimRewards={() => onClaimRewards(notification.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ==========================================================================
   FILTER CHIP
   ========================================================================== */

interface FilterChipProps {
  active: boolean
  onClick: () => void
  count?: number
  children: React.ReactNode
}

function FilterChip({ active, onClick, count, children }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
        active
          ? "bg-cyan-500 text-white"
          : "bg-zinc-800 text-zinc-400 hover:text-white"
      }`}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span
          className={`px-1.5 py-0.5 rounded-full text-xs ${
            active ? "bg-white/20" : "bg-zinc-700"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}

/* ==========================================================================
   NOTIFICATION ITEM
   ========================================================================== */

interface NotificationItemProps {
  notification: UserNotification
  onClick: () => void
  onDismiss: () => void
  onClaimRewards: () => void
}

function NotificationItem({
  notification,
  onClick,
  onDismiss,
  onClaimRewards,
}: NotificationItemProps) {
  const category = (notification.data as any)?.category as NotificationCategory
  const categoryConfig = category
    ? CATEGORY_CONFIG[category]
    : CATEGORY_CONFIG.system

  // Icon mapping
  const iconMap: Record<string, React.ElementType> = {
    Trophy: Trophy,
    Users: Users,
    Calendar: Calendar,
    Target: Target,
    Gift: Gift,
    Bell: Bell,
  }

  const IconComponent = iconMap[notification.icon || "Bell"] || Bell

  const showRewards = hasRewards(notification)

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`relative p-4 hover:bg-zinc-800/50 transition-colors ${
        !notification.is_read ? "bg-zinc-800/30" : ""
      }`}
    >
      <div className="flex gap-3" onClick={onClick}>
        {/* Icon */}
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${categoryConfig.bgColor}`}
        >
          {notification.emoji ? (
            <span className="text-xl">{notification.emoji}</span>
          ) : (
            <IconComponent className={`w-5 h-5 ${categoryConfig.color}`} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={`font-medium text-sm leading-tight ${
                notification.is_read ? "text-zinc-300" : "text-white"
              }`}
            >
              {notification.title}
            </h4>
            <span className="text-xs text-zinc-500 whitespace-nowrap">
              {formatNotificationTime(notification.created_at || "")}
            </span>
          </div>

          <p className="text-sm text-zinc-400 mt-0.5 line-clamp-2">
            {notification.body}
          </p>

          {/* Group count */}
          {notification.group_count > 1 && (
            <p className="text-xs text-zinc-500 mt-1">
              et {notification.group_count - 1} autre
              {notification.group_count > 2 ? "s" : ""}
            </p>
          )}

          {/* Rewards */}
          {showRewards && (
            <div className="flex items-center gap-3 mt-2">
              {notification.xp_reward > 0 && (
                <span className="flex items-center gap-1 text-xs text-cyan-400">
                  <Sparkles className="w-3 h-3" />+{notification.xp_reward} XP
                </span>
              )}
              {notification.coin_reward > 0 && (
                <span className="flex items-center gap-1 text-xs text-yellow-400">
                  🪙 +{notification.coin_reward}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onClaimRewards()
                }}
                className="text-xs text-green-400 hover:text-green-300 font-medium"
              >
                Réclamer
              </button>
            </div>
          )}

          {/* Action */}
          {notification.action_url && notification.action_label && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClick()
              }}
              className="flex items-center gap-1 mt-2 text-xs text-cyan-400 hover:text-cyan-300"
            >
              {notification.action_label}
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Unread indicator */}
        {!notification.is_read && (
          <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-500" />
        )}
      </div>

      {/* Dismiss button on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDismiss()
        }}
        className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-zinc-700 text-zinc-500 hover:text-white transition-all"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

/* ==========================================================================
   EMPTY STATE
   ========================================================================== */

interface EmptyNotificationsProps {
  filter: string
}

function EmptyNotifications({ filter }: EmptyNotificationsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
        <BellOff className="w-8 h-8 text-zinc-600" />
      </div>
      <h3 className="text-lg font-medium text-white mb-1">
        Pas de notifications
      </h3>
      <p className="text-sm text-zinc-400 text-center">
        {filter === "unread"
          ? "Tu as lu toutes tes notifications !"
          : filter !== "all"
          ? `Aucune notification dans cette catégorie.`
          : "Tu n'as pas encore de notifications."}
      </p>
    </div>
  )
}

/* ==========================================================================
   NOTIFICATION BELL BUTTON
   ========================================================================== */

interface NotificationBellProps {
  unreadCount: number
  onClick: () => void
}

export function NotificationBell({ unreadCount, onClick }: NotificationBellProps) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-xl hover:bg-zinc-800 transition-colors"
    >
      <Bell className="w-6 h-6 text-zinc-400 hover:text-white transition-colors" />

      {unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center px-1.5"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </motion.span>
      )}
    </button>
  )
}

/* ==========================================================================
   NOTIFICATION BADGE (inline)
   ========================================================================== */

interface NotificationBadgeProps {
  count: number
  type?: "dot" | "number"
}

export function NotificationBadge({ count, type = "number" }: NotificationBadgeProps) {
  if (count === 0) return null

  if (type === "dot") {
    return (
      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
    )
  }

  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center px-1">
      {count > 99 ? "99+" : count}
    </span>
  )
}
