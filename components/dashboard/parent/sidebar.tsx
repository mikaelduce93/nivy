"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { UserRoleInfo } from "@/lib/auth/get-user-role"
import {
  Home,
  Users,
  CreditCard,
  Calendar,
  Bell,
  FileCheck,
  History,
  Settings,
  Crown,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/parent", icon: Home },
  { name: "Mes Teens", href: "/parent/teens", icon: Users },
  { name: "Top-up Crédits", href: "/parent/topup", icon: CreditCard },
  { name: "Approbations", href: "/parent/approvals", icon: FileCheck },
  { name: "Events", href: "/parent/events", icon: Calendar },
  { name: "Historique", href: "/parent/history", icon: History },
  { name: "Notifications", href: "/parent/notifications", icon: Bell },
  { name: "Abonnement", href: "/parent/subscription", icon: Crown },
  { name: "Paramètres", href: "/parent/settings", icon: Settings },
]

interface ParentSidebarProps {
  userInfo: UserRoleInfo
}

export function ParentSidebar({ userInfo }: ParentSidebarProps) {
  const pathname = usePathname()
  const tier = userInfo.parentData?.subscriptionTier || "free"

  const tierColors: Record<string, string> = {
    free: "bg-paper-2 text-ink",
    silver: "bg-paper-2 text-ink",
    gold: "bg-gold text-gold",
    platinum: "bg-pink text-pink",
  }

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:pt-16 bg-white border-r">
      <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4">
        {/* Subscription Badge */}
        <div className="px-4 mb-4">
          <div className={cn("rounded-lg p-3 text-center", tierColors[tier])}>
            <Crown className="h-5 w-5 mx-auto mb-1" />
            <p className="text-xs font-medium uppercase">{tier}</p>
            {tier !== "free" && (
              <p className="text-xs mt-1">
                {tier === "silver" && "-10%"}
                {tier === "gold" && "-20%"}
                {tier === "platinum" && "-30%"}
                {" sur les activités"}
              </p>
            )}
          </div>
        </div>

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
                    ? "bg-teal text-teal"
                    : "text-mute hover:bg-paper-2 hover:text-ink"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive ? "text-teal" : "text-mute group-hover:text-mute"
                  )}
                />
                {item.name}
                {item.name === "Approbations" && (
                  <span className="ml-auto bg-destructive text-destructive text-xs px-2 py-0.5 rounded-full">
                    2
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
