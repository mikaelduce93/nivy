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
import { Bell, Menu, LogOut, User, Settings, Building2 } from "lucide-react"
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
    <header className="sticky top-0 z-50 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-800" aria-label="Ouvrir le menu">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-zinc-900 border-zinc-800">
            <div className="py-4">
              <div className="px-4 mb-4">
                <h2 className="text-lg font-bold text-white">Teen Club</h2>
                <p className="text-sm text-zinc-400">Espace Partenaire</p>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/partner" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-xl text-white">Teen Club</span>
            <span className="text-sm text-zinc-400 ml-2">Partner</span>
          </div>
        </Link>

        {/* Company info */}
        <div className="hidden md:flex items-center gap-4">
          <div className="text-right">
            <p className="font-medium text-sm text-white">{companyName}</p>
            <p className="text-xs text-zinc-400">{typeLabels[partnerType]}</p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative text-zinc-400 hover:text-white hover:bg-zinc-800" aria-label="Notifications">
            <Bell className="h-5 w-5" aria-hidden="true" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-emerald-500 rounded-full" aria-hidden="true" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-zinc-800" aria-label="Menu utilisateur">
                <Avatar className="h-10 w-10 border-2 border-zinc-700">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-zinc-900 border-zinc-800" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-white">{companyName}</p>
                  <p className="text-xs text-zinc-400">{userInfo.email}</p>
                  <p className="text-xs text-emerald-400 font-medium mt-1">
                    {typeLabels[partnerType]}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem asChild className="text-zinc-300 focus:bg-zinc-800 focus:text-white">
                <Link href="/partner/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profil entreprise
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-zinc-300 focus:bg-zinc-800 focus:text-white">
                <Link href="/partner/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Paramètres
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-400">
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
