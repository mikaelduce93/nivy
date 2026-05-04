"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Calendar as CalendarIcon, Clock, MapPin, Users, Star, ChevronLeft, ChevronRight, Zap, Bell, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Static calendar data
const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

const EVENTS = [
  { 
    id: 1, 
    title: "Gaming Night", 
    date: "2024-01-28", 
    time: "18:00", 
    location: "Casa Events", 
    type: "event",
    xpReward: 150,
    registered: true,
    attendees: 45
  },
  { 
    id: 2, 
    title: "Quiz Challenge", 
    date: "2024-01-28", 
    time: "15:00", 
    location: "En ligne", 
    type: "challenge",
    xpReward: 100,
    registered: false,
    attendees: 128
  },
  { 
    id: 3, 
    title: "Crew Battle", 
    date: "2024-01-30", 
    time: "20:00", 
    location: "En ligne", 
    type: "battle",
    xpReward: 200,
    registered: true,
    attendees: 24
  },
  { 
    id: 4, 
    title: "Workshop Coding", 
    date: "2024-02-01", 
    time: "14:00", 
    location: "Tech Hub Rabat", 
    type: "workshop",
    xpReward: 250,
    registered: false,
    attendees: 32
  },
  { 
    id: 5, 
    title: "Sport Day", 
    date: "2024-02-03", 
    time: "09:00", 
    location: "Stade Municipal", 
    type: "sport",
    xpReward: 175,
    registered: false,
    attendees: 89
  },
]

const TASKS = [
  { id: 1, title: "Quiz Math - Chapitre 3", date: "2024-01-28", completed: false, xp: 75 },
  { id: 2, title: "30 squats", date: "2024-01-28", completed: true, xp: 50 },
  { id: 3, title: "Lire 20 pages", date: "2024-01-29", completed: false, xp: 60 },
  { id: 4, title: "Pratiquer guitare", date: "2024-01-30", completed: false, xp: 80 },
]

const typeConfig = {
  event: { color: "from-gen-z-coral to-pink-500", icon: "🎉" },
  challenge: { color: "from-gen-z-lavender to-purple-500", icon: "🧠" },
  battle: { color: "from-orange-500 to-red-500", icon: "⚔️" },
  workshop: { color: "from-gen-z-mint to-emerald-500", icon: "💻" },
  sport: { color: "from-blue-500 to-cyan-500", icon: "🏃" },
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(0) // January
  const [currentYear, setCurrentYear] = useState(2024)
  const [selectedDate, setSelectedDate] = useState<string | null>("2024-01-28")
  const [view, setView] = useState<"month" | "week">("month")

  // Generate calendar days
  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1

  const calendarDays = []
  for (let i = 0; i < adjustedFirstDay; i++) {
    calendarDays.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i)
  }

  const formatDate = (day: number) => {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const getEventsForDate = (day: number) => {
    const dateStr = formatDate(day)
    return EVENTS.filter(e => e.date === dateStr)
  }

  const selectedEvents = selectedDate ? EVENTS.filter(e => e.date === selectedDate) : []
  const selectedTasks = selectedDate ? TASKS.filter(t => t.date === selectedDate) : []

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  return (
    <div className="min-h-screen pb-32 space-y-8 pt-6">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gen-z-sky to-blue-500 flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">Calendrier</h1>
                <p className="text-zinc-500 text-sm font-medium">Tes événements et tâches</p>
              </div>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-zinc-900/50 border border-white/5">
            <button
              onClick={() => setView("month")}
              className={cn(
                "px-4 py-2 rounded-lg font-bold text-sm transition-all",
                view === "month" ? "bg-white text-black" : "text-zinc-400"
              )}
            >
              Mois
            </button>
            <button
              onClick={() => setView("week")}
              className={cn(
                "px-4 py-2 rounded-lg font-bold text-sm transition-all",
                view === "week" ? "bg-white text-black" : "text-zinc-400"
              )}
            >
              Semaine
            </button>
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
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-black uppercase">
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {DAYS.map(day => (
              <div key={day} className="text-center text-sm font-bold text-zinc-500 uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={idx} />
              }

              const dateStr = formatDate(day)
              const dayEvents = getEventsForDate(day)
              const isSelected = selectedDate === dateStr
              const isToday = dateStr === "2024-01-28" // Mock today

              return (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDate(dateStr)}
                  className={cn(
                    "relative aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all",
                    isSelected 
                      ? "bg-gen-z-sky text-black" 
                      : isToday 
                        ? "bg-gen-z-lavender/20 text-white border border-gen-z-lavender/30" 
                        : "hover:bg-white/5"
                  )}
                >
                  <span className="font-bold">{day}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-1">
                      {dayEvents.slice(0, 3).map((event, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isSelected ? "bg-black/50" : "bg-gen-z-coral"
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

        {/* Sidebar - Selected Day Details */}
        <div className="space-y-6">
          {/* Selected Date Events */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5"
          >
            <h3 className="font-black text-lg mb-4">
              {selectedDate ? new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : "Sélectionne un jour"}
            </h3>

            {selectedEvents.length === 0 && selectedTasks.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500">Aucun événement ce jour</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Events */}
                {selectedEvents.map(event => {
                  const config = typeConfig[event.type as keyof typeof typeConfig]
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "p-4 rounded-2xl border transition-all",
                        event.registered 
                          ? "bg-gen-z-mint/10 border-gen-z-mint/30" 
                          : "bg-zinc-800/50 border-white/5"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{config.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-bold text-white">{event.title}</h4>
                          <div className="flex items-center gap-3 mt-2 text-sm text-zinc-400">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {event.time}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2 text-gen-z-lavender">
                              <Zap className="w-4 h-4" />
                              <span className="font-bold">+{event.xpReward} XP</span>
                            </div>
                            {event.registered ? (
                              <span className="flex items-center gap-1 text-gen-z-mint text-sm font-bold">
                                <Check className="w-4 h-4" /> Inscrit
                              </span>
                            ) : (
                              <Button size="sm" className="bg-gen-z-sky text-black font-bold">
                                S'inscrire
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Tasks */}
                {selectedTasks.map(task => (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-2xl border transition-all",
                      task.completed 
                        ? "bg-gen-z-mint/10 border-gen-z-mint/30 opacity-60" 
                        : "bg-zinc-800/50 border-white/5"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                      task.completed 
                        ? "bg-gen-z-mint border-gen-z-mint" 
                        : "border-zinc-500"
                    )}>
                      {task.completed && <Check className="w-4 h-4 text-black" />}
                    </div>
                    <div className="flex-1">
                      <h4 className={cn(
                        "font-bold",
                        task.completed ? "line-through text-zinc-500" : "text-white"
                      )}>
                        {task.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1 text-gen-z-lavender">
                      <Zap className="w-4 h-4" />
                      <span className="font-bold text-sm">+{task.xp}</span>
                    </div>
                  </div>
                ))}
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
            <div className="space-y-3">
              {EVENTS.slice(0, 3).map(event => (
                <div key={event.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50">
                  <div className="text-xl">{typeConfig[event.type as keyof typeof typeConfig].icon}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-white truncate">{event.title}</h4>
                    <p className="text-xs text-zinc-500">{new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <Bell className="w-4 h-4 text-zinc-500" />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
