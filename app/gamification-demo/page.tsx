/**
 * TEENS PARTY MOROCCO - Gamification Demo Page
 * =============================================
 *
 * Page de démonstration complète du système de gamification.
 * À placer dans: app/gamification-demo/page.tsx
 */

"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trophy,
  Medal,
  Target,
  ShoppingBag,
  Compass,
  Users,
  Gamepad2,
  BarChart3,
  Sparkles,
  Bell,
  Crown,
  Share2,
  Layers,
  Calendar,
  Gift,
  User,
  ChevronRight,
  Star,
  Flame,
  Zap,
  Heart,
  MessageCircle,
  TrendingUp,
  Clock,
  CheckCircle,
  Lock,
  Play,
  X,
} from "lucide-react"
import {
  mockUser,
  mockUserStats,
  mockBadges,
  mockLeaderboard,
  mockMissions,
  mockShopItems,
  mockWheelSegments,
  mockWheelStatus,
  mockChallenges,
  mockCrews,
  mockCrewMembers,
  mockMiniGames,
  mockCollections,
  mockPacks,
  mockVipStatus,
  mockVipTiers,
  mockActivities,
  mockNotifications,
  mockWrapped,
  mockReferral,
} from "./mock-data"

// ============================================================================
// MAIN DEMO PAGE
// ============================================================================

