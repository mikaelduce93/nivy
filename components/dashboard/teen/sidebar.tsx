"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  Target,
  Users,
  Compass,
  Wallet,
  User,
  Settings,
} from "lucide-react"

// #203 — IA unifiée : 5 piliers (miroir exact de la bottom-nav mobile), puis
// Profil / Paramètres en secondaire. Tous les anciens écrans sont accessibles
// via leur pilier (Jouer regroupe quiz/quêtes/sport, Services regroupe events/
// transport/food/orientation/école, Wallet regroupe coins/boutique/badges…).
const PILLARS = [
  { name: "Accueil", href: "/teen", icon: Home },
  { name: "Jouer", href: "/teen/quests", icon: Target },
  { name: "Crew", href: "/teen/circles", icon: Users },
  { name: "Services", href: "/teen/services", icon: Compass },
  { name: "Wallet", href: "/teen/wallet", icon: Wallet },
]

const SECONDARY = [
  { name: "Mon Profil", href: "/teen/profile", icon: User },
  { name: "Paramètres", href: "/teen/settings", icon: Settings },
]

const navigation = [...PILLARS, ...SECONDARY]

export function TeenSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:pt-16 bg-paper-2 border-r-2 border-ink">
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
                    ? "bg-primary text-primary-foreground border-2 border-ink"
                    : "border-2 border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                // TICKET-018 — surface-aware focus ring: active link has bg-primary,
                // so a primary-coloured ring would disappear. Override to the on-primary
                // (foreground) token so the focus indicator stays visible (WCAG 2.4.7).
                style={isActive ? { ['--focus-ring-color' as string]: 'var(--primary-foreground)' } : undefined}
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
