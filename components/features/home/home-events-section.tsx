import Image from "next/image"
import Link from "next/link"
import { Calendar, MapPin, ArrowRight, Trophy, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface Event {
  id: string
  title: string
  image_url?: string
  event_date: string
  city?: string
}

interface Club {
  id: string
  slug: string
  name: string
  photo_url?: string
  description?: string
  price_monthly?: number
}

interface HomeEventsSectionProps {
  events: Event[]
  clubs: Club[]
}

export function HomeEventsSection({ events, clubs }: HomeEventsSectionProps) {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">Prochaines Activités</h2>
          <p className="text-lg text-muted-foreground">Événements, clubs et plus encore</p>
        </div>

        <div className="mb-16">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Événements à venir
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.slice(0, 3).map((event) => {
              const eventDate = new Date(event.event_date)
              return (
                <Card key={event.id} className="overflow-hidden group hover:shadow-lg transition-all">
                  <div className="relative h-48">
                    <Image
                      src={event.image_url || "/nightclub-confetti-celebration-crowd.jpg"}
                      alt={event.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute top-3 right-3 bg-primary text-white font-bold text-center rounded-lg overflow-hidden">
                      <div className="px-3 py-1 text-2xl">{eventDate.getDate()}</div>
                      <div className="px-3 py-0.5 text-xs bg-primary/80">
                        {eventDate.toLocaleDateString("fr-FR", { month: "short" }).toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <h4 className="text-xl font-bold mb-2 line-clamp-1">{event.title}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <MapPin className="w-4 h-4" />
                      <span>{event.city || "Casablanca"}</span>
                    </div>
                    <Button asChild className="w-full">
                      <Link href={`/evenements/${event.id}`}>
                        Réserver
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
          <div className="text-center mt-8">
            <Link href="/agenda">
              <Button size="lg" variant="outline">
                Voir tout l'agenda
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="mb-16">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-purple-500" />
            Clubs en vedette
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubs.map((club) => (
              <Card key={club.id} className="overflow-hidden hover:shadow-lg transition-all">
                <div className="relative h-48">
                  <Image
                    src={club.photo_url || "/teenagers-dancing-party-celebration-happy.jpg"}
                    alt={club.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-6">
                  <h4 className="text-xl font-bold mb-2">{club.name}</h4>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{club.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-primary">{club.price_monthly} DH/mois</span>
                    <Button asChild size="sm">
                      <Link href={`/clubs/${club.slug}`}>Découvrir</Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-400" />
            Témoignage du mois
          </h3>
          <Card className="p-8 bg-gradient-to-br from-primary/10 to-accent/10">
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
              ))}
            </div>
            <p className="text-lg mb-6 leading-relaxed">
              "C'était magique ! L'ambiance, les DJs, les surprises... Mon anniversaire était incroyable grâce à Teen Party.
              Mes parents étaient rassurés et mes amis ont adoré. Je recommande à 100% !"
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xl font-bold">A</span>
              </div>
              <div>
                <p className="font-bold">Amina L.</p>
                <p className="text-sm text-muted-foreground">16 ans, Casablanca</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}
