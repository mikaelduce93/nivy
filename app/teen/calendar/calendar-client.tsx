"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Zap,
  Bell,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/states/empty-state"

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

const TYPE_CONFIG: Record<string, { color: string; icon: string }> = {
  event:     { color: "from-accent-soft to-pink-500",       icon: "🎉" },
  challenge: { color: "from-brand-soft to-purple-500",  icon: "🧠" },
  battle:    { color: "from-orange-500 to-red-500",         icon: "⚔️" },
  workshop:  { color: "from-success-soft to-emerald-500",     icon: "💻" },
  sport:     { color: "from-blue-500 to-cyan-500",          icon: "🏃" },
}

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG["event"]
}

export interface CalendarEvent {
  id: string
  title: string
  date: string       // "YYYY-MM-DD"
  time: string | null
  location: string | null
  type: string
  xpReward: number
  registered: boolean
  rsvpLabel: string
  attendees: number | null
}

interface CalendarClientProps {
  upcomingEvents: CalendarEvent[]
}

export function CalendarClient({ upcomingEvents }: CalendarClientProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(
    today.toISOString().split("T")[0]
  )

  const todayStr = today.toISOString().split("T")[0]

  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < adjustedFirstDay; i++) calendarDays.push(null)
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i)

  const formatDate = (day: number) =>
    `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`

  const getEventsForDate = (day: number) => {
    const dateStr = formatDate(day)
    return upcomingEvents.filter((e) => e.date === dateStr)
  }

  const selectedEvents = selectedDate
    ? upcomingEvents.filter((e) => e.date === selectedDate)
    : []

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1) }
    else setCurrentMonth(currentMonth - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1) }
    else setCurrentMonth(currentMonth + 1)
  }

  // Next 3 upcoming events for the sidebar
  const upcoming = [...upcomingEvents]
    .filter((e) => e.date >= todayStr)
    .slice(0, 3)

  return (
    <div className="space-y-8 pt-6">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-info-soft to-blue-500 flex items-center justify-center">
            <CalendarIcon className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">Calendrier</h1>
            <p className="text-zinc-500 text-sm font-medium">Tes événements à venir</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-6">
        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5"
        >
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="icon" onClick={prevMonth} aria-label="Mois précédent">
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </Button>
            <h2 className="text-xl font-black uppercase" aria-live="polite">
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <Button variant="ghost" size="icon" onClick={nextMonth} aria-label="Mois suivant">
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </Button>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {DAYS.map((day) => (
              <div key={day} className="text-center text-sm font-bold text-zinc-500 uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, idx) => {
              if (day === null) return <div key={idx} />

              const dateStr = formatDate(day)
              const dayEvents = getEventsForDate(day)
              const isSelected = selectedDate === dateStr
              const isToday = dateStr === todayStr

              return (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDate(dateStr)}
                  className={cn(
                    "relative aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all",
                    isSelected
                      ? "bg-info-soft text-black"
                      : isToday
                        ? "bg-brand-soft/20 text-white border border-brand-soft/30"
                        : "hover:bg-white/5"
                  )}
                >
                  <span className="font-bold">{day}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-1">
                      {dayEvents.slice(0, 3).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isSelected ? "bg-black/50" : "bg-accent-soft"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Selected Day Events */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5"
          >
            <h3 className="font-black text-lg mb-4">
              {selectedDate
                ? new Date(selectedDate + "T12:00:00").toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                : "Sélectionne un jour"}
            </h3>

            {selectedEvents.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500">Aucun événement ce jour</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedEvents.map((event) => {
                  const config = getTypeConfig(event.type)
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "p-4 rounded-2xl border transition-all",
                        event.registered
                          ? "bg-success-soft/10 border-success-soft/30"
                          : "bg-zinc-800/50 border-white/5"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{config.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-bold text-white">{event.title}</h4>
                          <div className="flex items-center gap-3 mt-2 text-sm text-zinc-400">
                            {event.time && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {event.time}
                              </div>
                            )}
                            {event.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {event.location}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            {event.xpReward > 0 && (
                              <div className="flex items-center gap-2 text-brand-soft">
                                <Zap className="w-4 h-4" />
                                <span className="font-bold">+{event.xpReward} XP</span>
                              </div>
                            )}
                            {event.registered ? (
                              <span className="flex items-center gap-1 text-success-soft text-sm font-bold">
                                <Check className="w-4 h-4" /> {event.rsvpLabel}
                              </span>
                            ) : (
                              <Button size="sm" className="bg-info-soft text-black font-bold">
                                S'inscrire
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* Upcoming */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5"
          >
            <h3 className="font-black text-lg mb-4">À venir</h3>
            {upcoming.length === 0 ? (
              <EmptyState
                preset="events"
                size="small"
                title="Pas d'événements prévus"
                description="Reviens bientôt pour découvrir les prochains événements."
              />
            ) : (
              <div className="space-y-3">
                {upcoming.map((event) => (
                  <div key={event.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50">
                    <div className="text-xl">{getTypeConfig(event.type).icon}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-white truncate">{event.title}</h4>
                      <p className="text-xs text-zinc-500">
                        {new Date(event.date + "T12:00:00").toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <Bell className="w-4 h-4 text-zinc-500" />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
