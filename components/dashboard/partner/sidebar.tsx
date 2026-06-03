"use client"

/**
 * Wave 3A — type-aware partner sidebar (canon §6 F4 fix).
 *
 * Items shown depend on `partner_type`:
 *   - retail / venue / club / education / event_organizer → core ops items
 *   - food → adds Menu + Orders
 *   - retail also gets Scanner (VIP card redemption)
 *
 * Always-on items: Dashboard, KYC, Payouts, Invoices, Settings, Support.
 * Pending partners (status≠'active') get a flat awaiting-approval list.
 */

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
  FileText,
  Wallet,
  ShieldCheck,
  Utensils,
  ClipboardList,
  Music,
  Sparkles,
  Mail,
} from "lucide-react"

export type PartnerType =
  | "retail"
  | "venue"
  | "club"
  | "education"
  | "food"
  | "event_talent"
  | "event_organizer"
  | "creator"
  | null

interface NavItem {
  name: string
  href: string
  icon: typeof Home
}

interface SidebarProps {
  partnerType?: PartnerType
  partnerStatus?: "pending" | "in_review" | "active" | "rejected" | "suspended" | "offboarded" | null
}

const ALWAYS: NavItem[] = [
  { name: "Dashboard", href: "/partner", icon: Home },
  { name: "KYC", href: "/partner/kyc", icon: ShieldCheck },
  { name: "Payouts", href: "/partner/payouts", icon: Wallet },
  { name: "Factures", href: "/partner/invoices", icon: FileText },
  { name: "Paramètres", href: "/partner/settings", icon: Settings },
  { name: "Support", href: "/partner/support", icon: HelpCircle },
]

export const PENDING_NAV: NavItem[] = [
  { name: "Dashboard", href: "/partner", icon: Home },
  { name: "KYC", href: "/partner/kyc", icon: ShieldCheck },
  { name: "Support", href: "/partner/support", icon: HelpCircle },
]

export function buildActiveNav(partnerType: PartnerType): NavItem[] {
  const core: NavItem[] = [
    { name: "Mes Offres", href: "/partner/offers", icon: Tag },
    { name: "Transactions", href: "/partner/transactions", icon: ShoppingBag },
    { name: "Statistiques", href: "/partner/stats", icon: BarChart3 },
  ]

  // Type-specific extensions.
  const extensions: NavItem[] = []
  if (partnerType === "food") {
    extensions.push(
      { name: "Menu", href: "/partner/restaurant/menu", icon: Utensils },
      { name: "Commandes", href: "/partner/restaurant/orders", icon: ClipboardList },
    )
  }
  if (partnerType === "retail" || partnerType === "venue" || partnerType === "club" || partnerType === "education") {
    extensions.push({ name: "Scanner QR", href: "/partner/scanner", icon: QrCode })
  }
  if (partnerType === "event_organizer" || partnerType === "venue") {
    extensions.push({ name: "Évènements", href: "/partner/events", icon: Calendar })
  }
  if (partnerType === "event_talent") {
    extensions.push(
      { name: "Talent", href: "/partner/talent", icon: Music },
      { name: "Bookings", href: "/partner/talent/bookings", icon: Calendar },
    )
  }
  if (partnerType === "creator") {
    extensions.push(
      { name: "Créateur", href: "/partner/creator", icon: Sparkles },
      { name: "Briefs", href: "/partner/creator/briefs", icon: Mail },
    )
  }

  // Order: dashboard (always) → core → extensions → tail (KYC/Payouts/Invoices/Settings/Support)
  return [
    ALWAYS[0], // Dashboard
    ...core,
    ...extensions,
    ...ALWAYS.slice(1),
  ]
}

export function PartnerSidebar({ partnerType = null, partnerStatus = null }: SidebarProps) {
  const pathname = usePathname()
  const navigation = partnerStatus !== "active" ? PENDING_NAV : buildActiveNav(partnerType)

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:pt-20 bg-card border-r border-ink">
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
                    ? "bg-gradient-to-r from-lime/20 to-teal/20 text-lime border border-lime/30"
                    : "text-mute hover:bg-card hover:text-ink",
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive ? "text-lime" : "text-mute group-hover:text-ink-2",
                  )}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
        {partnerStatus && partnerStatus !== "active" ? (
          <div className="px-3 py-2 mx-3 mt-4 text-xs text-gold border border-gold/30 rounded-lg bg-gold/10">
            Compte en attente d&apos;activation. Outils complets après approbation.
          </div>
        ) : null}
      </div>
    </aside>
  )
}