export default function GamificationDemoPage() {
  const [activeSection, setActiveSection] = useState<string>("overview")
  const [showNotifications, setShowNotifications] = useState(false)

  const sections = [
    { id: "overview", name: "Vue d'ensemble", icon: User },
    { id: "badges", name: "Badges", icon: Trophy },
    { id: "leaderboard", name: "Classement", icon: Medal },
    { id: "missions", name: "Missions", icon: Target },
    { id: "shop", name: "Boutique", icon: ShoppingBag },
    { id: "wheel", name: "Roue Fortune", icon: Compass },
    { id: "challenges", name: "Défis", icon: Zap },
    { id: "crews", name: "Crews", icon: Users },
    { id: "games", name: "Mini-Jeux", icon: Gamepad2 },
    { id: "collections", name: "Collections", icon: Layers },
    { id: "vip", name: "VIP", icon: Crown },
    { id: "feed", name: "Activités", icon: Heart },
    { id: "stats", name: "Stats", icon: BarChart3 },
    { id: "wrapped", name: "Wrapped", icon: Sparkles },
    { id: "share", name: "Partage", icon: Share2 },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Gamification Demo</h1>
                <p className="text-xs text-zinc-500">Teens Party Morocco</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* User Stats */}
              <div className="hidden md:flex items-center gap-4 px-4 py-2 rounded-xl bg-zinc-800/50">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium">{mockUserStats.totalXp.toLocaleString()} XP</span>
                </div>
                <div className="w-px h-4 bg-zinc-700" />
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500" />
                  <span className="text-sm font-medium">{mockUserStats.totalCoins.toLocaleString()}</span>
                </div>
                <div className="w-px h-4 bg-zinc-700" />
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-medium">{mockUserStats.currentStreak}</span>
                </div>
              </div>

              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* User Avatar */}
              <div className="flex items-center gap-2">
                <img
                  src={mockUser.avatar_url}
                  alt={mockUser.username}
                  className="w-10 h-10 rounded-full border-2 border-yellow-500"
                />
                <div className="hidden md:block">
                  <p className="text-sm font-medium">{mockUser.username}</p>
                  <p className="text-xs text-zinc-500">Niveau {mockUser.level}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <nav className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-1">
              {sections.map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                      isActive
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{section.name}</span>
                  </button>
                )
              })}
            </div>
          </nav>

          {/* Mobile Navigation */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 z-40">
            <div className="flex overflow-x-auto py-2 px-2 gap-1">
              {sections.slice(0, 8).map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg min-w-[60px] ${
                      isActive ? "bg-cyan-500/20 text-cyan-400" : "text-zinc-500"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px]">{section.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1 pb-24 lg:pb-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeSection === "overview" && <OverviewSection />}
                {activeSection === "badges" && <BadgesSection />}
                {activeSection === "leaderboard" && <LeaderboardSection />}
                {activeSection === "missions" && <MissionsSection />}
                {activeSection === "shop" && <ShopSection />}
                {activeSection === "wheel" && <WheelSection />}
                {activeSection === "challenges" && <ChallengesSection />}
                {activeSection === "crews" && <CrewsSection />}
                {activeSection === "games" && <GamesSection />}
                {activeSection === "collections" && <CollectionsSection />}
                {activeSection === "vip" && <VipSection />}
                {activeSection === "feed" && <FeedSection />}
                {activeSection === "stats" && <StatsSection />}
                {activeSection === "wrapped" && <WrappedSection />}
                {activeSection === "share" && <ShareSection />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <NotificationsPanel onClose={() => setShowNotifications(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// SECTION COMPONENTS
// ============================================================================

function OverviewSection() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Vue d'ensemble"
        subtitle="Bienvenue dans le système de gamification"
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Star} label="XP Total" value={mockUserStats.totalXp.toLocaleString()} color="text-yellow-400" />
        <StatCard icon={Trophy} label="Badges" value={mockUserStats.badgesEarned.toString()} color="text-purple-400" />
        <StatCard icon={Flame} label="Série" value={`${mockUserStats.currentStreak} jours`} color="text-orange-400" />
        <StatCard icon={Users} label="Amis" value={mockUserStats.friendsCount.toString()} color="text-cyan-400" />
      </div>

      {/* Level Progress */}
      <div className="p-6 rounded-2xl bg-zinc-800/50 border border-zinc-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">Niveau {mockUser.level}</h3>
            <p className="text-sm text-zinc-400">{mockUserStats.totalXp.toLocaleString()} / 15,000 XP</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-zinc-500">Prochain niveau</p>
            <p className="text-lg font-bold text-cyan-400">2,550 XP</p>
          </div>
        </div>
        <div className="h-3 rounded-full bg-zinc-700 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "83%" }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickAction icon={Compass} label="Tourner la roue" sublabel="1 spin disponible" color="from-purple-500 to-pink-500" />
        <QuickAction icon={Target} label="Missions" sublabel="2/3 complétées" color="from-cyan-500 to-blue-500" />
        <QuickAction icon={Zap} label="Défis" sublabel="3 en attente" color="from-orange-500 to-red-500" />
        <QuickAction icon={Gift} label="Réclamer" sublabel="Coins VIP" color="from-yellow-500 to-orange-500" />
      </div>

      {/* Recent Activity */}
      <div className="p-6 rounded-2xl bg-zinc-800/50 border border-zinc-700/50">
        <h3 className="text-lg font-bold mb-4">Activité récente</h3>
        <div className="space-y-3">
          {mockActivities.slice(0, 3).map((activity) => (
            <div key={activity.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50">
              <img src={activity.user.avatar_url} alt="" className="w-10 h-10 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{activity.title}</p>
                <p className="text-xs text-zinc-500">{formatTimeAgo(activity.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 text-zinc-500">
                <Heart className={`w-4 h-4 ${activity.liked_by_me ? "text-red-400 fill-red-400" : ""}`} />
                <span className="text-xs">{activity.likes_count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BadgesSection() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Badges & Achievements"
        subtitle={`${mockBadges.filter(b => b.unlocked).length}/${mockBadges.length} débloqués`}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {mockBadges.map((badge) => (
          <motion.div
            key={badge.id}
            whileHover={{ scale: 1.02 }}
            className={`p-4 rounded-2xl border transition-colors ${
              badge.unlocked
                ? "bg-zinc-800/50 border-zinc-700/50"
                : "bg-zinc-900/50 border-zinc-800/50 opacity-60"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                badge.rarity === "legendary" ? "bg-gradient-to-br from-yellow-500 to-orange-500" :
                badge.rarity === "epic" ? "bg-gradient-to-br from-purple-500 to-pink-500" :
                badge.rarity === "rare" ? "bg-gradient-to-br from-blue-500 to-cyan-500" :
                "bg-zinc-700"
              }`}>
                <img src={badge.image_url} alt="" className="w-10 h-10" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white">{badge.name}</h4>
                <p className="text-xs text-zinc-500 line-clamp-2">{badge.description}</p>
              </div>
            </div>

            {!badge.unlocked && badge.progress !== undefined && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-500">{badge.current}/{badge.target}</span>
                  <span className="text-zinc-400">{badge.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-cyan-500"
                    style={{ width: `${badge.progress}%` }}
                  />
                </div>
              </div>
            )}

            {badge.unlocked && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Débloqué
                </span>
                <span className="text-xs text-yellow-400">+{badge.xp_reward} XP</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function LeaderboardSection() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Classement" subtitle="Top joueurs cette semaine" />

      {/* Period Tabs */}
      <div className="flex gap-2">
        {["Semaine", "Mois", "Global", "Amis"].map((period, i) => (
          <button
            key={period}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              i === 0 ? "bg-cyan-500 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {period}
          </button>
        ))}
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-4 py-8">
        {[mockLeaderboard[1], mockLeaderboard[0], mockLeaderboard[2]].map((user, i) => {
          const heights = ["h-24", "h-32", "h-20"]
          const positions = [2, 1, 3]
          const colors = ["bg-zinc-400", "bg-yellow-500", "bg-orange-600"]
          return (
            <div key={user.rank} className="flex flex-col items-center">
              <img src={user.avatar_url} alt="" className="w-16 h-16 rounded-full border-4 border-zinc-800 mb-2" />
              <p className="text-sm font-medium">{user.username}</p>
              <p className="text-xs text-zinc-500">{user.xp.toLocaleString()} XP</p>
              <div className={`${heights[i]} w-20 ${colors[i]} rounded-t-lg mt-2 flex items-start justify-center pt-2`}>
                <span className="text-xl font-bold text-white">{positions[i]}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Full List */}
      <div className="space-y-2">
        {mockLeaderboard.slice(3).map((user) => (
          <div
            key={user.rank}
            className={`flex items-center gap-4 p-4 rounded-xl ${
              user.isCurrentUser ? "bg-cyan-500/20 border border-cyan-500/30" : "bg-zinc-800/50"
            }`}
          >
            <span className="w-8 text-center font-bold text-zinc-400">{user.rank}</span>
            <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full" />
            <div className="flex-1">
              <p className="font-medium">{user.username}</p>
              <p className="text-xs text-zinc-500">Niveau {user.level}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-white">{user.xp.toLocaleString()}</p>
              <p className="text-xs text-zinc-500">XP</p>
            </div>
            <TrendIndicator trend={user.trend} />
          </div>
        ))}
      </div>
    </div>
  )
}

function MissionsSection() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Missions" subtitle="Complète des missions pour gagner des récompenses" />

      {/* Daily Missions */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" /> Missions Quotidiennes
        </h3>
        <div className="space-y-3">
          {mockMissions.daily.map((mission) => (
            <MissionCard key={mission.id} mission={mission} />
          ))}
        </div>
      </div>

      {/* Weekly Missions */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-400" /> Missions Hebdomadaires
        </h3>
        <div className="space-y-3">
          {mockMissions.weekly.map((mission) => (
            <MissionCard key={mission.id} mission={mission} />
          ))}
        </div>
      </div>

      {/* Monthly Missions */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" /> Missions Mensuelles
        </h3>
        <div className="space-y-3">
          {mockMissions.monthly.map((mission) => (
            <MissionCard key={mission.id} mission={mission} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ShopSection() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Boutique"
        subtitle={`${mockUserStats.totalCoins.toLocaleString()} coins disponibles`}
      />

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {["Tout", "Cadres", "Titres", "Couleurs", "Stickers", "Consommables"].map((cat, i) => (
          <button
            key={cat}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              i === 0 ? "bg-cyan-500 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {mockShopItems.map((item) => (
          <motion.div
            key={item.id}
            whileHover={{ scale: 1.02 }}
            className={`p-4 rounded-2xl border ${
              item.owned
                ? "bg-green-500/10 border-green-500/30"
                : "bg-zinc-800/50 border-zinc-700/50"
            }`}
          >
            <div className="aspect-square rounded-xl bg-zinc-700/50 mb-3 flex items-center justify-center">
              <img src={item.image_url} alt="" className="w-16 h-16" />
            </div>
            <h4 className="font-medium text-white">{item.name}</h4>
            <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{item.description}</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-yellow-500" />
                <span className="font-bold">{item.price_coins}</span>
              </div>
              {item.owned ? (
                <span className="text-xs text-green-400">Possédé</span>
              ) : (
                <button className="px-3 py-1 rounded-lg bg-cyan-500 text-white text-sm font-medium">
                  Acheter
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function WheelSection() {
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)

  const spin = () => {
    if (spinning) return
    setSpinning(true)
    setRotation(rotation + 1800 + Math.random() * 360)
    setTimeout(() => setSpinning(false), 4000)
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Roue de la Fortune"
        subtitle={`${mockWheelStatus.spinsRemaining} spin${mockWheelStatus.spinsRemaining > 1 ? "s" : ""} disponible${mockWheelStatus.spinsRemaining > 1 ? "s" : ""}`}
      />

      {/* Wheel */}
      <div className="flex flex-col items-center py-8">
        <div className="relative">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
            <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px] border-l-transparent border-r-transparent border-t-yellow-500" />
          </div>

          {/* Wheel */}
          <motion.div
            animate={{ rotate: rotation }}
            transition={{ duration: 4, ease: "easeOut" }}
            className="w-72 h-72 rounded-full border-8 border-zinc-700 relative overflow-hidden"
            style={{
              background: `conic-gradient(${mockWheelSegments.map((s, i) =>
                `${s.color} ${i * (100/8)}% ${(i+1) * (100/8)}%`
              ).join(", ")})`
            }}
          >
            {mockWheelSegments.map((segment, i) => (
              <div
                key={segment.id}
                className="absolute w-full h-full flex items-center justify-center"
                style={{ transform: `rotate(${i * 45 + 22.5}deg)` }}
              >
                <span
                  className="text-white text-xs font-bold"
                  style={{ transform: `translateY(-100px) rotate(-${i * 45 + 22.5}deg)` }}
                >
                  {segment.label}
                </span>
              </div>
            ))}
          </motion.div>

          {/* Center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-zinc-900 border-4 border-zinc-700 flex items-center justify-center">
            <Compass className="w-6 h-6 text-yellow-500" />
          </div>
        </div>

        <button
          onClick={spin}
          disabled={spinning || mockWheelStatus.spinsRemaining === 0}
          className="mt-8 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {spinning ? "En cours..." : "TOURNER !"}
        </button>
      </div>

      {/* Today's Winnings */}
      <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
        <h4 className="font-medium mb-3">Gains du jour</h4>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            <span>{mockWheelStatus.todayWinnings.xp} XP</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500" />
            <span>{mockWheelStatus.todayWinnings.coins} Coins</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChallengesSection() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Défis" subtitle="Affronte tes amis et gagne des récompenses" />

      {/* Pending Challenges */}
      <div>
        <h3 className="text-lg font-bold mb-4">Défis en attente</h3>
        <div className="space-y-3">
          {mockChallenges.filter(c => c.status === "pending").map((challenge) => (
            <div key={challenge.id} className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <div className="flex items-center gap-4">
                <img src={challenge.opponent.avatar_url} alt="" className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <h4 className="font-medium">{challenge.title}</h4>
                  <p className="text-sm text-zinc-500">Défi de {challenge.opponent.username}</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 rounded-lg bg-green-500 text-white font-medium">
                    Accepter
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-zinc-700 text-zinc-300">
                    Refuser
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Challenges */}
      <div>
        <h3 className="text-lg font-bold mb-4">Défis actifs</h3>
        <div className="space-y-3">
          {mockChallenges.filter(c => c.status === "active").map((challenge) => (
            <div key={challenge.id} className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">{challenge.title}</h4>
                <span className="text-xs text-cyan-400">En cours</span>
              </div>
              {challenge.type === "duel" && (
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">{challenge.your_score}</p>
                    <p className="text-xs text-zinc-500">Ton score</p>
                  </div>
                  <span className="text-zinc-500">VS</span>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-400">{challenge.opponent_score}</p>
                    <p className="text-xs text-zinc-500">{challenge.opponent.username}</p>
                  </div>
                </div>
              )}
              {challenge.type === "team" && (
                <div className="space-y-2">
                  {challenge.teams.map((team) => (
                    <div key={team.name} className="flex items-center gap-3">
                      <span className={`text-sm ${team.name === challenge.your_team ? "text-cyan-400 font-medium" : "text-zinc-400"}`}>
                        {team.name}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-zinc-700 overflow-hidden">
                        <div
                          className={`h-full ${team.name === challenge.your_team ? "bg-cyan-500" : "bg-zinc-500"}`}
                          style={{ width: `${(team.score / 20000) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{team.score.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create Challenge */}
      <button className="w-full p-4 rounded-xl border-2 border-dashed border-zinc-700 text-zinc-400 hover:border-cyan-500 hover:text-cyan-400 transition-colors">
        + Créer un nouveau défi
      </button>
    </div>
  )
}

function CrewsSection() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Crews" subtitle="Rejoins ou crée un groupe d'amis" />

      {/* My Crew */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30">
        <div className="flex items-start gap-4 mb-6">
          <img src={mockCrews[0].logo_url} alt="" className="w-16 h-16 rounded-xl" />
          <div className="flex-1">
            <h3 className="text-xl font-bold">{mockCrews[0].name}</h3>
            <p className="text-sm text-zinc-400">{mockCrews[0].description}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm text-purple-400">Niveau {mockCrews[0].level}</span>
              <span className="text-sm text-zinc-500">{mockCrews[0].members_count}/{mockCrews[0].max_members} membres</span>
              <span className="text-sm text-yellow-400">Rang #{mockCrews[0].rank}</span>
            </div>
          </div>
        </div>

        {/* Members */}
        <h4 className="font-medium mb-3">Membres</h4>
        <div className="grid grid-cols-2 gap-3">
          {mockCrewMembers.map((member) => (
            <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50">
              <img src={member.avatar_url} alt="" className="w-10 h-10 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{member.username}</p>
                <p className="text-xs text-zinc-500 capitalize">{member.role}</p>
              </div>
              <span className="text-xs text-cyan-400">+{member.xp_contributed.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Other Crews */}
      <div>
        <h3 className="text-lg font-bold mb-4">Autres Crews</h3>
        <div className="space-y-3">
          {mockCrews.filter(c => !c.is_member).map((crew) => (
            <div key={crew.id} className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50">
              <img src={crew.logo_url} alt="" className="w-12 h-12 rounded-xl" />
              <div className="flex-1">
                <h4 className="font-medium">{crew.name}</h4>
                <p className="text-xs text-zinc-500">{crew.members_count}/{crew.max_members} membres • Rang #{crew.rank}</p>
              </div>
              <button className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-medium">
                Rejoindre
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function GamesSection() {
  const getGameUrl = (slug: string) => {
    switch (slug) {
      case "music_quiz":
        return "/gamification-demo/games/quiz-musical"
      case "memory":
        return "/gamification-demo/games/memory"
      case "predictions":
        return "/gamification-demo/games/predictions"
      case "trivia":
        return "/gamification-demo/games/trivia"
      default:
        return "#"
    }
  }

  const isGameAvailable = (slug: string) => {
    return ["music_quiz", "memory", "predictions", "trivia"].includes(slug)
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Mini-Jeux" subtitle="Joue et gagne de l'XP" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockMiniGames.map((game) => (
          <motion.div
            key={game.id}
            whileHover={{ scale: 1.02 }}
            className="p-6 rounded-2xl bg-zinc-800/50 border border-zinc-700/50"
          >
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${game.color}20` }}
              >
                <Gamepad2 className="w-7 h-7" style={{ color: game.color }} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold">{game.name}</h3>
                <p className="text-sm text-zinc-400">{game.description}</p>
                {isGameAvailable(game.slug) && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">
                    Disponible
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-700/50">
              <div className="flex items-center gap-4">
                {game.highScore && (
                  <div>
                    <p className="text-xs text-zinc-500">Record</p>
                    <p className="font-bold" style={{ color: game.color }}>{game.highScore}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-zinc-500">Parties</p>
                  <p className="font-bold text-white">{game.playCount}</p>
                </div>
              </div>
              {isGameAvailable(game.slug) ? (
                <a
                  href={getGameUrl(game.slug)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: game.color }}
                >
                  <Play className="w-4 h-4" />
                  Jouer
                </a>
              ) : (
                <button
                  disabled
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-zinc-500 font-medium bg-zinc-700 cursor-not-allowed"
                >
                  <Lock className="w-4 h-4" />
                  Bientôt
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function CollectionsSection() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Collections" subtitle="Collecte des cartes et stickers exclusifs" />

      {/* Collections */}
      <div className="space-y-4">
        {mockCollections.map((collection) => (
          <div
            key={collection.id}
            className={`p-6 rounded-2xl border ${
              collection.completed
                ? "bg-green-500/10 border-green-500/30"
                : "bg-zinc-800/50 border-zinc-700/50"
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  {collection.name}
                  {collection.completed && <CheckCircle className="w-5 h-5 text-green-400" />}
                </h3>
                <p className="text-sm text-zinc-400">{collection.description}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{collection.owned_items}/{collection.total_items}</p>
                <p className="text-xs text-zinc-500">{collection.completion}% complété</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full bg-zinc-700 overflow-hidden mb-4">
              <div
                className={`h-full rounded-full ${collection.completed ? "bg-green-500" : "bg-cyan-500"}`}
                style={{ width: `${collection.completion}%` }}
              />
            </div>

            {/* Items preview */}
            {collection.items && (
              <div className="flex gap-2 flex-wrap">
                {collection.items.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className={`px-3 py-1 rounded-full text-xs ${
                      item.owned
                        ? item.rarity === "legendary" ? "bg-yellow-500/20 text-yellow-400" :
                          item.rarity === "epic" ? "bg-purple-500/20 text-purple-400" :
                          "bg-cyan-500/20 text-cyan-400"
                        : "bg-zinc-700 text-zinc-500"
                    }`}
                  >
                    {item.name}
                    {item.duplicate_count > 0 && ` (x${item.duplicate_count + 1})`}
                  </div>
                ))}
              </div>
            )}

            {/* Rewards */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-700/50">
              <span className="text-sm text-zinc-500">Récompense:</span>
              <span className="text-sm text-yellow-400">+{collection.reward_xp} XP</span>
              <span className="text-sm text-orange-400">+{collection.reward_coins} Coins</span>
            </div>
          </div>
        ))}
      </div>

      {/* Packs */}
      <div>
        <h3 className="text-lg font-bold mb-4">Ouvrir des packs</h3>
        <div className="grid grid-cols-3 gap-4">
          {mockPacks.map((pack) => (
            <div key={pack.id} className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-center">
              <div className="w-16 h-20 mx-auto mb-3 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                <Layers className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-medium">{pack.name}</h4>
              <p className="text-xs text-zinc-500 mb-3">{pack.cards_count} cartes</p>
              <button className="w-full py-2 rounded-lg bg-cyan-500 text-white text-sm font-medium">
                {pack.price} Coins
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function VipSection() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Statut VIP" subtitle="Tes avantages exclusifs" />

      {/* Current Status */}
      <div
        className="p-6 rounded-2xl border"
        style={{
          background: `linear-gradient(135deg, ${mockVipStatus.current_tier.color}20, transparent)`,
          borderColor: `${mockVipStatus.current_tier.color}50`
        }}
      >
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: `${mockVipStatus.current_tier.color}30` }}
          >
            <Crown className="w-8 h-8" style={{ color: mockVipStatus.current_tier.color }} />
          </div>
          <div>
            <h3 className="text-2xl font-bold" style={{ color: mockVipStatus.current_tier.color }}>
              {mockVipStatus.current_tier.name}
            </h3>
            <p className="text-sm text-zinc-400">{mockVipStatus.lifetime_xp.toLocaleString()} XP total</p>
          </div>
        </div>

        {/* Progress to next */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-400">Progression vers {mockVipStatus.next_tier.name}</span>
            <span style={{ color: mockVipStatus.current_tier.color }}>{mockVipStatus.progress_to_next.toFixed(1)}%</span>
          </div>
          <div className="h-3 rounded-full bg-zinc-700 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${mockVipStatus.progress_to_next}%`,
                backgroundColor: mockVipStatus.current_tier.color
              }}
            />
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            {mockVipStatus.xp_to_next.toLocaleString()} XP restants
          </p>
        </div>

        {/* Perks */}
        <div className="grid grid-cols-2 gap-3">
          {mockVipStatus.perks.map((perk, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-zinc-300">{perk.name}</span>
            </div>
          ))}
        </div>

        {/* Claim Monthly Coins */}
        {!mockVipStatus.monthly_coins_claimed && (
          <button className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold">
            Réclamer {mockVipStatus.current_tier.free_monthly_coins} Coins Mensuels
          </button>
        )}
      </div>

      {/* All Tiers */}
      <div>
        <h3 className="text-lg font-bold mb-4">Tous les niveaux VIP</h3>
        <div className="space-y-2">
          {mockVipTiers.map((tier) => {
            const isCurrentOrPast = mockVipStatus.lifetime_xp >= tier.xp_required
            const isCurrent = tier.slug === mockVipStatus.current_tier.slug
            return (
              <div
                key={tier.slug}
                className={`flex items-center gap-4 p-4 rounded-xl ${
                  isCurrent
                    ? "bg-zinc-800 border-2"
                    : isCurrentOrPast
                    ? "bg-zinc-800/50"
                    : "bg-zinc-900/50 opacity-50"
                }`}
                style={isCurrent ? { borderColor: tier.color } : {}}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${tier.color}30` }}
                >
                  <Crown className="w-5 h-5" style={{ color: tier.color }} />
                </div>
                <div className="flex-1">
                  <p className="font-medium" style={{ color: isCurrentOrPast ? tier.color : undefined }}>
                    {tier.name}
                  </p>
                  <p className="text-xs text-zinc-500">{tier.xp_required.toLocaleString()} XP requis</p>
                </div>
                {isCurrentOrPast && <CheckCircle className="w-5 h-5 text-green-400" />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FeedSection() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Fil d'activité" subtitle="Ce que font tes amis" />

      {/* Feed Tabs */}
      <div className="flex gap-2">
        {["Amis", "Public", "Mon activité"].map((tab, i) => (
          <button
            key={tab}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              i === 0 ? "bg-cyan-500 text-white" : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Activities */}
      <div className="space-y-4">
        {mockActivities.map((activity) => (
          <div key={activity.id} className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <div className="flex items-start gap-3">
              <img src={activity.user.avatar_url} alt="" className="w-10 h-10 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-white">{activity.title}</p>
                <p className="text-xs text-zinc-500 mt-1">{formatTimeAgo(activity.created_at)}</p>
              </div>
            </div>

            {activity.image_url && (
              <img src={activity.image_url} alt="" className="w-full h-48 object-cover rounded-xl mt-3" />
            )}

            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-700/50">
              <button className={`flex items-center gap-1 text-sm ${activity.liked_by_me ? "text-red-400" : "text-zinc-400"}`}>
                <Heart className={`w-4 h-4 ${activity.liked_by_me ? "fill-red-400" : ""}`} />
                {activity.likes_count}
              </button>
              <button className="flex items-center gap-1 text-sm text-zinc-400">
                <MessageCircle className="w-4 h-4" />
                {activity.comments_count}
              </button>
              <button className="flex items-center gap-1 text-sm text-zinc-400 ml-auto">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatsSection() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Statistiques" subtitle="Ton parcours en chiffres" />

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Événements" value={mockUserStats.eventsAttended.toString()} color="text-purple-400" />
        <StatCard icon={Zap} label="Défis" value={mockUserStats.challengesCompleted.toString()} color="text-orange-400" />
        <StatCard icon={Gamepad2} label="Parties" value={mockUserStats.gamesPlayed.toString()} color="text-cyan-400" />
        <StatCard icon={Users} label="Crews" value={mockUserStats.crewsJoined.toString()} color="text-green-400" />
      </div>

      {/* Streaks */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Flame className="w-8 h-8 text-orange-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-orange-400">{mockUserStats.currentStreak} jours</h3>
            <p className="text-zinc-400">Série actuelle</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-lg font-bold text-white">{mockUserStats.longestStreak} jours</p>
            <p className="text-xs text-zinc-500">Record</p>
          </div>
        </div>
      </div>

      {/* Progress Chart Placeholder */}
      <div className="p-6 rounded-2xl bg-zinc-800/50 border border-zinc-700/50">
        <h3 className="text-lg font-bold mb-4">Progression XP</h3>
        <div className="h-48 flex items-end gap-2">
          {[40, 65, 45, 80, 55, 90, 75, 95, 60, 85, 70, 100].map((height, i) => (
            <div key={i} className="flex-1 bg-cyan-500/50 rounded-t" style={{ height: `${height}%` }} />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-zinc-500">
          <span>Jan</span>
          <span>Fév</span>
          <span>Mar</span>
          <span>Avr</span>
          <span>Mai</span>
          <span>Juin</span>
          <span>Juil</span>
          <span>Août</span>
          <span>Sep</span>
          <span>Oct</span>
          <span>Nov</span>
          <span>Déc</span>
        </div>
      </div>
    </div>
  )
}

function WrappedSection() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Wrapped 2024" subtitle="Ton année en review" />

      {/* Hero Card */}
      <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-center">
        <h2 className="text-3xl font-bold mb-2">Ta meilleure année !</h2>
        <p className="text-white/80 mb-6">Tu fais partie du top {mockWrapped.stats.top_percentile}% des utilisateurs</p>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/20 backdrop-blur">
            <p className="text-3xl font-bold">{mockWrapped.stats.total_events}</p>
            <p className="text-sm text-white/80">Événements</p>
          </div>
          <div className="p-4 rounded-xl bg-white/20 backdrop-blur">
            <p className="text-3xl font-bold">{(mockWrapped.stats.total_xp / 1000).toFixed(1)}K</p>
            <p className="text-sm text-white/80">XP gagnés</p>
          </div>
          <div className="p-4 rounded-xl bg-white/20 backdrop-blur">
            <p className="text-3xl font-bold">{mockWrapped.stats.badges_earned}</p>
            <p className="text-sm text-white/80">Badges</p>
          </div>
        </div>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <p className="text-xs text-zinc-500 mb-1">Événement préféré</p>
          <p className="font-bold text-white">{mockWrapped.highlights.favorite_event}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <p className="text-xs text-zinc-500 mb-1">Jeu le plus joué</p>
          <p className="font-bold text-white">{mockWrapped.highlights.most_played_game}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <p className="text-xs text-zinc-500 mb-1">Meilleur ami</p>
          <p className="font-bold text-white">{mockWrapped.highlights.best_friend}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <p className="text-xs text-zinc-500 mb-1">Badge le plus rare</p>
          <p className="font-bold text-white">{mockWrapped.highlights.rarest_badge}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-6 rounded-2xl bg-zinc-800/50 border border-zinc-700/50">
        <h3 className="text-lg font-bold mb-4">Moments forts</h3>
        <div className="space-y-4">
          {mockWrapped.milestones.map((milestone, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-16 text-sm text-zinc-500">{milestone.month}</div>
              <div className="w-3 h-3 rounded-full bg-cyan-500" />
              <div className="flex-1 h-px bg-zinc-700" />
              <div className="text-sm text-white">{milestone.event}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Share */}
      <button className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold flex items-center justify-center gap-2">
        <Share2 className="w-5 h-5" />
        Partager mon Wrapped
      </button>
    </div>
  )
}

function ShareSection() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Partage & Parrainage" subtitle="Invite tes amis et gagne des récompenses" />

      {/* Referral Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <Gift className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Ton code de parrainage</h3>
            <p className="text-sm text-zinc-400">Partage-le et gagne 100 XP + 50 Coins par ami</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/50 mb-4">
          <p className="text-3xl font-bold text-center tracking-widest text-cyan-400">
            {mockReferral.code}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{mockReferral.total_uses}</p>
            <p className="text-xs text-zinc-500">Utilisations</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{mockReferral.successful_conversions}</p>
            <p className="text-xs text-zinc-500">Conversions</p>
          </div>
        </div>

        <button className="w-full py-3 rounded-xl bg-cyan-500 text-white font-bold">
          Copier le code
        </button>
      </div>

      {/* Share Platforms */}
      <div>
        <h3 className="text-lg font-bold mb-4">Partager sur</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { name: "Instagram", color: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400" },
            { name: "WhatsApp", color: "bg-green-500" },
            { name: "Snapchat", color: "bg-yellow-400" },
            { name: "TikTok", color: "bg-black" },
          ].map((platform) => (
            <button
              key={platform.name}
              className={`aspect-square rounded-xl ${platform.color} flex items-center justify-center`}
            >
              <Share2 className="w-6 h-6 text-white" />
            </button>
          ))}
        </div>
      </div>

      {/* Referred Users */}
      <div>
        <h3 className="text-lg font-bold mb-4">Tes filleuls</h3>
        <div className="space-y-2">
          {mockReferral.referred_users.map((user, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50">
              <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                <span className="text-sm font-bold text-zinc-400">{user.username[0]}</span>
              </div>
              <div className="flex-1">
                <p className="font-medium">{user.username}</p>
                <p className="text-xs text-zinc-500">{formatTimeAgo(user.joined_at)}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${
                user.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
              }`}>
                {user.status === "completed" ? "Complété" : "En attente"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="text-zinc-400">{subtitle}</p>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
      <Icon className={`w-5 h-5 ${color} mb-2`} />
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  )
}

function QuickAction({ icon: Icon, label, sublabel, color }: { icon: any; label: string; sublabel: string; color: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`p-4 rounded-xl bg-gradient-to-br ${color} text-white text-left`}
    >
      <Icon className="w-6 h-6 mb-2" />
      <p className="font-medium">{label}</p>
      <p className="text-xs text-white/70">{sublabel}</p>
    </motion.button>
  )
}

function MissionCard({ mission }: { mission: any }) {
  return (
    <div className={`p-4 rounded-xl border ${
      mission.completed
        ? "bg-green-500/10 border-green-500/30"
        : "bg-zinc-800/50 border-zinc-700/50"
    }`}>
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          mission.completed ? "bg-green-500/20" : "bg-zinc-700"
        }`}>
          {mission.completed ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <Target className="w-5 h-5 text-zinc-400" />
          )}
        </div>
        <div className="flex-1">
          <h4 className="font-medium">{mission.title}</h4>
          <p className="text-xs text-zinc-500">{mission.description}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-yellow-400">+{mission.xp_reward} XP</p>
          <p className="text-xs text-zinc-500">+{mission.coins_reward} Coins</p>
        </div>
      </div>

      {!mission.completed && mission.progress !== undefined && mission.progress < 100 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-zinc-500">{mission.current}/{mission.target}</span>
            <span className="text-zinc-400">{mission.progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-700 overflow-hidden">
            <div className="h-full rounded-full bg-cyan-500" style={{ width: `${mission.progress}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

function TrendIndicator({ trend }: { trend: string }) {
  if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-400" />
  if (trend === "down") return <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />
  return <div className="w-4 h-4" />
}

function NotificationsPanel({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-zinc-900 border-l border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-lg font-bold">Notifications</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto h-full pb-20">
          {mockNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-xl ${notif.read ? "bg-zinc-800/50" : "bg-zinc-800 border border-zinc-700"}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${notif.color}20` }}>
                  <Bell className="w-5 h-5" style={{ color: notif.color }} />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{notif.title}</p>
                  <p className="text-sm text-zinc-400">{notif.message}</p>
                  <p className="text-xs text-zinc-500 mt-1">{formatTimeAgo(notif.created_at)}</p>
                </div>
                {notif.has_reward && !notif.reward_claimed && (
                  <button className="px-3 py-1 rounded-lg bg-yellow-500 text-black text-xs font-medium">
                    Réclamer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

function formatTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "À l'instant"
  if (diffMins < 60) return `Il y a ${diffMins}min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays}j`

  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}
