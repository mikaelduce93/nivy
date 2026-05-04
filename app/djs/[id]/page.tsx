import { createClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Star, Music, Award, Calendar, Clock, Users } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"

export default async function DJProfilePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: dj } = await supabase.from("djs").select("*").eq("id", params.id).single()

  if (!dj) notFound()

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
                  <h1 className="text-5xl font-bold text-white mb-2">{dj.stage_name}</h1>
                  <p className="text-2xl text-white/80">{dj.name}</p>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
                      <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                      <span className="text-white font-semibold text-lg">{dj.rating}</span>
                      <span className="text-white/70">({dj.total_reviews} avis)</span>
                    </div>
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      {dj.total_events} événements
                    </Badge>
                  </div>
                </div>
                <Link href={`/djs/${dj.id}/reserver`}>
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-emerald-600 to-coral-600 hover:from-emerald-700 hover:to-coral-700 text-lg px-8"
                  >
                    <Calendar className="mr-2 h-5 w-5" />
                    Réserver
                  </Button>
                </Link>
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
                <Tabs defaultValue="about">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="about">À Propos</TabsTrigger>
                    <TabsTrigger value="videos">Vidéos</TabsTrigger>
                    <TabsTrigger value="reviews">Avis</TabsTrigger>
                  </TabsList>

                  <TabsContent value="about" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Biographie</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg leading-relaxed">{dj.bio}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Spécialités</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          {dj.specialties?.map((specialty: string) => (
                            <div key={specialty} className="flex items-center gap-2">
                              <Award className="h-5 w-5 text-emerald-600" />
                              <span>{specialty}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Styles Musicaux</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {dj.music_styles?.map((style: string) => (
                            <Badge key={style} variant="secondary" className="text-base px-4 py-2">
                              <Music className="mr-2 h-4 w-4" />
                              {style}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="videos" className="space-y-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="grid md:grid-cols-2 gap-4">
                          {dj.video_urls?.map((url: string, index: number) => (
                            <div
                              key={index}
                              className="aspect-video bg-muted rounded-lg flex items-center justify-center"
                            >
                              <p className="text-muted-foreground">Vidéo {index + 1}</p>
                            </div>
                          ))}
                          {(!dj.video_urls || dj.video_urls.length === 0) && (
                            <div className="col-span-2 text-center py-12 text-muted-foreground">
                              Aucune vidéo disponible pour le moment
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="reviews">
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center py-12 text-muted-foreground">
                          Les avis seront bientôt disponibles
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Tarifs</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-4xl font-bold text-emerald-600">{dj.hourly_rate} DH</div>
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
                    <Link href={`/djs/${dj.id}/reserver`} className="block">
                      <Button className="w-full" size="lg">
                        Demander un Devis
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Disponibilité</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dj.is_available ? (
                      <div className="flex items-center gap-2 text-emerald-600">
                        <div className="h-3 w-3 rounded-full bg-emerald-600 animate-pulse" />
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
