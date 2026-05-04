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
import { Bell, Menu, LogOut, User, Settings, Copy } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { toast } from "sonner"

interface AmbassadorHeaderProps {
  userInfo: UserRoleInfo
}

export function AmbassadorHeader({ userInfo }: AmbassadorHeaderProps) {
  const router = useRouter()
  const initials = userInfo.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  const commissionRate = userInfo.ambassadorData?.commissionRate || 0

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const copyReferralLink = () => {
    navigator.clipboard.writeText(`https://teenclub.ma/ref/${userInfo.profileId.slice(0, 8)}`)
    toast.success("Lien copié!")
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-amber-100">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="py-4">
              <div className="px-4 mb-4">
                <h2 className="text-lg font-bold text-amber-600">Teen Club</h2>
                <p className="text-sm text-gray-500">Espace Ambassadeur</p>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/ambassador" className="flex items-center gap-2">
          <span className="text-2xl">🌟</span>
          <div className="hidden sm:block">
            <span className="font-bold text-xl text-amber-600">Teen Club</span>
            <span className="text-sm text-gray-500 ml-2">Ambassador</span>
          </div>
        </Link>

        {/* Quick copy link */}
        <div className="hidden md:flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={copyReferralLink}
            className="border-amber-200 hover:bg-amber-50"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copier mon lien
          </Button>
          <div className="flex items-center gap-2 bg-green-50 rounded-full px-3 py-1.5">
            <span className="text-sm font-medium text-green-700">
              {commissionRate}% commission
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border-2 border-amber-200">
                  <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold">
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
                  <p className="text-xs text-amber-600 font-medium mt-1">
                    🌟 Ambassadeur • {commissionRate}%
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/ambassador/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Mon Profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/ambassador/settings" className="cursor-pointer">
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
