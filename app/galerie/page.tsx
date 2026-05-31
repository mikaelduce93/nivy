import { createClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Calendar, MapPin, ImageIcon } from "lucide-react"

import { OptimizedImage } from "@/components/optimized-image"
import { NivEmpty, Niv } from "@/components/brand"
import { MeshBackground } from "@/components/ui/effects/mesh-background"

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
    <div className="min-h-screen bg-paper">
      <Navbar />

      <div className="relative overflow-hidden">
        <MeshBackground />
        <div className="relative container mx-auto px-6 py-28">
          <div className="flex flex-col items-center gap-5 text-center">
            <Niv mood="hype" size={110} float />
            <p className="eyebrow tracking-[0.16em]">Galerie · Nivy</p>
            <h1 className="font-display text-5xl font-extrabold leading-[1.02] tracking-tight text-balance md:text-6xl">
              Nos meilleurs <em className="font-semibold italic text-pink">moments</em>
            </h1>
            <p className="max-w-2xl text-xl text-ink-2 text-balance">
              Revis l'ambiance de nos events en images.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-16">
        {galleries && galleries.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {galleries.map((gallery) => (
              <div
                key={gallery.id}
                className="group relative block aspect-square overflow-hidden rounded-2xl border-2 border-ink shadow-stkr-sm"
              >
                <OptimizedImage
                  src={gallery.cover_photo}
                  alt={gallery.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 translate-y-4 p-6 transition-transform duration-300 group-hover:translate-y-0">
                  <h3 className="mb-2 font-display text-xl font-bold text-paper">{gallery.title}</h3>
                  {gallery.events && (
                    <div className="space-y-1 font-mono text-xs text-paper/80">
                      <div className="flex items-center gap-2">
                        <MapPin className="size-3.5" aria-hidden="true" />
                        <span>{gallery.events.city}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="size-3.5" aria-hidden="true" />
                        <span>{new Date(gallery.events.event_date).toLocaleDateString("fr-FR")}</span>
                      </div>
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2 font-mono text-xs text-paper/60">
                    <ImageIcon className="size-3.5" aria-hidden="true" />
                    <span>{gallery.photo_count || 0} photos</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-md">
            <NivEmpty
              mood="hype"
              title="Aucune galerie pour le moment"
              description="Les photos de nos prochains events arrivent bientôt en ligne !"
            />
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
