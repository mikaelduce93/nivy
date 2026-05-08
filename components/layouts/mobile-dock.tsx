"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Swords,
  Users,
  Wallet,
  User,
  Calendar,
  Cake,
  Trophy,
  Sparkles,
  Tag,
  BarChart3,
  Settings,
  ShieldCheck,
  Store,
  Banknote,
  Share2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { EASE_STANDARD, SPRING_SNAPPY } from "@/lib/motion/easing"

// W3-A5 / TICKET-019 — iOS-grade dock indicator spring. Slightly stiffer
// than the canonical SPRING_SNAPPY (380/32/0.8 vs. 380/30/1) so the pill
// settles a hair faster under thumb. SPRING_SNAPPY remains the fallback
// for any consumer that wants the canonical preset.
const DOCK_PILL_SPRING = {
  ...SPRING_SNAPPY,
  damping: 32,
  mass: 0.8,
}

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
  const prefersReducedMotion = useReducedMotion()

  const isTeenArea = pathname?.startsWith("/teen")
  const isParentArea = pathname?.startsWith("/parent")
  const isAdminArea = pathname?.startsWith("/admin")
  const isPartnerArea = pathname?.startsWith("/partner")
  const isAmbassadorArea = pathname?.startsWith("/ambassador")

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

  const partnerNavItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/partner",
      icon: Home,
      color: "rgb(125, 211, 252)",
      glowColor: "rgba(125, 211, 252, 0.5)",
    },
    {
      label: "Offres",
      href: "/partner/offers",
      icon: Tag,
      color: "rgb(253, 164, 175)",
      glowColor: "rgba(253, 164, 175, 0.5)",
    },
    {
      label: "Events",
      href: "/partner/events",
      icon: Calendar,
      color: "rgb(196, 181, 253)",
      glowColor: "rgba(196, 181, 253, 0.5)",
    },
    {
      label: "Stats",
      href: "/partner/stats",
      icon: BarChart3,
      color: "rgb(190, 242, 100)",
      glowColor: "rgba(190, 242, 100, 0.5)",
    },
    {
      label: "Profil",
      href: "/partner/profile",
      icon: User,
      color: "rgb(254, 215, 170)",
      glowColor: "rgba(254, 215, 170, 0.5)",
    },
  ]

  const adminNavItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: Home,
      color: "rgb(125, 211, 252)",
      glowColor: "rgba(125, 211, 252, 0.5)",
    },
    {
      label: "Events",
      href: "/admin/events",
      icon: Calendar,
      color: "rgb(196, 181, 253)",
      glowColor: "rgba(196, 181, 253, 0.5)",
    },
    {
      label: "Users",
      href: "/admin/users",
      icon: ShieldCheck,
      color: "rgb(253, 164, 175)",
      glowColor: "rgba(253, 164, 175, 0.5)",
    },
    {
      label: "Analytics",
      href: "/admin/analytics",
      icon: BarChart3,
      color: "rgb(190, 242, 100)",
      glowColor: "rgba(190, 242, 100, 0.5)",
    },
    {
      label: "Settings",
      href: "/admin/settings",
      icon: Settings,
      color: "rgb(161, 161, 170)",
      glowColor: "rgba(161, 161, 170, 0.5)",
    },
  ]

  const ambassadorNavItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/ambassador",
      icon: Home,
      color: "rgb(254, 215, 170)",
      glowColor: "rgba(254, 215, 170, 0.5)",
    },
    {
      label: "Referrals",
      href: "/ambassador/referrals",
      icon: Share2,
      color: "rgb(196, 181, 253)",
      glowColor: "rgba(196, 181, 253, 0.5)",
    },
    {
      label: "Boutique",
      href: "/ambassador/shop",
      icon: Store,
      color: "rgb(253, 164, 175)",
      glowColor: "rgba(253, 164, 175, 0.5)",
    },
    {
      label: "Retraits",
      href: "/ambassador/withdrawals",
      icon: Banknote,
      color: "rgb(253, 224, 71)",
      glowColor: "rgba(253, 224, 71, 0.5)",
    },
    {
      label: "Profil",
      href: "/ambassador/profile",
      icon: User,
      color: "rgb(190, 242, 100)",
      glowColor: "rgba(190, 242, 100, 0.5)",
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

  // Parent has its own dedicated dock component (rendered separately in
  // /parent layout). All other zones funnel through this component.
  if (isParentArea) return null

  const navItems = isAdminArea
    ? adminNavItems
    : isPartnerArea
      ? partnerNavItems
      : isAmbassadorArea
        ? ambassadorNavItems
        : isTeenArea
          ? teenNavItems
          : publicNavItems

  // Compute the "home" path of the active zone so we don't mark the home
  // tab as active for every nested route. Default `/teen` was hardcoded.
  const zoneHome = isAdminArea
    ? "/admin"
    : isPartnerArea
      ? "/partner"
      : isAmbassadorArea
        ? "/ambassador"
        : isTeenArea
          ? "/teen"
          : "/"

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
                className="flex flex-1 flex-col items-center gap-0.5 py-2.5 min-h-touch"
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
          const isActive = pathname === item.href || (item.href !== zoneHome && pathname?.startsWith(item.href))

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
                  "relative flex flex-col items-center gap-0.5 rounded-xl py-2.5 min-h-touch",
                  !isActive && "hover:bg-white/5"
                )}
                // Tap feedback: 1 -> 0.92 -> 1 over ~80ms (TICKET-019).
                whileTap={
                  prefersReducedMotion
                    ? undefined
                    : { scale: 0.92, transition: { duration: 0.08, ease: EASE_STANDARD } }
                }
                transition={{ duration: 0.08, ease: EASE_STANDARD }}
              >
                {/* Animated active pill — slides between tabs via layoutId.
                    With prefers-reduced-motion the indicator jumps instantly. */}
                {isActive && (
                  <motion.div
                    layoutId="mobile-dock-active-pill"
                    aria-hidden="true"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: `linear-gradient(to top, ${item.glowColor.replace('0.5', '0.18')}, transparent)`,
                    }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : DOCK_PILL_SPRING
                    }
                  />
                )}

                {/* Icon container */}
                <div className="relative z-10">
                  <motion.div
                    // Subtle bounce when an icon becomes the active tab.
                    initial={false}
                    animate={
                      isActive
                        ? prefersReducedMotion
                          ? { scale: 1 }
                          : { scale: [1, 1.15, 1] }
                        : { scale: 1 }
                    }
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { duration: 0.32, ease: EASE_STANDARD, times: [0, 0.55, 1] }
                    }
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

                {/* Label — opacity fade 0.6 -> 1 on activation */}
                <motion.span
                  className={cn(
                    "relative z-10 text-[10px] font-semibold",
                    isActive ? "text-white" : "text-zinc-500"
                  )}
                  initial={false}
                  animate={{ opacity: isActive ? 1 : 0.6 }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { duration: 0.2, ease: EASE_STANDARD }
                  }
                >
                  {item.label}
                </motion.span>

                {/* Active dot indicator */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="relative z-10 mt-0.5 h-1 w-1 rounded-full"
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
