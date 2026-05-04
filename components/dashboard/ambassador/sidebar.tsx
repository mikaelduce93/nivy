"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  Users,
  Wallet,
  Link2,
  BarChart3,
  Gift,
  Settings,
  HelpCircle,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/ambassador", icon: Home },
  { name: "Mes Filleuls", href: "/ambassador/referrals", icon: Users },
  { name: "Mes Commissions", href: "/ambassador/commissions", icon: Wallet },
  { name: "Mon Lien", href: "/ambassador/link", icon: Link2 },
  { name: "Statistiques", href: "/ambassador/stats", icon: BarChart3 },
  { name: "Récompenses", href: "/ambassador/rewards", icon: Gift },
  { name: "Paramètres", href: "/ambassador/settings", icon: Settings },
  { name: "Aide", href: "/ambassador/help", icon: HelpCircle },
]

export function AmbassadorSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:pt-16 bg-white/80 backdrop-blur-sm border-r border-amber-100">
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
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25"
                    : "text-gray-600 hover:bg-amber-50 hover:text-amber-700"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                    isActive ? "text-white" : "text-gray-400 group-hover:text-amber-500"
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
