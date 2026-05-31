"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  User, Trophy, Flame, Coins, Star, Calendar, Settings, Camera, Edit2,
  Shield, Award, Target, Users, ChartBar, Clock, LogOut,
  Zap, TrendingUp, Loader2
} from "lucide-react"
import { HubTabs, type HubTab } from "@/components/teen/hub-tabs"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach, Niv, StatHero } from "@/components/brand"
import { SegmentedProgress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useT } from "@/lib/i18n"
import type { Translator } from "@/lib/i18n"

interface ProfileHubClientProps {
  data: {
    profile: any
    teen: any
    userInfo: { fullName: string; profileId: string }
    stats: {
      level: number
      coins: number
      rank: number | null
      friendsCount: number
      totalXp: number
      bestStreak: number
      currentStreak: number
      badges: number
      totalBadges: number
      eventsAttended: number
      missionsCompleted: number
    }
    title: string
    titleIcon: string
  }
}

export function ProfileHubClient({ data }: ProfileHubClientProps) {
  const t = useT()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get("tab") || "profile"
  const { profile, userInfo, stats, title, titleIcon } = data

  const PROFILE_TABS: HubTab[] = [
    { id: "profile", label: t("teen.profile.tabProfile"), icon: User },
    { id: "stats", label: t("teen.profile.tabStats"), icon: ChartBar },
    { id: "activity", label: t("teen.profile.tabActivity"), icon: Clock },
    { id: "settings", label: t("teen.profile.tabSettings"), icon: Settings },
  ]

  return (
    <div className="space-y-8 pt-6 pb-8">
      {/* Header éditorial + avatar */}
      <header className="space-y-6">
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <StickerCard className="relative w-24 h-24 items-center justify-center overflow-hidden p-0 text-4xl font-extrabold text-ink">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={userInfo.fullName}
                  fill
                  sizes="96px"
                  className="object-cover"
                  priority
                />
              ) : (
                userInfo.fullName?.charAt(0) || "?"
              )}
            </StickerCard>
            <Link
              href="/teen/profile/edit"
              aria-label="Modifier la photo de profil"
              className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl border-2 border-ink bg-white text-ink flex items-center justify-center shadow-stkr-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink transition-transform"
            >
              <Camera className="w-5 h-5" aria-hidden="true" />
            </Link>
          </div>

          {/* Info */}
          <div className="flex-1">
            <span className="eyebrow tracking-[0.16em] text-pink">{t("teen.profile.eyebrow")}</span>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">{userInfo.fullName}</h1>
            {profile?.username && (
              <p className="font-mono text-sm text-pink">@{profile.username}</p>
            )}
            <div className="flex items-center gap-2 mt-2 text-mute">
              <span className="text-xl">{titleIcon}</span>
              <span>{title}</span>
              <span>•</span>
              <span>{t("teen.profile.levelLabel", { level: stats.level })}</span>
            </div>
          </div>

          {/* Niv + Modifier */}
          <div className="hidden sm:block">
            <Niv mood="proud" size={64} />
          </div>
        </div>

        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/teen/profile/edit">
            <Edit2 className="w-4 h-4 mr-2" />
            {t("teen.profile.edit")}
          </Link>
        </Button>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: t("teen.profile.statLevel"), value: stats.level, icon: Star, color: "text-teal" },
            { label: t("teen.profile.statCoins"), value: stats.coins.toLocaleString(), icon: Coins, color: "text-coral" },
            { label: t("teen.profile.statRank"), value: stats.rank ? `#${stats.rank}` : "-", icon: Trophy, color: "text-teal" },
            { label: t("teen.profile.statFriends"), value: stats.friendsCount, icon: Users, color: "text-pink" },
          ].map((stat) => (
            <StickerCard key={stat.label} variant="panel" className="p-4 items-center text-center">
              <stat.icon className={cn("w-5 h-5 mb-2", stat.color)} aria-hidden="true" />
              <p className="font-mono text-xl font-bold text-ink tabular-nums">{stat.value}</p>
              <p className="font-mono text-[10px] text-mute uppercase tracking-wider">{stat.label}</p>
            </StickerCard>
          ))}
        </div>

        {/* Tabs */}
        <HubTabs tabs={PROFILE_TABS} defaultTab="profile" ariaLabel={t("teen.profile.tabsAria")} />
      </header>

      {/* Tab Content */}
      <div>
        {currentTab === "profile" && <ProfileTab data={data} t={t} />}
        {currentTab === "stats" && <StatsTab stats={stats} t={t} />}
        {currentTab === "activity" && <ActivityTab stats={stats} teenId={userInfo.profileId} t={t} />}
        {currentTab === "settings" && <SettingsTab t={t} />}
      </div>
    </div>
  )
}

function ProfileTab({ data, t }: { data: ProfileHubClientProps["data"]; t: Translator }) {
  const { profile, stats } = data
  const badgePct = stats.totalBadges > 0 ? Math.round((stats.badges / stats.totalBadges) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Bio */}
      <StickerCard className="p-6">
        <h3 className="eyebrow tracking-[0.16em] mb-4">{t("teen.profile.bio")}</h3>
        <p className="text-ink-2">
          {profile?.bio || t("teen.profile.bioEmpty")}
        </p>
      </StickerCard>

      {/* Achievements Preview */}
      <StickerCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="eyebrow tracking-[0.16em]">{t("teen.profile.trophies")}</h3>
          <Link href="/teen/wallet?tab=badges" className="text-sm text-pink font-bold hover:underline">
            {t("teen.profile.seeAll")}
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-mute">{t("teen.profile.progression")}</span>
              <span className="font-mono font-bold text-pink tabular-nums">{stats.badges}/{stats.totalBadges}</span>
            </div>
            <SegmentedProgress steps={stats.totalBadges || 1} current={stats.badges} />
          </div>
          <div className="text-center px-4">
            <p className="font-display text-3xl font-extrabold text-pink tabular-nums">
              {badgePct}%
            </p>
          </div>
        </div>
      </StickerCard>

      {/* Privacy Notice */}
      <StickerCard variant="panel" className="p-4">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-teal" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-ink">{t("teen.profile.privacy")}</p>
            <p className="text-xs text-mute">{t("teen.profile.privacyDesc")}</p>
          </div>
        </div>
      </StickerCard>
    </div>
  )
}

