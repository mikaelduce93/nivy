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
import { Bell, Menu, LogOut, User, Settings } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useGamificationContext } from "@/components/gamification/gamification-provider"
import { StreakCounter } from "@/components/gamification/streak-counter"
import { useNotificationCounts } from "@/lib/hooks/teen-dashboard"

interface TeenHeaderProps {
  userInfo: UserRoleInfo
}

export function TeenHeader({ userInfo }: TeenHeaderProps) {
  const router = useRouter()
  const { streak, xp } = useGamificationContext()
  const notificationCounts = useNotificationCounts(userInfo.teenData?.id)
  
  const initials = userInfo.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  // Use real-time XP if available, otherwise fallback to initial userInfo
  const currentLevel = xp?.level || userInfo.teenData?.level || 1
  const currentCoins = userInfo.teenData?.coins || 0 // XP hook doesn't provide coins yet, keep static or update provider

  // Calculate if streak is critical (expires in < 4h)
  const isCritical = (() => {
    if (!streak?.last_activity_date || !streak.current_streak) return false
    
    const lastActivity = new Date(streak.last_activity_date)
    const now = new Date()
    
    // Check if activity was today
    const isToday = lastActivity.toDateString() === now.toDateString()
    if (isToday) return false
    
    // If not today, check if it's late in the day (after 8 PM = < 4h left)
    const hours = now.getHours()
    return hours >= 20
  })()

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            {/* Mobile navigation */}
            <div className="py-4">
              <div className="px-4 mb-4">
                <h2 className="text-lg font-bold text-primary">Teen Club</h2>
              </div>
              <nav className="space-y-1 px-2">
                <Link href="/teen" className="flex items-center px-3 py-2 text-sm rounded-lg hover:bg-muted/40">
                  Dashboard
                </Link>
                <Link href="/teen/events" className="flex items-center px-3 py-2 text-sm rounded-lg hover:bg-muted/40">
                  Events
                </Link>
                <Link href="/teen/achievements" className="flex items-center px-3 py-2 text-sm rounded-lg hover:bg-muted/40">
                  Achievements
                </Link>
                <Link href="/teen/coins" className="flex items-center px-3 py-2 text-sm rounded-lg hover:bg-muted/40">
                  Mes Coins
                </Link>
              </nav>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/teen" className="flex items-center gap-2">
          <span className="text-2xl">🎮</span>
          <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent hidden sm:inline">
            Teen Club
          </span>
        </Link>

        {/* User stats bar */}
        <div className="hidden md:flex items-center gap-4">
          {/* Global Streak */}
          <Link href="/teen/streak">
            <StreakCounter 
              currentStreak={streak?.current_streak || 0}
              maxStreak={streak?.longest_streak}
              isCritical={isCritical}
              variant="compact"
            />
          </Link>

          {/* Niveau et titre */}
          <div className="flex items-center gap-2 bg-primary/10 rounded-full px-3 py-1.5">
            <span className="text-lg">{userInfo.teenData?.titleIcon || "🌱"}</span>
            <span className="text-sm font-medium text-primary">
              Niv. {currentLevel}
            </span>
          </div>

          {/* Coins */}
          <div className="flex items-center gap-2 bg-warning/10 rounded-full px-3 py-1.5">
            <span className="text-lg">💰</span>
            <span className="text-sm font-medium text-warning">
              {currentCoins.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {notificationCounts.total > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {notificationCounts.total > 9 ? "9+" : notificationCounts.total}
              </span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border-2 border-border">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
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
                    <span>{userInfo.teenData?.titleIcon}</span>
                    <span className="text-xs text-primary font-medium">
                      {userInfo.teenData?.title} - Niveau {currentLevel}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/teen/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Mon Profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/teen/settings" className="cursor-pointer">
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
