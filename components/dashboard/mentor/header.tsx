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
import { LogOut, User, GraduationCap } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface MentorHeaderProps {
  userInfo: UserRoleInfo
}

export function MentorHeader({ userInfo }: MentorHeaderProps) {
  const router = useRouter()
  const fullName = userInfo.fullName || "Mentor"

  const initials = fullName
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

  const status = userInfo.mentorData?.status || "pending"
  const statusLabels: Record<string, string> = {
    pending: "En attente",
    active: "Actif",
    paused: "En pause",
    suspended: "Suspendu",
    rejected: "Rejeté",
  }
  const statusColors: Record<string, string> = {
    pending: "text-amber-400",
    active: "text-emerald-400",
    paused: "text-zinc-400",
    suspended: "text-red-400",
    rejected: "text-red-400",
  }

  return (
    <header className="sticky top-0 z-50 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/mentor/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-xl text-white">Nivy</span>
            <span className="text-sm text-zinc-400 ml-2">Mentor</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-4">
          <div className="text-right">
            <p className="font-medium text-sm text-white">{fullName}</p>
            <p className={`text-xs font-bold ${statusColors[status] || "text-zinc-400"}`}>
              {statusLabels[status] || status}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-zinc-800" aria-label="Menu utilisateur">
                <Avatar className="h-10 w-10 border-2 border-zinc-700">
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-zinc-900 border-zinc-800" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-white">{fullName}</p>
                  <p className="text-xs text-zinc-400">{userInfo.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem asChild className="text-zinc-300 focus:bg-zinc-800 focus:text-white">
                <Link href="/mentor/profile/edit" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Mon profil
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
