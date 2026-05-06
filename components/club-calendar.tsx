"use client"

import { useState } from "react"
import { CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface ClubSession {
  id: string
  session_date: string
  start_time: string
  end_time: string
  title: string
  status: string
  attended?: boolean
}

interface ClubCalendarProps {
  sessions: ClubSession[]
  clubName: string
  venueName: string
  city: string
}

export function ClubCalendar({ sessions, clubName, venueName, city }: ClubCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthNames = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ]

  const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    return days
  }

  const getSessionForDate = (day: number | null) => {
    if (!day) return null
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return sessions.find((s) => s.session_date === dateStr)
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const days = getDaysInMonth(currentMonth)

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          Calendrier des sessions
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={previousMonth} aria-label="Mois précédent">
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </Button>
          <span className="font-semibold min-w-40 text-center" aria-live="polite">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth} aria-label="Mois suivant">
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          const session = getSessionForDate(day)
          const isToday =
            day &&
            new Date().getDate() === day &&
            new Date().getMonth() === currentMonth.getMonth() &&
            new Date().getFullYear() === currentMonth.getFullYear()

          return (
            <div
              key={index}
              className={`aspect-square flex items-center justify-center rounded-lg text-sm ${
                !day
                  ? ""
                  : session
                    ? session.attended
                      ? "bg-green-500/20 border-2 border-green-500 text-green-400 font-bold cursor-pointer hover:bg-green-500/30"
                      : session.status === "scheduled"
                        ? "bg-primary/20 border-2 border-primary text-primary font-bold cursor-pointer hover:bg-primary/30"
                        : "bg-muted border border-border text-muted-foreground"
                    : isToday
                      ? "border-2 border-primary text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted"
              }`}
              title={session ? `${session.title} - ${session.start_time}` : undefined}
            >
              {day}
            </div>
          )
        })}
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex items-center gap-3 text-sm">
          <div className="w-4 h-4 rounded bg-primary/20 border-2 border-primary" />
          <span className="text-muted-foreground">Session programmée</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="w-4 h-4 rounded bg-green-500/20 border-2 border-green-500" />
          <span className="text-muted-foreground">Session complétée</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="w-4 h-4 rounded border-2 border-primary" />
          <span className="text-muted-foreground">Aujourd'hui</span>
        </div>
      </div>

      {sessions.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border">
          <h4 className="font-semibold mb-3">Prochaines sessions</h4>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {sessions
              .filter((s) => s.status === "scheduled" && new Date(s.session_date) >= new Date())
              .slice(0, 5)
              .map((session) => (
                <div key={session.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {new Date(session.session_date).toLocaleDateString("fr-FR", { month: "short" }).toUpperCase()}
                    </span>
                    <span className="text-lg font-bold">{new Date(session.session_date).getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm line-clamp-1">{session.title || clubName}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {session.start_time} - {session.end_time}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{city}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </Card>
  )
}
