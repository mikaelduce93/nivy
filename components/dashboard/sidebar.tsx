"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Calendar,
  Ticket,
  Users,
  Star,
  Bell,
  Settings,
  CreditCard,
  Trophy,
  Heart,
} from "lucide-react"

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Mes Réservations",
    href: "/mes-reservations",
    icon: Ticket,
  },
  {
    title: "Mes Clubs",
    href: "/mes-clubs",
    icon: Heart,
  },
  {
    title: "Événements",
    href: "/agenda",
    icon: Calendar,
  },
  {
    title: "Mes Enfants",
    href: "/profile/enfants",
    icon: Users,
  },
  {
    title: "Gamification",
    href: "/gamification",
    icon: Trophy,
  },
  {
    title: "Carte VIP",
    href: "/carte-vip",
    icon: Star,
  },
  {
    title: "Fidélité",
    href: "/carte-vip",
    icon: CreditCard,
  },
  {
    title: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
  {
    title: "Paramètres",
    href: "/mon-compte",
    icon: Settings,
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-card min-h-[calc(100vh-4rem)]">
      <nav className="flex-1 p-4 space-y-1" aria-label="Navigation dashboard">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.title}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
