/**
 * TEENS PARTY MOROCCO - Notification Toast Components
 * ====================================================
 *
 * Composants pour les toasts de notifications.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import {
  X,
  Gift,
  Trophy,
  Users,
  Calendar,
  Target,
  Bell,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import {
  type UserNotification,
  type NotificationCategory,
  CATEGORY_CONFIG,
  PRIORITY_CONFIG,
  ANIMATION_EFFECTS,
  getDisplayDuration,
  canDismiss,
  hasRewards,
  formatNotificationTime,
} from "../../features/notifications"

/* ==========================================================================
   NOTIFICATION TOAST
   ========================================================================== */

interface NotificationToastProps {
  notification: UserNotification
  onClose: () => void
  onClick?: () => void
  onClaimRewards?: () => void
  position?: "top-right" | "top-center" | "bottom-right" | "bottom-center"
}

export function NotificationToast({
  notification,
  onClose,
  onClick,
  onClaimRewards,
  position = "top-right",
}: NotificationToastProps) {
  const [progress, setProgress] = useState(100)
  const [isHovered, setIsHovered] = useState(false)

  const duration = getDisplayDuration(notification)
  const dismissable = canDismiss(notification)
  const showRewards = hasRewards(notification)

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

  // Category config
  const category = (notification.data as any)?.category as NotificationCategory
  const categoryConfig = category
    ? CATEGORY_CONFIG[category]
    : CATEGORY_CONFIG.system

  // Auto-dismiss timer
  useEffect(() => {
    if (duration === 0 || isHovered) return

    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)

      if (remaining === 0) {
        clearInterval(interval)
        onClose()
      }
    }, 50)

    return () => clearInterval(interval)
  }, [duration, isHovered, onClose])

  // Confetti effect for high priority
  useEffect(() => {
    if (notification.animation === "confetti") {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.3 },
        colors: ["#06b6d4", "#8b5cf6", "#f59e0b"],
      })
    }
  }, [notification.animation])

  // Position classes
  const positionClasses = {
    "top-right": "top-4 right-4",
    "top-center": "top-4 left-1/2 -translate-x-1/2",
    "bottom-right": "bottom-4 right-4",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  }

  // Animation variants
  const variants = {
    initial: {
      opacity: 0,
      y: position.startsWith("top") ? -20 : 20,
      scale: 0.95,
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 500, damping: 30 },
    },
    exit: {
      opacity: 0,
      y: position.startsWith("top") ? -20 : 20,
      scale: 0.95,
      transition: { duration: 0.2 },
    },
  }

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed ${positionClasses[position]} z-50 w-96 max-w-[calc(100vw-2rem)]`}
    >
      <div
        className={`relative rounded-2xl border overflow-hidden backdrop-blur-xl ${
          notification.priority === "urgent"
            ? "border-red-500/50 bg-red-900/90"
            : notification.priority === "high"
            ? "border-yellow-500/30 bg-zinc-900/95"
            : "border-zinc-700/50 bg-zinc-900/95"
        } ${
          notification.animation
            ? ANIMATION_EFFECTS[notification.animation]?.className || ""
            : ""
        }`}
        style={{
          boxShadow:
            notification.priority === "high"
              ? `0 0 30px ${notification.color || categoryConfig.color}30`
              : undefined,
        }}
      >
        {/* Progress bar */}
        {duration > 0 && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-800">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Content */}
        <div
          className="p-4 cursor-pointer"
          onClick={onClick}
        >
          <div className="flex gap-3">
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

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-white text-sm leading-tight">
                {notification.title}
              </h4>
              <p className="text-sm text-zinc-400 mt-0.5 line-clamp-2">
                {notification.body}
              </p>

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
                      onClaimRewards?.()
                    }}
                    className="text-xs text-green-400 hover:text-green-300 font-medium"
                  >
                    Réclamer
                  </button>
                </div>
              )}

              {/* Action button */}
              {notification.action_url && notification.action_label && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onClick?.()
                  }}
                  className="flex items-center gap-1 mt-2 text-xs text-cyan-400 hover:text-cyan-300"
                >
                  {notification.action_label}
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Close button */}
            {dismissable && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Urgent badge */}
        {notification.priority === "urgent" && (
          <div className="absolute top-0 right-0 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-bl-lg">
            URGENT
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   TOAST CONTAINER
   ========================================================================== */

interface ToastContainerProps {
  notifications: UserNotification[]
  position?: "top-right" | "top-center" | "bottom-right" | "bottom-center"
  maxVisible?: number
  onDismiss: (id: string) => void
  onClick?: (notification: UserNotification) => void
  onClaimRewards?: (id: string) => void
}

export function ToastContainer({
  notifications,
  position = "top-right",
  maxVisible = 3,
  onDismiss,
  onClick,
  onClaimRewards,
}: ToastContainerProps) {
  const visibleNotifications = notifications.slice(0, maxVisible)
  const hiddenCount = notifications.length - maxVisible

  // Position classes for stacking
  const stackDirection = position.startsWith("top") ? 1 : -1
  const baseOffset = position.startsWith("top") ? 16 : 16

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence mode="popLayout">
        {visibleNotifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            style={{
              [position.startsWith("top") ? "top" : "bottom"]:
                baseOffset + index * (stackDirection * 8),
            }}
            className="pointer-events-auto"
          >
            <NotificationToast
              notification={notification}
              position={position}
              onClose={() => onDismiss(notification.id)}
              onClick={() => onClick?.(notification)}
              onClaimRewards={() => onClaimRewards?.(notification.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Hidden count indicator */}
      {hiddenCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`fixed ${
            position.includes("right") ? "right-4" : "left-1/2 -translate-x-1/2"
          } ${
            position.startsWith("top")
              ? `top-${baseOffset + maxVisible * 100}px`
              : `bottom-${baseOffset + maxVisible * 100}px`
          } pointer-events-auto`}
        >
          <div className="px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-sm text-zinc-400">
            +{hiddenCount} autres notifications
          </div>
        </motion.div>
      )}
    </div>
  )
}

/* ==========================================================================
   MINI TOAST (pour les notifications rapides)
   ========================================================================== */

interface MiniToastProps {
  message: string
  emoji?: string
  type?: "success" | "error" | "info" | "warning"
  duration?: number
  onClose: () => void
}

export function MiniToast({
  message,
  emoji,
  type = "info",
  duration = 3000,
  onClose,
}: MiniToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const typeStyles = {
    success: "bg-green-500/20 border-green-500/30 text-green-400",
    error: "bg-red-500/20 border-red-500/30 text-red-400",
    info: "bg-cyan-500/20 border-cyan-500/30 text-cyan-400",
    warning: "bg-yellow-500/20 border-yellow-500/30 text-yellow-400",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full border ${typeStyles[type]} backdrop-blur-sm`}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        {emoji && <span>{emoji}</span>}
        {message}
      </span>
    </motion.div>
  )
}

