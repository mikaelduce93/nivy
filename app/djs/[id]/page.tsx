import { createClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DjTabs } from "./dj-tabs"
import { Star, Calendar, Clock, Users } from "lucide-react"
import Image from "next/image"
import { notFound } from "next/navigation"
import { getPublicAppConfig } from "@/lib/config/app-config"

export default async function DJProfilePage({ params }: { params: Promise<{ id: string }> }) {
  // Next 15/16: params is a Promise and must be awaited before use, otherwise
  // dj.id resolves to undefined and every DJ profile 404s.
  const { id } = await params
  const supabase = await createClient()
  const { contactEmail } = getPublicAppConfig()

  const { data: dj } = await supabase.from("djs").select("*").eq("id", id).single()

  if (!dj) notFound()

  // No DJ-booking backend exists yet; "Réserver"/"Devis" open a real quote
  // request by email rather than linking to a dangling /djs/[id]/reserver route.
  const quoteHref = `mailto:${contactEmail}?subject=${encodeURIComponent(`Réservation DJ — ${dj.stage_name}`)}`

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative h-96 overflow-hidden">
          <Image
            src={dj.photo_url || "/placeholder.svg"}
            alt={dj.stage_name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-end justify-between">
                <div>
                  <h1 className="text-5xl font-bold text-ink mb-2">{dj.stage_name}</h1>
                  <p className="text-2xl text-ink/80">{dj.name}</p>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1 bg-ink/50  rounded-full px-4 py-2">
                      <Star className="h-5 w-5 fill-gold text-gold" />
                      <span className="text-ink font-semibold text-lg">{dj.rating}</span>
                      <span className="text-ink/70">({dj.total_reviews} avis)</span>
                    </div>
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      {dj.total_events} événements
                    </Badge>
                  </div>
                </div>
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-lime to-coral-600 hover:from-lime hover:to-coral-700 text-lg px-8"
                >
                  <a href={quoteHref}>
                    <Calendar className="mr-2 h-5 w-5" />
                    Réserver
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                <DjTabs
                  bio={dj.bio}
                  specialties={dj.specialties}
                  musicStyles={dj.music_styles}
                  videoUrls={dj.video_urls}
                />
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Tarifs</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-4xl font-bold text-lime">{dj.hourly_rate} DH</div>
                      <div className="text-muted-foreground">par heure</div>
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Durée minimum: 3 heures</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>Matériel professionnel inclus</span>
                      </div>
                    </div>
                    <Button asChild className="w-full" size="lg">
                      <a href={quoteHref}>
                        Demander un Devis
                      </a>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Disponibilité</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dj.is_available ? (
                      <div className="flex items-center gap-2 text-lime">
                        <div className="h-3 w-3 rounded-full bg-lime animate-pulse" />
                        <span className="font-medium">Disponible</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="h-3 w-3 rounded-full bg-muted-foreground" />
                        <span>Non disponible</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
