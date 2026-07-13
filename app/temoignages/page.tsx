import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Star, Quote, Video } from "lucide-react"

import { OptimizedImage } from "@/components/optimized-image"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty, Niv } from "@/components/brand"
import { MeshBackground } from "@/components/ui/effects/mesh-background"

const ROT = ["-rotate-1", "rotate-1", "-rotate-2"]

type Testimonial = {
  id: string
  rating: number | null
  content: string
  photo_url: string | null
  author_name: string
  author_role: string | null
  video_url: string | null
}

export default async function TemoignagesPage() {
  // The `testimonials` table does not exist in the live schema, so there is
  // no source to read from yet — we always render the honest empty-state
  // until a real moderated testimonials source is wired up.
  const testimonials: Testimonial[] = []

  // Honest empty-state: no fake ratings until we have real moderated testimonials
  const hasTestimonials = testimonials.length > 0

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />

      <div className="relative overflow-hidden">
        <MeshBackground />
        <div className="relative container mx-auto px-6 py-28">
          <div className="flex flex-col items-center gap-5 text-center">
            <Niv mood="wink" size={110} float />
            <p className="eyebrow tracking-[0.16em]">Témoignages</p>
            <h1 className="font-display text-5xl font-extrabold leading-[1.02] tracking-tight text-balance md:text-6xl">
              Ils nous font <em className="font-semibold italic text-pink">confiance</em>
            </h1>
            <p className="max-w-2xl text-xl text-ink-2 text-balance">
              Ce que les familles pensent vraiment de Nivy.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-16">
        {hasTestimonials ? (
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial, idx) => (
              <StickerCard
                key={testimonial.id}
                className={`gap-4 p-6 transition-transform hover:rotate-0 ${ROT[idx % 3]}`}
              >
                <Quote className="size-9 text-pink" aria-hidden="true" />

                {testimonial.rating && (
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`size-4 ${i < (testimonial.rating ?? 0) ? "fill-gold text-gold" : "text-line"}`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                )}

                <p className="font-display text-lg font-semibold leading-snug text-ink">
                  « {testimonial.content} »
                </p>

                <div className="flex items-center gap-3 border-t-2 border-dashed border-line pt-4">
                  {testimonial.photo_url ? (
                    <div className="relative size-12 overflow-hidden rounded-full border-2 border-ink">
                      <OptimizedImage
                        src={testimonial.photo_url}
                        alt={testimonial.author_name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="grid size-12 place-items-center rounded-full border-2 border-ink bg-ink font-display font-bold text-paper">
                      {testimonial.author_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-display text-sm font-bold">{testimonial.author_name}</p>
                    <p className="font-mono text-xs uppercase tracking-[0.12em] text-mute">
                      {testimonial.author_role || "Parent"}
                    </p>
                  </div>
                </div>

                {testimonial.video_url && (
                  <span className="flex w-fit items-center gap-2 rounded-full border-2 border-ink bg-paper-2 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink">
                    <Video className="size-3.5 text-pink" aria-hidden="true" />
                    Voir la vidéo
                  </span>
                )}
              </StickerCard>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-md">
            <NivEmpty
              mood="calm"
              title="Aucun témoignage pour le moment"
              description="Les premiers retours arrivent — on publie uniquement des témoignages réels et vérifiés."
            />
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
