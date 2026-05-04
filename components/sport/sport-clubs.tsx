"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users,
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  Flame,
  Trophy,
  Zap,
  ChevronRight,
  Plus,
  Minus,
  Star,
  Activity,
  TrendingUp,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface Club {
  id: string
  name: string
  description?: string
  sport_type: string
  location?: string
  schedule?: string
  logo_url?: string
  is_active: boolean
  is_member?: boolean
}

interface ClubMembership {
  membership: {
    id: string
    status: string
    joined_at: string
  }
  club: Club
  stats: {
    attendance_this_month: number
    total_attendance: number
    current_streak: number
    last_attendance: string | null
    recent_attendance: Array<{
      id: string
      attendance_date: string
      check_in_time?: string
    }>
  }
}

interface OverallStats {
  total_clubs: number
  total_attendance_this_month: number
  total_attendance_all_time: number
  best_streak: number
}

/* ==========================================================================
   STREAK BADGE
   ========================================================================== */

interface StreakBadgeProps {
  streak: number
}

function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak === 0) return null

  const streakConfig = streak >= 10
    ? { bg: "bg-gradient-to-r from-yellow-500 to-orange-500", text: "text-white" }
    : streak >= 5
    ? { bg: "bg-orange-500/20", text: "text-orange-400" }
    : { bg: "bg-cyan-500/20", text: "text-cyan-400" }

  return (
    <span className={cn(
      "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold",
      streakConfig.bg, streakConfig.text
    )}>
      <Flame className="w-3 h-3" />
      {streak} jours
    </span>
  )
}

/* ==========================================================================
   ATTENDANCE CALENDAR
   ========================================================================== */

interface AttendanceCalendarProps {
  attendance: Array<{ attendance_date: string }>
}

function AttendanceCalendar({ attendance }: AttendanceCalendarProps) {
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay()

  const attendanceDates = attendance.map((a) =>
    new Date(a.attendance_date).getDate()
  )

  const days = []
  // Add empty cells for days before the first day of month
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="w-6 h-6" />)
  }

  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const isAttended = attendanceDates.includes(day)
    const isToday = day === today.getDate()
    const isPast = day < today.getDate()

    days.push(
      <div
        key={day}
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all",
          isAttended
            ? "bg-green-500 text-white"
            : isToday
            ? "bg-cyan-500/20 text-cyan-400 ring-2 ring-cyan-500"
            : isPast
            ? "bg-zinc-800 text-zinc-600"
            : "bg-zinc-800/50 text-zinc-500"
        )}
      >
        {isAttended ? <CheckCircle2 className="w-3 h-3" /> : day}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-7 gap-1">
      {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => (
        <div key={i} className="w-6 h-6 text-center text-xs text-zinc-600 font-medium">
          {d}
        </div>
      ))}
      {days}
    </div>
  )
}

/* ==========================================================================
   CLUB CARD
   ========================================================================== */

interface ClubCardProps {
  clubData: ClubMembership
  onCheckIn: () => void
  onLeave: () => void
  isExpanded: boolean
  onToggle: () => void
}

