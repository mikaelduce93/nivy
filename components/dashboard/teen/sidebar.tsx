"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  Calendar,
  Trophy,
  Coins,
  Star,
  Gift,
  User,
  Settings,
  Flame,
  GraduationCap,
  Dumbbell,
  Sparkles,
  Users,
  Share2,
  Gamepad2,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/teen", icon: Home },
  { name: "Events", href: "/teen/events", icon: Calendar },
  { name: "Aide Scolaire", href: "/teen/academic", icon: GraduationCap },
  { name: "Défis Physiques", href: "/teen/challenges", icon: Dumbbell },
  { name: "Parcours Passion", href: "/teen/passions", icon: Sparkles },
  { name: "Games", href: "/teen/games", icon: Gamepad2 },
  { name: "Circles", href: "/teen/circles", icon: Users },
  { name: "Partager", href: "/teen/share", icon: Share2 },
  { name: "Mes Achievements", href: "/gamification/collections", icon: Trophy },
  { name: "Mes Coins", href: "/teen/coins", icon: Coins },
  { name: "Ma Streak", href: "/teen/streak", icon: Flame },
  { name: "Récompenses", href: "/teen/wallet?tab=shop", icon: Gift },
  { name: "Classement", href: "/gamification/leaderboard", icon: Star },
  { name: "Mon Profil", href: "/teen/profile", icon: User },
  { name: "Paramètres", href: "/teen/settings", icon: Settings },
]

export function TeenSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:pt-16 bg-background/80 backdrop-blur-sm border-r border-border">
      <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4">
        <nav className="flex-1 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                  )}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