/* ==========================================================================
   REWARD CLAIMED TOAST
   ========================================================================== */

interface RewardClaimedToastProps {
  xp?: number
  coins?: number
  onClose: () => void
}

export function RewardClaimedToast({
  xp = 0,
  coins = 0,
  onClose,
}: RewardClaimedToastProps) {
  useEffect(() => {
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.3 },
      colors: ["#06b6d4", "#f59e0b"],
    })

    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
    >
      <div className="px-8 py-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 backdrop-blur-xl text-center">
        <Sparkles className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-white mb-2">
          Récompenses réclamées !
        </h3>
        <div className="flex items-center justify-center gap-4">
          {xp > 0 && (
            <span className="flex items-center gap-1 text-cyan-400 font-bold">
              +{xp} XP
            </span>
          )}
          {coins > 0 && (
            <span className="flex items-center gap-1 text-yellow-400 font-bold">
              🪙 +{coins}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   NOTIFICATION SOUND PLAYER
   ========================================================================== */

export function useNotificationSound() {
  const playSound = useCallback((sound: string) => {
    // En production, charger les fichiers audio
    const sounds: Record<string, string> = {
      success: "/sounds/success.mp3",
      achievement: "/sounds/achievement.mp3",
      social: "/sounds/social.mp3",
      alert: "/sounds/alert.mp3",
      reward: "/sounds/reward.mp3",
    }

    const audioUrl = sounds[sound]
    if (audioUrl) {
      const audio = new Audio(audioUrl)
      audio.volume = 0.5
      audio.play().catch(() => {
        // Silently fail if audio can't play (user hasn't interacted yet)
      })
    }
  }, [])

  return { playSound }
}