function ClubCard({
  clubData,
  onCheckIn,
  onLeave,
  isExpanded,
  onToggle,
}: ClubCardProps) {
  const { club, stats, membership } = clubData
  const [isCheckinToday, setIsCheckinToday] = useState(false)

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]
    setIsCheckinToday(stats.last_attendance === today)
  }, [stats.last_attendance])

  const sportIcons: Record<string, string> = {
    football: "football",
    basketball: "basketball",
    tennis: "tennis",
    natation: "swim",
    gym: "dumbbell",
    yoga: "yoga",
    arts_martiaux: "martial",
    default: "activity",
  }

  return (
    <motion.div layout>
      <Card className="overflow-hidden bg-zinc-900 border-zinc-800">
        {/* Header */}
        <div
          className="p-4 cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex items-center gap-4">
            {/* Club logo/icon */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center overflow-hidden">
              {club.logo_url ? (
                <img
                  src={club.logo_url}
                  alt={club.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Activity className="w-8 h-8 text-cyan-400" />
              )}
            </div>

            {/* Club info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 capitalize">
                  {club.sport_type}
                </span>
                <StreakBadge streak={stats.current_streak} />
              </div>

              <h3 className="font-bold text-white line-clamp-1">{club.name}</h3>

              {club.location && (
                <p className="text-sm text-zinc-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {club.location}
                </p>
              )}
            </div>

            {/* Stats summary */}
            <div className="text-right hidden sm:block">
              <p className="text-2xl font-bold text-white">{stats.attendance_this_month}</p>
              <p className="text-xs text-zinc-500">ce mois</p>
            </div>

            <ChevronRight className={cn(
              "w-5 h-5 text-zinc-600 transition-transform",
              isExpanded && "rotate-90"
            )} />
          </div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-zinc-800 pt-4">
                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
                    <p className="text-xs text-zinc-500 mb-1">Ce mois</p>
                    <p className="text-xl font-bold text-white">
                      {stats.attendance_this_month}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
                    <p className="text-xs text-zinc-500 mb-1">Total</p>
                    <p className="text-xl font-bold text-white">
                      {stats.total_attendance}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
                    <p className="text-xs text-zinc-500 mb-1">Streak</p>
                    <p className="text-xl font-bold text-orange-400 flex items-center justify-center gap-1">
                      <Flame className="w-4 h-4" />
                      {stats.current_streak}
                    </p>
                  </div>
                </div>

                {/* Calendar */}
                <div className="mb-6">
                  <p className="text-sm text-zinc-400 mb-3">Presence ce mois</p>
                  <AttendanceCalendar attendance={stats.recent_attendance} />
                </div>

                {/* Schedule */}
                {club.schedule && (
                  <div className="mb-6 p-3 bg-zinc-800/50 rounded-xl">
                    <p className="text-xs text-zinc-500 mb-1">Horaires</p>
                    <p className="text-sm text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      {club.schedule}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      onCheckIn()
                    }}
                    disabled={isCheckinToday}
                    className={cn(
                      "flex-1",
                      isCheckinToday
                        ? "bg-green-500/20 text-green-400"
                        : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    )}
                  >
                    {isCheckinToday ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Present aujourd'hui
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Pointer ma presence
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      onLeave()
                    }}
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

/* ==========================================================================
   AVAILABLE CLUB CARD
   ========================================================================== */

interface AvailableClubCardProps {
  club: Club & { is_member: boolean }
  onJoin: () => void
}

function AvailableClubCard({ club, onJoin }: AvailableClubCardProps) {
  return (
    <Card className="p-4 bg-zinc-900 border-zinc-800">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
          {club.logo_url ? (
            <img
              src={club.logo_url}
              alt={club.name}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <Activity className="w-6 h-6 text-cyan-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-white line-clamp-1">{club.name}</h4>
          <p className="text-sm text-zinc-500 capitalize">{club.sport_type}</p>
        </div>

        {club.is_member ? (
          <span className="text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full">
            Membre
          </span>
        ) : (
          <Button
            onClick={onJoin}
            size="sm"
            className="bg-gradient-to-r from-cyan-500 to-blue-500"
          >
            <Plus className="w-4 h-4 mr-1" />
            Rejoindre
          </Button>
        )}
      </div>
    </Card>
  )
}

/* ==========================================================================
   JOIN CLUB MODAL
   ========================================================================== */

interface JoinClubModalProps {
  isOpen: boolean
  onClose: () => void
  clubs: Array<Club & { is_member: boolean }>
  onJoin: (clubId: string) => void
}

function JoinClubModal({ isOpen, onClose, clubs, onJoin }: JoinClubModalProps) {
  const [filterSport, setFilterSport] = useState("")

  const sportTypes = [...new Set(clubs.map((c) => c.sport_type))]
  const filteredClubs = filterSport
    ? clubs.filter((c) => c.sport_type === filterSport)
    : clubs

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-zinc-900 rounded-2xl p-6 max-w-lg w-full border border-zinc-800 max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Rejoindre un club</h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sport filter */}
        <div className="flex gap-2 flex-wrap mb-4">
          <button
            onClick={() => setFilterSport("")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              !filterSport
                ? "bg-cyan-500 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            )}
          >
            Tous
          </button>
          {sportTypes.map((sport) => (
            <button
              key={sport}
              onClick={() => setFilterSport(sport)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all",
                filterSport === sport
                  ? "bg-cyan-500 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              )}
            >
              {sport}
            </button>
          ))}
        </div>

        {/* Clubs list */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {filteredClubs.map((club) => (
            <AvailableClubCard
              key={club.id}
              club={club}
              onJoin={() => {
                onJoin(club.id)
                onClose()
              }}
            />
          ))}

          {filteredClubs.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">Aucun club disponible</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

/* ==========================================================================
   SPORT CLUBS DASHBOARD
   ========================================================================== */

interface SportClubsDashboardProps {
  teenId: string
}

export function SportClubsDashboard({ teenId }: SportClubsDashboardProps) {
  const [clubs, setClubs] = useState<ClubMembership[]>([])
  const [allClubs, setAllClubs] = useState<Array<Club & { is_member: boolean }>>([])
  const [stats, setStats] = useState<OverallStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showJoinModal, setShowJoinModal] = useState(false)

  const fetchClubs = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/teen/sport/clubs?teenId=${teenId}&includeAll=true`
      )
      const data = await response.json()

      if (data.success) {
        setClubs(data.clubs)
        setAllClubs(data.allClubs || [])
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching clubs:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClubs()
  }, [teenId])

  const handleJoin = async (clubId: string) => {
    try {
      const response = await fetch("/api/teen/sport/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teenId,
          clubId,
          action: "join",
        }),
      })

      if (response.ok) {
        fetchClubs()
      }
    } catch (error) {
      console.error("Error joining club:", error)
    }
  }

  const handleLeave = async (clubId: string) => {
    try {
      const response = await fetch("/api/teen/sport/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teenId,
          clubId,
          action: "leave",
        }),
      })

      if (response.ok) {
        fetchClubs()
      }
    } catch (error) {
      console.error("Error leaving club:", error)
    }
  }

  const handleCheckIn = async (clubId: string) => {
    try {
      const response = await fetch("/api/teen/sport/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teenId,
          clubId,
          action: "checkin",
        }),
      })

      if (response.ok) {
        fetchClubs()
      }
    } catch (error) {
      console.error("Error checking in:", error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-zinc-800 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats header */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 bg-zinc-900 border-zinc-800 text-center">
            <Users className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats.total_clubs}</p>
            <p className="text-xs text-zinc-500">Clubs</p>
          </Card>
          <Card className="p-4 bg-zinc-900 border-zinc-800 text-center">
            <Calendar className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats.total_attendance_this_month}</p>
            <p className="text-xs text-zinc-500">Ce mois</p>
          </Card>
          <Card className="p-4 bg-zinc-900 border-zinc-800 text-center">
            <CheckCircle2 className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats.total_attendance_all_time}</p>
            <p className="text-xs text-zinc-500">Total</p>
          </Card>
          <Card className="p-4 bg-zinc-900 border-zinc-800 text-center">
            <Flame className="w-6 h-6 text-orange-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats.best_streak}</p>
            <p className="text-xs text-zinc-500">Meilleur streak</p>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Mes clubs</h2>
        <Button
          onClick={() => setShowJoinModal(true)}
          className="bg-gradient-to-r from-cyan-500 to-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Rejoindre un club
        </Button>
      </div>

      {/* Clubs list */}
      <div className="space-y-4">
        {clubs.map((clubData) => (
          <ClubCard
            key={clubData.club.id}
            clubData={clubData}
            onCheckIn={() => handleCheckIn(clubData.club.id)}
            onLeave={() => handleLeave(clubData.club.id)}
            isExpanded={expandedId === clubData.club.id}
            onToggle={() =>
              setExpandedId(expandedId === clubData.club.id ? null : clubData.club.id)
            }
          />
        ))}
      </div>

      {/* Empty state */}
      {clubs.length === 0 && (
        <Card className="p-8 bg-zinc-900 border-zinc-800 text-center">
          <Users className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Aucun club</h3>
          <p className="text-zinc-400 mb-4">
            Rejoins un club de sport pour commencer a tracker ton assiduite !
          </p>
          <Button
            onClick={() => setShowJoinModal(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Trouver un club
          </Button>
        </Card>
      )}

      {/* Join modal */}
      <JoinClubModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        clubs={allClubs}
        onJoin={handleJoin}
      />
    </div>
  )
}

/* ==========================================================================
   CLUBS WIDGET
   ========================================================================== */

interface ClubsWidgetProps {
  teenId: string
  onSeeAll?: () => void
}

export function ClubsWidget({ teenId, onSeeAll }: ClubsWidgetProps) {
  const [clubs, setClubs] = useState<ClubMembership[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const response = await fetch(`/api/teen/sport/clubs?teenId=${teenId}`)
        const data = await response.json()
        if (data.success) {
          setClubs(data.clubs.slice(0, 2))
        }
      } catch (error) {
        console.error("Error fetching clubs:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchClubs()
  }, [teenId])

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 bg-zinc-800 rounded-xl" />
        ))}
      </div>
    )
  }

  if (clubs.length === 0) {
    return null
  }

  return (
    <Card className="p-4 bg-zinc-900 border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" />
          Mes clubs
        </h3>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-sm text-cyan-400 hover:underline"
          >
            Voir tout
          </button>
        )}
      </div>

      <div className="space-y-3">
        {clubs.map((clubData) => {
          const today = new Date().toISOString().split("T")[0]
          const checkedInToday = clubData.stats.last_attendance === today

          return (
            <div
              key={clubData.club.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">
                  {clubData.club.name}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">
                    {clubData.stats.attendance_this_month} presences
                  </span>
                  {clubData.stats.current_streak > 0 && (
                    <span className="flex items-center gap-1 text-xs text-orange-400">
                      <Flame className="w-3 h-3" />
                      {clubData.stats.current_streak}
                    </span>
                  )}
                </div>
              </div>
              {checkedInToday ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
