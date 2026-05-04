import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Users, Clock, ExternalLink } from "lucide-react"
import Link from "next/link"

export default function PartnerEventsPage() {
  const upcomingEvents = [
    {
      id: 1,
      title: "Teen Party - Casablanca",
      date: "25 Janvier 2024",
      time: "18:00 - 23:00",
      location: "Le Rooftop Teen",
      attendees: 250,
      maxAttendees: 300,
      canParticipate: true,
    },
    {
      id: 2,
      title: "Gaming Tournament",
      date: "1 Février 2024",
      time: "14:00 - 20:00",
      location: "Anfa Place Mall",
      attendees: 120,
      maxAttendees: 150,
      canParticipate: true,
    },
    {
      id: 3,
      title: "Teen Music Festival",
      date: "14 Février 2024",
      time: "16:00 - 22:00",
      location: "Morocco Mall",
      attendees: 400,
      maxAttendees: 500,
      canParticipate: false,
    },
  ]

  const pastParticipations = [
    { event: "New Year Teen Party", date: "31 Déc 2023", scans: 45, revenue: 3200 },
    { event: "Winter Gaming Cup", date: "15 Déc 2023", scans: 28, revenue: 1800 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white">Events Teen Club</h1>
        <p className="text-zinc-400">Participez aux événements et rencontrez vos clients</p>
      </div>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border-emerald-500/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-white mb-1">Participez aux events Teen Club !</h3>
              <p className="text-zinc-300 text-sm">
                En tant que partenaire, vous pouvez avoir un stand lors de nos événements pour promouvoir vos offres
                et scanner les cartes des membres présents. C'est l'occasion idéale pour augmenter votre visibilité !
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Événements à venir</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {upcomingEvents.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between p-5 rounded-xl bg-zinc-800 border border-zinc-700 hover:border-emerald-500/30 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="text-center min-w-[60px] p-3 rounded-xl bg-zinc-900">
                  <p className="text-xs text-zinc-500 uppercase">
                    {event.date.split(" ")[1].slice(0, 3)}
                  </p>
                  <p className="text-2xl font-black text-white">{event.date.split(" ")[0]}</p>
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{event.title}</h3>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {event.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {event.attendees}/{event.maxAttendees} inscrits
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {event.canParticipate ? (
                  <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                    Demander un stand
                  </Button>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-zinc-700 text-zinc-400 text-sm">
                    Complet
                  </span>
                )}
                <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" asChild>
                  <Link href="#">
                    Voir détails <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Past Participations */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Vos participations passées</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pastParticipations.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-xl bg-zinc-800 border border-zinc-700"
              >
                <div>
                  <p className="font-semibold text-white">{p.event}</p>
                  <p className="text-sm text-zinc-400">{p.date}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-xl font-black text-emerald-400">{p.scans}</p>
                    <p className="text-xs text-zinc-500">scans</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-white">{p.revenue.toLocaleString()} DH</p>
                    <p className="text-xs text-zinc-500">CA généré</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
