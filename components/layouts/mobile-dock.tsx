"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Swords, Users, Wallet, User, Calendar, Cake, Trophy, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface NavItem {
  label: string
  href: string
  icon: typeof Home
  color: string
  glowColor: string
  badge?: number
}

// Custom hook for notifications (could be connected to real-time data)
function useNotifications() {
  // In a real app, this would fetch from an API or realtime subscription
  const [notifications] = useState({
    quests: 3,
    social: 2,
  })

  return notifications
}

export function MobileDock() {
  const pathname = usePathname()
  const notifications = useNotifications()
  const [mounted, setMounted] = useState(false)

  const isTeenArea = pathname?.startsWith("/teen")
  const isParentArea = pathname?.startsWith("/parent")
  const isAdminArea = pathname?.startsWith("/admin")

  useEffect(() => {
    setMounted(true)
  }, [])

  const teenNavItems: NavItem[] = [
    {
      label: "Home",
      href: "/teen",
      icon: Home,
      color: "rgb(196, 181, 253)",
      glowColor: "rgba(196, 181, 253, 0.5)",
    },
    {
      label: "Quests",
      href: "/teen/quests",
      icon: Swords,
      color: "rgb(125, 211, 252)",
      glowColor: "rgba(125, 211, 252, 0.5)",
      badge: notifications.quests,
    },
    {
      label: "Social",
      href: "/teen/social",
      icon: Users,
      color: "rgb(253, 164, 175)",
      glowColor: "rgba(253, 164, 175, 0.5)",
      badge: notifications.social,
    },
    {
      label: "Wallet",
      href: "/teen/wallet",
      icon: Wallet,
      color: "rgb(253, 224, 71)",
      glowColor: "rgba(253, 224, 71, 0.5)",
    },
    {
      label: "Profil",
      href: "/teen/profile",
      icon: User,
      color: "rgb(254, 215, 170)",
      glowColor: "rgba(254, 215, 170, 0.5)",
    },
  ]

  const publicNavItems: NavItem[] = [
    {
      label: "Agenda",
      href: "/agenda",
      icon: Calendar,
      color: "rgb(196, 181, 253)",
      glowColor: "rgba(196, 181, 253, 0.5)",
    },
    {
      label: "Anniv",
      href: "/anniversaires",
      icon: Cake,
      color: "rgb(253, 164, 175)",
      glowColor: "rgba(253, 164, 175, 0.5)",
    },
    {
      label: "Clubs",
      href: "/clubs",
      icon: Trophy,
      color: "rgb(190, 242, 100)",
      glowColor: "rgba(190, 242, 100, 0.5)",
    },
    {
      label: "XP",
      href: "/gamification",
      icon: Sparkles,
      color: "rgb(125, 211, 252)",
      glowColor: "rgba(125, 211, 252, 0.5)",
    },
    {
      label: "Espace",
      href: "/espace",
      icon: User,
      color: "rgb(254, 215, 170)",
      glowColor: "rgba(254, 215, 170, 0.5)",
    },
  ]

  // Parent has its own dock; admin should not display one.
  if (isParentArea || isAdminArea) return null

  const navItems = isTeenArea ? teenNavItems : publicNavItems

  // SSR safety - render a placeholder on server
  if (!mounted) {
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden"
        role="navigation"
        aria-label="Navigation mobile"
      >
        <div className="flex w-full items-center justify-around rounded-3xl border border-white/10 bg-zinc-900/95 p-2 backdrop-blur-xl">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-1 flex-col items-center gap-0.5 py-2"
              >
                <Icon className="h-6 w-6 text-zinc-500" />
                <span className="text-[10px] font-semibold text-zinc-500">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    )
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden"
      role="navigation"
      aria-label="Navigation mobile"
    >
      {/* Gradient backdrop fade */}
      <div 
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.5), transparent)',
        }}
      />
      
      {/* Main dock container */}
      <div className="relative flex w-full items-center justify-around rounded-3xl border border-white/10 bg-zinc-900/95 p-2 shadow-2xl backdrop-blur-xl">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== "/teen" && pathname?.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className="relative z-10 flex-1"
            >
              <motion.div
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl py-2 transition-colors duration-200",
                  !isActive && "hover:bg-white/5"
                )}
                style={{
                  background: isActive 
                    ? `linear-gradient(to top, ${item.glowColor.replace('0.5', '0.15')}, transparent)` 
                    : 'transparent',
                }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Icon container */}
                <div className="relative">
                  <motion.div
                    animate={{
                      scale: isActive ? 1.1 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Icon
                      className={cn(
                        "h-6 w-6 transition-all duration-300",
                        isActive ? "drop-shadow-lg" : ""
                      )}
                      style={{
                        color: isActive ? item.color : "#71717a",
                        filter: isActive ? `drop-shadow(0 0 8px ${item.glowColor})` : 'none',
                      }}
                      aria-hidden="true"
                    />
                  </motion.div>

                  {/* Notification badge */}
                  <AnimatePresence>
                    {item.badge && item.badge > 0 && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute -right-2 -top-1.5 flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-md"
                      >
                        {item.badge > 9 ? '9+' : item.badge}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "text-[10px] font-semibold transition-all duration-300",
                    isActive ? "text-white opacity-100" : "text-zinc-600 opacity-70"
                  )}
                >
                  {item.label}
                </span>

                {/* Active dot indicator */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="mt-0.5 h-1 w-1 rounded-full"
                      style={{
                        backgroundColor: item.color,
                        boxShadow: `0 0 8px ${item.glowColor}`,
                      }}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// Deprecated - use MobileDock instead
export function TeenMobileDock() {
  return <MobileDock />
}
