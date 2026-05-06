import { createClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Star, Music, Calendar, Search } from 'lucide-react'
import Image from "next/image"
import Link from "next/link"

export default async function DJsPage() {
  const supabase = await createClient()

  let djs = null
  try {
    const { data } = await supabase
      .from("djs")
      .select("*")
      .eq("is_active", true)
      .order("rating", { ascending: false })
    djs = data
  } catch (error) {
    console.log("[v0] DJs table not found, showing empty state")
    djs = []
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-coral-500/10 to-purple-500/10" />
          <div className="absolute inset-0 bg-[url('/dj-party-lights.jpg')] bg-cover bg-center opacity-5" />

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center space-y-6 mb-12">
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-600 via-coral-500 to-purple-600 bg-clip-text text-transparent">
                Nos DJs Professionnels
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Les meilleurs DJs du Maroc pour animer vos événements et mettre le feu aux pistes de danse
              </p>
            </div>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-12">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un DJ par nom ou style musical..."
                  className="pl-12 h-14 text-lg border-2"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-16">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-emerald-600">{djs?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">DJs Actifs</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-coral-600">500+</div>
                  <div className="text-sm text-muted-foreground">Événements</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-purple-600">4.8</div>
                  <div className="text-sm text-muted-foreground">Note Moyenne</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-emerald-600">10K+</div>
                  <div className="text-sm text-muted-foreground">Ados Heureux</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* DJs Grid */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            {!djs || djs.length === 0 ? (
              <div className="text-center py-20">
                <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-2xl font-bold mb-2">Nos DJs arrivent bientôt!</h3>
                <p className="text-muted-foreground mb-6">
                  Nous sommes en train de sélectionner les meilleurs DJs du Maroc pour vous.
                </p>
                <Link href="/agenda">
                  <Button size="lg">Découvrir nos événements</Button>
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {djs.map((dj) => (
                  <Card key={dj.id} className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <div className="relative h-64 overflow-hidden">
                      <Image
                        src={dj.photo_url || "/placeholder.svg"}
                        alt={dj.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-2xl font-bold text-white mb-1">{dj.stage_name}</h3>
                        <p className="text-white/80">{dj.name}</p>
                      </div>
                      {dj.rating && (
                        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          <span className="text-white font-semibold">{dj.rating}</span>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6 space-y-4">
                      <p className="text-muted-foreground line-clamp-2">{dj.bio}</p>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Music className="h-4 w-4 text-emerald-600" />
                          <span className="font-medium">Styles:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {dj.music_styles?.map((style: string) => (
                            <Badge key={style} variant="secondary">
                              {style}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <div>
                          <div className="text-2xl font-bold text-emerald-600">{dj.hourly_rate} DH</div>
                          <div className="text-xs text-muted-foreground">par heure</div>
                        </div>
                        <Link href={`/djs/${dj.id}`}>
                          <Button className="bg-gradient-to-r from-emerald-600 to-coral-600 hover:from-emerald-700 hover:to-coral-700">
                            Voir Profil
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-gradient-to-r from-emerald-600 via-coral-600 to-purple-600">
          <div className="max-w-4xl mx-auto text-center text-white space-y-6">
            <h2 className="text-4xl font-bold">Besoin d'un DJ pour votre événement?</h2>
            <p className="text-xl text-white/90">Réservez maintenant et offrez à vos ados une soirée inoubliable</p>
            <Link href="/djs/reserver">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                <Calendar className="mr-2 h-5 w-5" />
                Réserver un DJ
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
