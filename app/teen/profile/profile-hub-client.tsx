"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { 
  User, Trophy, Flame, Coins, Star, Calendar, Settings, Camera, Edit2,
  Shield, Award, Target, Users, ChartBar, Clock, LogOut,
  Zap, TrendingUp, Check, Loader2
} from "lucide-react"
import { HubTabs, type HubTab } from "@/components/teen/hub-tabs"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach } from "@/components/brand"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"

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

const PROFILE_TABS: HubTab[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "stats", label: "Stats", icon: ChartBar },
  { id: "activity", label: "Activity", icon: Clock },
  { id: "settings", label: "Settings", icon: Settings },
]

export function ProfileHubClient({ data }: ProfileHubClientProps) {
  const searchParams = useSearchParams()
  const currentTab = searchParams.get("tab") || "profile"
  const { profile, teen, userInfo, stats, title, titleIcon } = data

  return (
    <div className="space-y-8 pt-6 pb-8">
      {/* Header with Avatar */}
      <header className="space-y-6">
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative"
          >
            <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-brand-soft to-info-soft flex items-center justify-center text-4xl font-black text-ink overflow-hidden">
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
            </div>
            <button
              type="button"
              aria-label="Modifier la photo de profil"
              className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-white text-ink flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            >
              <Camera className="w-5 h-5" aria-hidden="true" />
            </button>
          </motion.div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-black tracking-tight">{userInfo.fullName}</h1>
            {profile?.username && (
              <p className="text-brand-soft font-medium">@{profile.username}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xl">{titleIcon}</span>
              <span className="text-mute">{title}</span>
              <span className="text-mute">•</span>
              <span className="text-mute">Level {stats.level}</span>
            </div>
          </div>

          {/* Edit Button */}
          <Button asChild variant="outline" className="rounded-2xl">
            <Link href="/teen/profile/edit">
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Link>
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Level", value: stats.level, icon: Star, color: "text-success-soft" },
            { label: "Coins", value: stats.coins.toLocaleString(), icon: Coins, color: "text-gold" },
            { label: "Rank", value: stats.rank ? `#${stats.rank}` : "-", icon: Trophy, color: "text-brand-soft" },
            { label: "Friends", value: stats.friendsCount, icon: Users, color: "text-accent-soft" },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              whileHover={{ scale: 1.02 }}
              className="p-4 rounded-2xl bg-card border border-ink text-center"
            >
              <stat.icon className={cn("w-5 h-5 mx-auto mb-2", stat.color)} />
              <p className="text-xl font-black text-ink">{stat.value}</p>
              <p className="text-[10px] text-mute uppercase tracking-wider">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <HubTabs tabs={PROFILE_TABS} defaultTab="profile" />
      </header>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentTab === "profile" && <ProfileTab data={data} />}
          {currentTab === "stats" && <StatsTab stats={stats} />}
          {currentTab === "activity" && <ActivityTab stats={stats} teenId={userInfo.profileId} />}
          {currentTab === "settings" && <SettingsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function ProfileTab({ data }: { data: ProfileHubClientProps["data"] }) {
  const { profile, stats } = data

  return (
    <div className="space-y-6">
      {/* Bio */}
      <div className="p-6 rounded-2xl bg-card border border-ink">
        <h3 className="text-sm font-bold text-mute uppercase tracking-wider mb-4">Bio</h3>
        <p className="text-ink-2">
          {profile?.bio || "No bio yet. Tap Edit to add one!"}
        </p>
      </div>

      {/* Achievements Preview */}
      <div className="p-6 rounded-2xl bg-card border border-ink">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-mute uppercase tracking-wider">Achievements</h3>
          <Link href="/teen/wallet?tab=badges" className="text-sm text-brand-soft font-bold hover:underline">
            See all
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-mute">Progress</span>
              <span className="font-bold text-brand-soft">{stats.badges}/{stats.totalBadges}</span>
            </div>
            <Progress value={(stats.badges / stats.totalBadges) * 100} className="h-3" />
          </div>
          <div className="text-center px-4">
            <p className="text-3xl font-black text-brand-soft">
              {Math.round((stats.badges / stats.totalBadges) * 100)}%
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="p-4 rounded-2xl bg-info-soft/10 border border-info-soft/20">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-info-soft" />
          <div>
            <p className="text-sm font-bold text-info-soft">Privacy</p>
            <p className="text-xs text-mute">Your profile is only visible to friends</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatsTab({ stats }: { stats: ProfileHubClientProps["data"]["stats"] }) {
  return (
    <div className="space-y-6">
      {/* XP Overview */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-brand-soft/10 to-info-soft/5 border border-brand-soft/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-mute uppercase tracking-wider">Total XP</p>
            <p className="text-5xl font-black text-brand-soft">{stats.totalXp.toLocaleString()}</p>
          </div>
          <div className="w-20 h-20 rounded-2xl bg-brand-soft/20 flex items-center justify-center">
            <Zap className="w-10 h-10 text-brand-soft" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Best Streak", value: stats.bestStreak, icon: Flame, color: "text-coral", suffix: " days" },
          { label: "Badges", value: stats.badges, icon: Award, color: "text-brand-soft", suffix: "" },
          { label: "Events", value: stats.eventsAttended, icon: Calendar, color: "text-success-soft", suffix: "" },
          { label: "Missions", value: stats.missionsCompleted, icon: Target, color: "text-accent-soft", suffix: "" },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="p-6 rounded-2xl bg-card border border-ink text-center"
          >
            <stat.icon className={cn("w-8 h-8 mx-auto mb-3", stat.color)} />
            <p className="text-3xl font-black text-ink">{stat.value}{stat.suffix}</p>
            <p className="text-xs text-mute uppercase tracking-wider mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Comparison */}
      <div className="p-6 rounded-2xl bg-card border border-ink">
        <h3 className="text-sm font-bold text-mute uppercase tracking-wider mb-4">Vs. Average</h3>
        <div className="space-y-4">
          {[
            { label: "XP", yours: stats.totalXp, avg: 1500, color: "bg-brand-soft" },
            { label: "Badges", yours: stats.badges, avg: 5, color: "bg-accent-soft" },
            { label: "Events", yours: stats.eventsAttended, avg: 3, color: "bg-success-soft" },
          ].map((item) => {
            const pct = Math.min(100, (item.yours / (item.avg * 2)) * 100)
            return (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-mute">{item.label}</span>
                  <span className="font-bold text-ink">{item.yours}</span>
                </div>
                <div className="h-2 bg-card rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn("h-full rounded-full", item.color)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ActivityTab({ stats, teenId }: { stats: ProfileHubClientProps["data"]["stats"]; teenId?: string }) {
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
    streak: "text-coral",
    quest: "text-success-soft",
    social: "text-accent-soft",
    event: "text-info-soft",
    badge: "text-brand-soft",
    xp: "text-brand-soft",
    level: "text-success-soft",
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
          { id: '1', type: 'streak', text: `${stats.currentStreak} day streak active!`, time: 'Now' }
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
        <Loader2 className="w-8 h-8 animate-spin text-brand-soft" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Clock className="w-16 h-16 text-ink mb-4" />
        <h3 className="text-xl font-bold text-ink mb-2">No activity yet</h3>
        <p className="text-mute max-w-sm">
          Complete quests and engage with the app to see your activity here!
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
          <motion.div
            key={activity.id || idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-ink"
          >
            <div className="w-12 h-12 rounded-2xl bg-paper-2 flex items-center justify-center">
              <ActivityIcon className={cn("w-6 h-6", iconColor)} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-ink">{activity.text}</p>
              <p className="text-sm text-mute">{activity.time}</p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function SettingsTab() {
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
        <span className="eyebrow tracking-[0.16em] text-pink">Réglages</span>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          Mes <em className="font-semibold italic text-pink">réglages</em>
        </h1>
        <NivCoach
          mood="calm"
          message="Ajuste ton profil et ta confidentialité depuis ton espace teen."
        />
      </header>

      {/* Compte */}
      <section className="space-y-3">
        <span className="eyebrow tracking-[0.16em]">Compte</span>
        <Link href="/teen/profile/edit" className="block focus:outline-none">
          <StickerCard variant="hover" className="p-4">
            <div className="flex items-center gap-4">
              <Edit2 className="size-5 text-ink" aria-hidden="true" />
              <span className="flex-1 font-medium text-ink">Modifier mon profil</span>
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
        {loggingOut ? 'Déconnexion…' : 'Déconnexion'}
      </Button>
    </div>
  )
}
