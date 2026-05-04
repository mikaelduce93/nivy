import { createClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Camera, Calendar, MapPin, ImageIcon } from 'lucide-react'
import { OptimizedImage } from "@/components/optimized-image"

export default async function GaleriePage() {
  const supabase = await createClient()

  let galleries = null
  try {
    const { data } = await supabase
      .from("photo_galleries")
      .select(`
        *,
        events (
          title,
          city,
          event_date
        )
      `)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20)
    galleries = data
  } catch (error) {
    console.log("[v0] Photo galleries table not found, showing empty state")
    galleries = []
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-background to-pink-500/20" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="relative container mx-auto px-6 py-32">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 text-purple-400 text-sm font-semibold mb-6">
              <Camera className="w-4 h-4" />
              Galerie Photos
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-foreground mb-6 text-balance">
              Nos <span className="text-gradient">Meilleurs Moments</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
              Revivez l'ambiance incroyable de nos événements à travers ces photos
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-20">
        {galleries && galleries.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {galleries.map((gallery) => (
              <a
                key={gallery.id}
                href={`/galerie/${gallery.id}`}
                className="group block relative aspect-square rounded-3xl overflow-hidden"
              >
                <OptimizedImage
                  src={gallery.cover_photo}
                  alt={gallery.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-xl font-bold text-white mb-2">{gallery.title}</h3>
                  {gallery.events && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-white/80">
                        <MapPin className="w-4 h-4" />
                        <span>{gallery.events.city}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/80">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(gallery.events.event_date).toLocaleDateString("fr-FR")}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-white/60 mt-3">
                    <ImageIcon className="w-4 h-4" />
                    <span>{gallery.photo_count || 0} photos</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">Aucune galerie disponible pour le moment</p>
            <p className="text-sm text-muted-foreground">
              Les photos de nos prochains événements seront bientôt en ligne!
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
