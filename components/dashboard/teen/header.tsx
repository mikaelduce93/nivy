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
import { useCallback, useEffect, useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useGamificationContext } from "@/components/gamification/gamification-provider"
import { StreakCounter } from "@/components/gamification/streak-counter"
import { useNotificationCounts } from "@/lib/hooks/teen-dashboard"
import { levelProgressForXp } from "@/lib/gamification/level-curve"

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

  // Use real-time XP if available, otherwise fallback to initial userInfo.
  // G2-A — le niveau affiché suit la courbe UI (lib/gamification/level-curve),
  // la même que le wallet et les déblocages boutique/skins (cohérence des
  // « Débloqué au niveau N ») ; user_xp.current_level suit une autre courbe.
  const currentLevel = xp ? levelProgressForXp(xp.total_xp).level : userInfo.teenData?.level || 1

  // G2-A (friction #8) — coins vivants : le solde vient du parent + cashback
  // (PAS du hook XP). Rafraîchi au montage, au retour de focus/visibilité et
  // après chaque gain d'XP (cashback possible), via /api/teen/wallet
  // (source canonique user_coins.balance). SSR intact : valeur initiale =
  // userInfo.teenData.coins, remplacée en douceur côté client.
  const [liveCoins, setLiveCoins] = useState<number | null>(null)
  const refreshCoins = useCallback(async () => {
    try {
      const res = await fetch("/api/teen/wallet")
      if (!res.ok) return
      const data = await res.json()
      if (typeof data?.coins === "number") setLiveCoins(data.coins)
    } catch {
      // best-effort : on garde la dernière valeur connue
    }
  }, [])

  useEffect(() => {
    refreshCoins()
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshCoins()
    }
    // I2 — mutations coins-only (top-up parent, verrouillage/libération
    // d'épargne) ne changent pas l'XP, donc le trigger XP ci-dessous ne
    // fire pas. On écoute l'événement custom nivy:wallet:refresh dispatché
    // par ces surfaces pour resynchroniser le solde affiché.
    const onWalletRefresh = () => refreshCoins()
    window.addEventListener("focus", refreshCoins)
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("nivy:wallet:refresh", onWalletRefresh)
    return () => {
      window.removeEventListener("focus", refreshCoins)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("nivy:wallet:refresh", onWalletRefresh)
    }
  }, [refreshCoins])

  // Gain d'XP temps réel (provider) → possible cashback : on resynchronise.
  const xpTotal = xp?.total_xp
  useEffect(() => {
    if (xpTotal != null) refreshCoins()
  }, [xpTotal, refreshCoins])

  const currentCoins = liveCoins ?? userInfo.teenData?.coins ?? 0

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
    <header className="sticky top-0 z-50 bg-paper border-b-2 border-ink">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Ouvrir le menu">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            {/* Mobile navigation */}
            <div className="py-4">
              <div className="px-4 mb-4">
                <h2 className="text-lg font-bold text-primary">Teen Club</h2>
              </div>
              {/* #203 — miroir des 5 piliers (+ Profil/Paramètres), libellés FR. */}
              <nav className="space-y-1 px-2">
                <Link href="/teen" className="flex items-center px-3 py-2 text-sm rounded-lg hover:bg-muted/40">
                  Accueil
                </Link>
                <Link href="/teen/quests" className="flex items-center px-3 py-2 text-sm rounded-lg hover:bg-muted/40">
                  Jouer
                </Link>
                <Link href="/teen/circles" className="flex items-center px-3 py-2 text-sm rounded-lg hover:bg-muted/40">
                  Crew
                </Link>
                <Link href="/teen/services" className="flex items-center px-3 py-2 text-sm rounded-lg hover:bg-muted/40">
                  Services
                </Link>
                <Link href="/teen/wallet" className="flex items-center px-3 py-2 text-sm rounded-lg hover:bg-muted/40">
                  Wallet
                </Link>
                <Link href="/teen/profile" className="flex items-center px-3 py-2 text-sm rounded-lg hover:bg-muted/40">
                  Mon Profil
                </Link>
                <Link href="/teen/settings" className="flex items-center px-3 py-2 text-sm rounded-lg hover:bg-muted/40">
                  Paramètres
                </Link>
              </nav>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/teen" className="flex items-center gap-2">
          <span className="text-2xl">🎮</span>
          <span className="font-display font-extrabold text-xl tracking-tight text-ink hidden sm:inline">
            Teen <span className="text-pink italic">Club</span>
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

          {/* Niveau et titre — XP = progression (gagnée par l'effort, jamais dépensée) */}
          <div
            className="flex items-center gap-2 border-2 border-ink bg-info-soft rounded-full px-3 py-1.5"
            title="Ton niveau — l'XP se gagne par l'effort et ne se dépense jamais"
          >
            <span className="text-lg">{userInfo.teenData?.titleIcon || "🌱"}</span>
            <span className="text-sm font-bold text-ink">
              Niv. {currentLevel}
            </span>
          </div>

          {/* Coins ⊙ = argent de poche (alimenté par le parent, dépensé dans les services) */}
          <div
            className="flex items-center gap-2 border-2 border-ink bg-coral/15 rounded-full px-3 py-1.5"
            title="Tes coins ⊙ — ton argent de poche, à dépenser dans les services"
          >
            <span className="text-lg">💰</span>
            <span className="text-sm font-bold text-ink tabular-nums">
              {currentCoins.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={
              notificationCounts.total > 0
                ? `Notifications (${notificationCounts.total} non lues)`
                : "Notifications"
            }
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {notificationCounts.total > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full border border-ink bg-pink text-ink text-[10px] font-bold flex items-center justify-center" aria-hidden="true">
                {notificationCounts.total > 9 ? "9+" : notificationCounts.total}
              </span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full" aria-label="Menu utilisateur">
                <Avatar className="h-10 w-10 border-2 border-ink">
                  <AvatarFallback className="bg-pink text-ink font-bold">
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
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
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
