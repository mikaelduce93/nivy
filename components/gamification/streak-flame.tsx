"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Flame, Calendar, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface StreakFlameProps {
  currentStreak: number
  longestStreak: number
  lastActivityDate?: string | null
  className?: string
  size?: "sm" | "md" | "lg"
  showDetails?: boolean
}

export function StreakFlame({
  currentStreak,
  longestStreak,
  lastActivityDate,
  className,
  size = "md",
  showDetails = true,
}: StreakFlameProps) {
  // Déterminer si streak est actif (activité aujourd'hui ou hier)
  const isActive = (() => {
    if (!lastActivityDate) return false
    const lastDate = new Date(lastActivityDate)
    const today = new Date()
    const diffDays = Math.floor(
      (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    return diffDays <= 1
  })()

  // Couleur de la flamme selon le streak
  const flameColor = (() => {
    if (currentStreak >= 30) return "from-pink via-pink to-destructive"
    if (currentStreak >= 14) return "from-coral via-destructive to-pink"
    if (currentStreak >= 7) return "from-gold via-coral to-destructive"
    return "from-coral via-coral to-destructive"
  })()

  const sizeConfig = {
    sm: { flame: "w-8 h-8", text: "text-lg", icon: "w-4 h-4" },
    md: { flame: "w-12 h-12", text: "text-2xl", icon: "w-6 h-6" },
    lg: { flame: "w-16 h-16", text: "text-4xl", icon: "w-8 h-8" },
  }

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {/* Flamme animée */}
      <div className="relative">
        <motion.div
          className={cn(
            "rounded-full flex items-center justify-center relative",
            sizeConfig[size].flame,
            isActive
              ? `bg-gradient-to-br ${flameColor}`
              : "bg-card"
          )}
          animate={isActive ? {
            scale: [1, 1.05, 1],
            rotate: [0, 2, -2, 0],
          } : {}}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Flame
            className={cn(
              sizeConfig[size].icon,
              isActive ? "text-ink" : "text-mute"
            )}
          />

          {/* Particules de feu animées */}
          {isActive && currentStreak > 0 && (
            <>
              <FireParticle delay={0} size={size} />
              <FireParticle delay={0.3} size={size} />
              <FireParticle delay={0.6} size={size} />
            </>
          )}
        </motion.div>

        {/* Glow effect */}
        {isActive && (
          <motion.div
            className={cn(
              "absolute inset-0 rounded-full blur-lg -z-10",
              `bg-gradient-to-br ${flameColor}`,
              "opacity-50"
            )}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        {/* Badge streak count */}
        {currentStreak > 0 && (
          <motion.div
            className="absolute -top-1 -right-1 bg-gradient-to-br from-coral to-destructive rounded-full min-w-5 h-5 flex items-center justify-center px-1"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
          >
            <span className="text-ink font-bold text-xs">{currentStreak}</span>
          </motion.div>
        )}
      </div>

      {/* Détails du streak */}
      {showDetails && (
        <div className="flex flex-col">
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className={cn(
              "font-black",
              sizeConfig[size].text,
              isActive ? "text-coral" : "text-mute"
            )}>
              {currentStreak}
            </span>
            <span className={cn(
              "font-medium",
              isActive ? "text-ink-2" : "text-mute"
            )}>
              {currentStreak === 1 ? "jour" : "jours"}
            </span>
          </motion.div>

          {/* Streak record */}
          {longestStreak > 0 && (
            <div className="flex items-center gap-1 text-xs text-mute">
              <TrendingUp className="w-3 h-3" />
              <span>Record: {longestStreak} jours</span>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-1 mt-1">
            {isActive ? (
              <span className="text-xs text-lime flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
                Streak actif
              </span>
            ) : (
              <span className="text-xs text-mute flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted" />
                Streak perdu
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   FIRE PARTICLE - Particule de feu animée
   ========================================================================== */

function FireParticle({ delay, size }: { delay: number; size: "sm" | "md" | "lg" }) {
  const particleSize = {
    sm: "w-1 h-1",
    md: "w-1.5 h-1.5",
    lg: "w-2 h-2",
  }

  return (
    <motion.div
      className={cn(
        "absolute rounded-full bg-gold",
        particleSize[size]
      )}
      initial={{ opacity: 0, y: 0, x: 0 }}
      animate={{
        opacity: [0, 1, 0],
        y: [-5, -20],
        x: [0, Math.random() * 10 - 5],
      }}
      transition={{
        duration: 1,
        repeat: Infinity,
        delay,
        ease: "easeOut",
      }}
    />
  )
}

/* ==========================================================================
   STREAK MINI - Version compacte
   ========================================================================== */

interface StreakMiniProps {
  currentStreak: number
  isActive?: boolean
  className?: string
}

export function StreakMini({ currentStreak, isActive = true, className }: StreakMiniProps) {
  return (
    <motion.div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full",
        isActive ? "bg-coral/20" : "bg-card",
        className
      )}
      whileHover={{ scale: 1.05 }}
    >
      <Flame className={cn("w-4 h-4", isActive ? "text-coral" : "text-mute")} />
      <span className={cn(
        "font-bold text-sm",
        isActive ? "text-coral" : "text-mute"
      )}>
        {currentStreak}
      </span>
    </motion.div>
  )
}

/* ==========================================================================
   STREAK CALENDAR - Calendrier de streak
   ========================================================================== */

interface StreakCalendarProps {
  streakDays: string[] // Array de dates ISO
  className?: string
}

export function StreakCalendar({ streakDays, className }: StreakCalendarProps) {
  // Générer les 7 derniers jours
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return date.toISOString().split("T")[0]
  })

  const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]

  return (
    <div className={cn("flex gap-2", className)}>
      {last7Days.map((date, index) => {
        const isActive = streakDays.includes(date)
        const dayName = dayNames[new Date(date).getDay()]

        return (
          <motion.div
            key={date}
            className="flex flex-col items-center gap-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <span className="text-xs text-mute">{dayName}</span>
            <motion.div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                isActive
                  ? "bg-gradient-to-br from-coral to-destructive"
                  : "bg-card"
              )}
              whileHover={{ scale: 1.1 }}
            >
              {isActive ? (
                <Flame className="w-4 h-4 text-ink" />
              ) : (
                <span className="text-mute text-xs">
                  {new Date(date).getDate()}
                </span>
              )}
            </motion.div>
          </motion.div>
        )
      })}
    </div>
  )
}

/* ==========================================================================
   STREAK BROKEN MODAL - Modal quand streak est perdu
   ========================================================================== */

interface StreakBrokenModalProps {
  previousStreak: number
  onClose: () => void
}

export function StreakBrokenModal({ previousStreak, onClose }: StreakBrokenModalProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 "
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-card border border-ink rounded-2xl p-8 max-w-sm mx-4 text-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          className="w-20 h-20 mx-auto mb-4 rounded-full bg-card flex items-center justify-center"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.5 }}
        >
          <Flame className="w-10 h-10 text-mute" />
        </motion.div>

        <h3 className="text-2xl font-bold text-ink mb-2">Streak perdu !</h3>
        <p className="text-mute mb-4">
          Tu avais un streak de <span className="text-coral font-bold">{previousStreak} jours</span>.
          <br />
          Recommence dès aujourd'hui !
        </p>

        <motion.button
          className="w-full py-3 bg-gradient-to-r from-coral to-destructive rounded-xl font-bold text-ink"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
        >
          Relancer mon streak !
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
