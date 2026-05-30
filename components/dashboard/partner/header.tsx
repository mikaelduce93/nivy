"use client"

import { UserRoleInfo } from "@/lib/auth/get-user-role"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Menu, LogOut, User, Settings, Building2 } from "lucide-react"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface PartnerHeaderProps {
  userInfo: UserRoleInfo
}

export function PartnerHeader({ userInfo }: PartnerHeaderProps) {
  const router = useRouter()
  const companyName = userInfo.partnerData?.companyName || "Entreprise"
  const partnerType = userInfo.partnerData?.partnerType || "retail"

  const initials = companyName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const typeLabels: Record<string, string> = {
    retail: "Commerce",
    venue: "Lieu/Restaurant",
    club: "Club/Sport",
    education: "Education",
  }

  return (
    <header className="sticky top-0 z-50 bg-card  border-b border-ink">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="text-mute hover:text-ink hover:bg-card" aria-label="Ouvrir le menu">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-card border-ink">
            <div className="py-4">
              <div className="px-4 mb-4">
                <h2 className="text-lg font-bold text-ink">Teen Club</h2>
                <p className="text-sm text-mute">Espace Partenaire</p>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/partner" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-lime to-teal flex items-center justify-center">
            <Building2 className="h-5 w-5 text-ink" />
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-xl text-ink">Teen Club</span>
            <span className="text-sm text-mute ml-2">Partner</span>
          </div>
        </Link>

        {/* Company info */}
        <div className="hidden md:flex items-center gap-4">
          <div className="text-right">
            <p className="font-medium text-sm text-ink">{companyName}</p>
            <p className="text-xs text-mute">{typeLabels[partnerType]}</p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* #70 — real user_notifications-backed bell (was a static emerald dot). */}
          <NotificationBell userId={userInfo.profileId} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-card" aria-label="Menu utilisateur">
                <Avatar className="h-10 w-10 border-2 border-ink">
                  <AvatarFallback className="bg-gradient-to-br from-lime to-teal text-ink font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-card border-ink" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-ink">{companyName}</p>
                  <p className="text-xs text-mute">{userInfo.email}</p>
                  <p className="text-xs text-lime font-medium mt-1">
                    {typeLabels[partnerType]}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-card" />
              <DropdownMenuItem asChild className="text-ink-2 focus:bg-card focus:text-ink">
                <Link href="/partner/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profil entreprise
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-ink-2 focus:bg-card focus:text-ink">
                <Link href="/partner/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Paramètres
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-card" />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
