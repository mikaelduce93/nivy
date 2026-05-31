"use client"

import { useState } from "react"
import {
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Bell,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { Niv, NivEmpty } from "@/components/brand"

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

// Pastilles d'event par type, en tokens charte (teal/gold/rose/lime/coral).
const TYPE_CONFIG: Record<string, { dot: string; icon: string }> = {
  event:     { dot: "bg-pink", icon: "🎉" },
  challenge: { dot: "bg-teal", icon: "🧠" },
  battle:    { dot: "bg-coral", icon: "⚔️" },
  workshop:  { dot: "bg-lime", icon: "💻" },
  sport:     { dot: "bg-gold", icon: "🏃" },
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
      {/* Hero éditorial */}
      <header className="flex items-center gap-4">
        <Niv mood="happy" size={72} className="shrink-0" />
        <div>
          <p className="eyebrow tracking-[0.16em] text-pink">Ton agenda</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            Ton <em className="font-semibold italic text-pink">calendrier</em>
          </h1>
          <p className="mt-1 text-sm text-mute">Tes événements à venir.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-6">
        {/* Calendar */}
        <StickerCard variant="default" className="p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="icon" onClick={prevMonth} aria-label="Mois précédent">
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </Button>
            <h2 className="font-display text-xl font-extrabold uppercase tracking-tight" aria-live="polite">
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <Button variant="ghost" size="icon" onClick={nextMonth} aria-label="Mois suivant">
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </Button>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {DAYS.map((day) => (
              <div key={day} className="text-center font-mono text-xs font-bold uppercase tracking-[0.08em] text-mute">
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
                <button
                  key={idx}
                  onClick={() => setSelectedDate(dateStr)}
                  className={cn(
                    "relative aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all",
                    isSelected
                      ? "-translate-x-0.5 -translate-y-0.5 border-2 border-ink bg-ink text-paper shadow-stkr-pink motion-reduce:translate-x-0 motion-reduce:translate-y-0"
                      : isToday
                        ? "border-2 border-ink text-ink"
                        : "border-2 border-transparent text-ink hover:border-ink"
                  )}
                >
                  <span className="font-display font-extrabold tabular-nums">{day}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-1">
                      {dayEvents.slice(0, 3).map((event, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isSelected ? "bg-paper" : getTypeConfig(event.type).dot
                          )}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </StickerCard>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Selected Day Events */}
          <StickerCard variant="default" className="p-6">
            <h3 className="font-display text-lg font-extrabold tracking-tight mb-4">
              {selectedDate
                ? new Date(selectedDate + "T12:00:00").toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                : "Sélectionne un jour"}
            </h3>

            {selectedEvents.length === 0 ? (
              <NivEmpty
                mood="calm"
                title="Aucun événement ce jour"
                description="Choisis un autre jour ou réserve ta prochaine sortie."
              />
            ) : (
              <div className="space-y-4">
                {selectedEvents.map((event) => {
                  const config = getTypeConfig(event.type)
                  return (
                    <StickerCard key={event.id} variant="panel" className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{config.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-display font-extrabold tracking-tight text-ink">{event.title}</h4>
                          <div className="flex items-center gap-3 mt-2 font-mono text-xs text-mute">
                            {event.time && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" aria-hidden="true" />
                                {event.time}
                              </div>
                            )}
                            {event.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" aria-hidden="true" />
                                {event.location}
                              </div>
                            )}
                          </div>
                          {event.registered && (
                            <span className="mt-3 inline-flex items-center gap-1 rounded-full border-2 border-ink bg-lime px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-on-bright">
                              <Check className="w-3 h-3" aria-hidden="true" /> {event.rsvpLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </StickerCard>
                  )
                })}
              </div>
            )}
          </StickerCard>

          {/* Upcoming */}
          <StickerCard variant="default" className="p-6">
            <h3 className="font-display text-lg font-extrabold tracking-tight mb-4">À venir</h3>
            {upcoming.length === 0 ? (
              <NivEmpty
                mood="calm"
                title="Calme plat"
                description="Réserve ta prochaine sortie pour remplir ton agenda."
              />
            ) : (
              <div className="space-y-3">
                {upcoming.map((event) => (
                  <StickerCard key={event.id} variant="panel" className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="text-xl">{getTypeConfig(event.type).icon}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-display font-extrabold text-sm tracking-tight text-ink truncate">{event.title}</h4>
                        <p className="font-mono text-xs text-mute">
                          {new Date(event.date + "T12:00:00").toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                      <Bell className="w-4 h-4 text-mute" aria-hidden="true" />
                    </div>
                  </StickerCard>
                ))}
              </div>
            )}
          </StickerCard>
        </div>
      </div>
    </div>
  )
}
