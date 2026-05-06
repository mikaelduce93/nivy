"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { 
  User, Trophy, Flame, Coins, Star, Calendar, Settings, Camera, Edit2, 
  Shield, Award, Target, Users, ChartBar, Clock, Bell, Lock, Eye, LogOut,
  Zap, TrendingUp, Check, Loader2
} from "lucide-react"
import { HubTabs, type HubTab } from "@/components/teen/hub-tabs"
import { Button } from "@/components/ui/button"
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
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-gen-z-lavender to-gen-z-sky flex items-center justify-center text-4xl font-black text-black overflow-hidden">
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
              className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            >
              <Camera className="w-5 h-5" aria-hidden="true" />
            </button>
          </motion.div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-black tracking-tight">{userInfo.fullName}</h1>
            {profile?.username && (
              <p className="text-gen-z-lavender font-medium">@{profile.username}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xl">{titleIcon}</span>
              <span className="text-zinc-400">{title}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400">Level {stats.level}</span>
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
            { label: "Level", value: stats.level, icon: Star, color: "text-gen-z-mint" },
            { label: "Coins", value: stats.coins.toLocaleString(), icon: Coins, color: "text-yellow-500" },
            { label: "Rank", value: stats.rank ? `#${stats.rank}` : "-", icon: Trophy, color: "text-gen-z-lavender" },
            { label: "Friends", value: stats.friendsCount, icon: Users, color: "text-gen-z-coral" },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              whileHover={{ scale: 1.02 }}
              className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 text-center"
            >
              <stat.icon className={cn("w-5 h-5 mx-auto mb-2", stat.color)} />
              <p className="text-xl font-black text-white">{stat.value}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{stat.label}</p>
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
      <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Bio</h3>
        <p className="text-zinc-300">
          {profile?.bio || "No bio yet. Tap Edit to add one!"}
        </p>
      </div>

      {/* Achievements Preview */}
      <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Achievements</h3>
          <Link href="/teen/wallet?tab=badges" className="text-sm text-gen-z-lavender font-bold hover:underline">
            See all
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-500">Progress</span>
              <span className="font-bold text-gen-z-lavender">{stats.badges}/{stats.totalBadges}</span>
            </div>
            <Progress value={(stats.badges / stats.totalBadges) * 100} className="h-3" />
          </div>
          <div className="text-center px-4">
            <p className="text-3xl font-black text-gen-z-lavender">
              {Math.round((stats.badges / stats.totalBadges) * 100)}%
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="p-4 rounded-2xl bg-gen-z-sky/10 border border-gen-z-sky/20">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-gen-z-sky" />
          <div>
            <p className="text-sm font-bold text-gen-z-sky">Privacy</p>
            <p className="text-xs text-zinc-400">Your profile is only visible to friends</p>
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
      <div className="p-6 rounded-3xl bg-gradient-to-br from-gen-z-lavender/10 to-gen-z-sky/5 border border-gen-z-lavender/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-zinc-400 uppercase tracking-wider">Total XP</p>
            <p className="text-5xl font-black text-gen-z-lavender">{stats.totalXp.toLocaleString()}</p>
          </div>
          <div className="w-20 h-20 rounded-3xl bg-gen-z-lavender/20 flex items-center justify-center">
            <Zap className="w-10 h-10 text-gen-z-lavender" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Best Streak", value: stats.bestStreak, icon: Flame, color: "text-orange-500", suffix: " days" },
          { label: "Badges", value: stats.badges, icon: Award, color: "text-gen-z-lavender", suffix: "" },
          { label: "Events", value: stats.eventsAttended, icon: Calendar, color: "text-gen-z-mint", suffix: "" },
          { label: "Missions", value: stats.missionsCompleted, icon: Target, color: "text-gen-z-coral", suffix: "" },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 text-center"
          >
            <stat.icon className={cn("w-8 h-8 mx-auto mb-3", stat.color)} />
            <p className="text-3xl font-black text-white">{stat.value}{stat.suffix}</p>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Comparison */}
      <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Vs. Average</h3>
        <div className="space-y-4">
          {[
            { label: "XP", yours: stats.totalXp, avg: 1500, color: "bg-gen-z-lavender" },
            { label: "Badges", yours: stats.badges, avg: 5, color: "bg-gen-z-coral" },
            { label: "Events", yours: stats.eventsAttended, avg: 3, color: "bg-gen-z-mint" },
          ].map((item) => {
            const pct = Math.min(100, (item.yours / (item.avg * 2)) * 100)
            return (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-400">{item.label}</span>
                  <span className="font-bold text-white">{item.yours}</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
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
    streak: "text-orange-500",
    quest: "text-gen-z-mint",
    social: "text-gen-z-coral",
    event: "text-gen-z-sky",
    badge: "text-gen-z-lavender",
    xp: "text-gen-z-lavender",
    level: "text-gen-z-mint",
    general: "text-zinc-400",
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
        <Loader2 className="w-8 h-8 animate-spin text-gen-z-lavender" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Clock className="w-16 h-16 text-zinc-700 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No activity yet</h3>
        <p className="text-zinc-500 max-w-sm">
          Complete quests and engage with the app to see your activity here!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, idx) => {
        const ActivityIcon = iconMap[activity.type] || Clock
        const iconColor = colorMap[activity.type] || "text-zinc-400"

        return (
          <motion.div
            key={activity.id || idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
              <ActivityIcon className={cn("w-6 h-6", iconColor)} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">{activity.text}</p>
              <p className="text-sm text-zinc-500">{activity.time}</p>
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

  const sections = [
    {
      title: "Account",
      items: [
        { label: "Edit Profile", icon: Edit2, href: "/teen/profile/edit" },
        { label: "Privacy", icon: Lock, href: "/teen/settings/privacy" },
        { label: "Notifications", icon: Bell, href: "/teen/settings/notifications" },
      ]
    },
    {
      title: "Preferences",
      items: [
        { label: "Visibility", icon: Eye, href: "/teen/settings/visibility" },
        { label: "Language", icon: Settings, href: "/teen/settings/language" },
      ]
    },
  ]

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">{section.title}</h3>
          <div className="space-y-2">
            {section.items.map((item) => (
              <motion.div key={item.label} whileHover={{ x: 4 }}>
                <Link href={item.href} className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors">
                  <item.icon className="w-5 h-5 text-zinc-400" />
                  <span className="flex-1 text-white">{item.label}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {/* Logout */}
      <Button 
        variant="outline" 
        className="w-full rounded-2xl border-red-500/30 text-red-500 hover:bg-red-500/10"
        onClick={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? (
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
            <LogOut className="w-4 h-4 mr-2" />
          </motion.div>
        ) : (
          <LogOut className="w-4 h-4 mr-2" />
        )}
        {loggingOut ? 'Logging out...' : 'Log Out'}
      </Button>
    </div>
  )
}