function StatsTab({ stats, t }: { stats: ProfileHubClientProps["data"]["stats"]; t: Translator }) {
  return (
    <div className="space-y-6">
      {/* XP Overview — surface sombre ponctuelle */}
      <StatHero
        eyebrow={t("teen.profile.totalXp")}
        value={stats.totalXp.toLocaleString()}
        tone="gold"
        size="lg"
        icon={<Zap className="size-7" aria-hidden="true" />}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t("teen.profile.bestStreak"), value: stats.bestStreak, icon: Flame, color: "text-coral", suffix: t("teen.profile.bestStreakSuffix") },
          { label: t("teen.profile.badges"), value: stats.badges, icon: Award, color: "text-gold", suffix: "" },
          { label: t("teen.profile.events"), value: stats.eventsAttended, icon: Calendar, color: "text-lime", suffix: "" },
          { label: t("teen.profile.missions"), value: stats.missionsCompleted, icon: Target, color: "text-teal", suffix: "" },
        ].map((stat) => (
          <StickerCard key={stat.label} className="p-6 items-center text-center">
            <stat.icon className={cn("w-8 h-8 mb-3", stat.color)} aria-hidden="true" />
            <p className="font-mono text-3xl font-bold text-ink tabular-nums">{stat.value}{stat.suffix}</p>
            <p className="font-mono text-xs text-mute uppercase tracking-wider mt-1">{stat.label}</p>
          </StickerCard>
        ))}
      </div>
    </div>
  )
}

function ActivityTab({ stats, teenId, t }: { stats: ProfileHubClientProps["data"]["stats"]; teenId?: string; t: Translator }) {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Icon mapping for activity types
  const iconMap: Record<string, any> = {
    streak: Flame,
    quest: Target,
    social: Users,
    event: Calendar,
    badge: Award,
    xp: Zap,
    level: TrendingUp,
    general: Clock,
  }

  const colorMap: Record<string, string> = {
    streak: "text-pink",
    quest: "text-lime",
    social: "text-teal",
    event: "text-lime",
    badge: "text-gold",
    xp: "text-gold",
    level: "text-teal",
    general: "text-mute",
  }

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch('/api/teen/activities?limit=10')
        if (response.ok) {
          const data = await response.json()
          setActivities(data.activities || [])
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error)
        // Fallback to current streak as activity
        setActivities([
          { id: '1', type: 'streak', text: `Streak de ${stats.currentStreak} jours active !`, time: t("teen.profile.streakNow") }
        ])
      } finally {
        setLoading(false)
      }
    }
    fetchActivities()
  }, [teenId, stats.currentStreak])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-pink" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Niv mood="calm" size={80} />
        <h3 className="font-display text-xl font-extrabold text-ink mt-4 mb-2">{t("teen.profile.activityEmptyTitle")}</h3>
        <p className="text-mute max-w-sm">
          {t("teen.profile.activityEmptyDesc")}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, idx) => {
        const ActivityIcon = iconMap[activity.type] || Clock
        const iconColor = colorMap[activity.type] || "text-mute"

        return (
          <StickerCard key={activity.id || idx} className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl border-2 border-ink bg-ink/5 flex items-center justify-center shrink-0">
                <ActivityIcon className={cn("w-6 h-6", iconColor)} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-ink">{activity.text}</p>
                <p className="font-mono text-sm text-mute">{activity.time}</p>
              </div>
            </div>
          </StickerCard>
        )
      })}
    </div>
  )
}

function SettingsTab({ t }: { t: Translator }) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout failed:', error)
      setLoggingOut(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header éditorial + Niv */}
      <header className="space-y-4">
        <span className="eyebrow tracking-[0.16em] text-pink">{t("teen.profile.settingsEyebrow")}</span>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          {t("teen.profile.settingsTitleLead")} <em className="font-semibold italic text-pink">{t("teen.profile.settingsTitleEm")}</em>
        </h1>
        <NivCoach
          mood="calm"
          message={t("teen.profile.settingsCoach")}
        />
      </header>

      {/* Compte */}
      <section className="space-y-3">
        <span className="eyebrow tracking-[0.16em]">{t("teen.profile.account")}</span>
        <Link href="/teen/profile/edit" className="block focus:outline-none">
          <StickerCard variant="hover" className="p-4">
            <div className="flex items-center gap-4">
              <Edit2 className="size-5 text-ink" aria-hidden="true" />
              <span className="flex-1 font-medium text-ink">{t("teen.profile.editProfile")}</span>
            </div>
          </StickerCard>
        </Link>
      </section>

      {/* Déconnexion */}
      <Button
        variant="outline"
        className="w-full"
        onClick={handleLogout}
        disabled={loggingOut}
      >
        <LogOut className="w-4 h-4 mr-2" />
        {loggingOut ? t("teen.profile.loggingOut") : t("teen.profile.logout")}
      </Button>
    </div>
  )
}
