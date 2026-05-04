"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  Tag,
  ShoppingBag,
  QrCode,
  BarChart3,
  Calendar,
  Settings,
  HelpCircle,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/partner", icon: Home },
  { name: "Mes Offres", href: "/partner/offers", icon: Tag },
  { name: "Transactions", href: "/partner/transactions", icon: ShoppingBag },
  { name: "Scanner QR", href: "/partner/scanner", icon: QrCode },
  { name: "Statistiques", href: "/partner/stats", icon: BarChart3 },
  { name: "Events", href: "/partner/events", icon: Calendar },
  { name: "Paramètres", href: "/partner/settings", icon: Settings },
  { name: "Support", href: "/partner/support", icon: HelpCircle },
]

export function PartnerSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:pt-20 bg-zinc-900 border-r border-zinc-800">
      <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4">
        <nav className="flex-1 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"
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
