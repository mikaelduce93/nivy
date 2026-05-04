"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, MapPin, Clock } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface Event {
  id: string
  title: string
  event_date: string
  venue_name?: string
  start_time?: string
}

interface UpcomingEventsProps {
  events: Event[]
}

export function UpcomingEvents({ events }: UpcomingEventsProps) {
  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return "Demain"
    if (diffDays < 7) return `Dans ${diffDays} jours`
    return format(date, "d MMM", { locale: fr })
  }

  return (
    <Card className="bg-gradient-to-br from-purple-900/10 to-pink-900/10 border-purple-500/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-400" />
          Agenda Teen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.length > 0 ? (
          events.map((event) => (
            <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-purple-500/30 transition-all">
              <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <span className="text-xs font-bold uppercase">{format(new Date(event.event_date), "MMM", { locale: fr })}</span>
                <span className="text-lg font-black">{format(new Date(event.event_date), "d")}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-white truncate">{event.title}</h4>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 whitespace-nowrap">
                    {getRelativeTime(event.event_date)}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                  {event.venue_name && (
                    <div className="flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3" />
                      <span>{event.venue_name}</span>
                    </div>
                  )}
                  {event.start_time && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{event.start_time.slice(0, 5)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-zinc-500">Aucun événement prévu</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}



