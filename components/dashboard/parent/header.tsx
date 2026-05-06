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
import { Bell, Menu, LogOut, User, Settings, Crown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface ParentHeaderProps {
  userInfo: UserRoleInfo
}

export function ParentHeader({ userInfo }: ParentHeaderProps) {
  const router = useRouter()
  const initials = userInfo.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  const tier = userInfo.parentData?.subscriptionTier || "free"
  const teenCount = userInfo.parentData?.teenCount || 0

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Ouvrir le menu">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="py-4">
              <div className="px-4 mb-4">
                <h2 className="text-lg font-bold text-blue-600">Teen Club</h2>
                <p className="text-sm text-gray-500">Espace Parent</p>
              </div>
              <nav className="space-y-1 px-2">
                <Link href="/parent" className="flex items-center px-3 py-2 text-sm rounded-lg hover:bg-gray-50">
                  Dashboard
                </Link>
                <Link href="/parent/teens" className="flex items-center px-3 py-2 text-sm rounded-lg hover:bg-gray-50">
                  Mes Teens
                </Link>
                <Link href="/parent/topup" className="flex items-center px-3 py-2 text-sm rounded-lg hover:bg-gray-50">
                  Top-up Crédits
                </Link>
                <Link href="/parent/approvals" className="flex items-center px-3 py-2 text-sm rounded-lg hover:bg-gray-50">
                  Approbations
                </Link>
              </nav>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/parent" className="flex items-center gap-2">
          <span className="text-2xl">👨‍👩‍👧‍👦</span>
          <div className="hidden sm:block">
            <span className="font-bold text-xl text-blue-600">Teen Club</span>
            <span className="text-sm text-gray-500 ml-2">Espace Parent</span>
          </div>
        </Link>

        {/* Stats bar */}
        <div className="hidden md:flex items-center gap-4">
          {/* Subscription tier */}
          <div className="flex items-center gap-2 bg-blue-50 rounded-full px-3 py-1.5">
            <Crown className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700 capitalize">{tier}</span>
          </div>

          {/* Teen count */}
          <div className="flex items-center gap-2 bg-green-50 rounded-full px-3 py-1.5">
            <span className="text-sm font-medium text-green-700">
              {teenCount} teen{teenCount > 1 ? "s" : ""} lié{teenCount > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="h-5 w-5" aria-hidden="true" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" aria-hidden="true" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full" aria-label="Menu utilisateur">
                <Avatar className="h-10 w-10 border-2 border-blue-200">
                  <AvatarFallback className="bg-blue-600 text-white font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{userInfo.fullName}</p>
                  <p className="text-xs text-muted-foreground">{userInfo.email}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Crown className="h-3 w-3 text-blue-600" />
                    <span className="text-xs text-blue-600 font-medium capitalize">
                      Abonnement {tier}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/parent/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Mon Profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/parent/subscription" className="cursor-pointer">
                  <Crown className="mr-2 h-4 w-4" />
                  Mon Abonnement
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/parent/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Paramètres
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
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
