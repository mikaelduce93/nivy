import { createClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Star, Quote, Heart, Video } from 'lucide-react'
import { OptimizedImage } from "@/components/optimized-image"

export default async function TemoignagesPage() {
  const supabase = await createClient()

  let testimonials = null
  try {
    const { data } = await supabase
      .from("testimonials")
      .select("*")
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(20)
    testimonials = data
  } catch (error) {
    console.log("[v0] Testimonials table not found, showing empty state")
    testimonials = []
  }

  const averageRatings = {
    evenements: 4.8,
    clubs: 4.9,
    service: 4.7,
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-background to-orange-500/20" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-yellow-500/30 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="relative container mx-auto px-6 py-32">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 text-yellow-400 text-sm font-semibold mb-6">
              <Heart className="w-4 h-4" />
              Témoignages
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-foreground mb-6 text-balance">
              Ils nous font <span className="text-gradient">Confiance</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
              Découvrez ce que nos familles pensent de Teens Party Morocco
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { label: "Événements", rating: averageRatings.evenements, icon: "🎉" },
              { label: "Clubs", rating: averageRatings.clubs, icon: "⚽" },
              { label: "Service Client", rating: averageRatings.service, icon: "💬" },
            ].map((item, idx) => (
              <div key={idx} className="bg-card rounded-2xl p-6 border border-border text-center">
                <div className="text-4xl mb-3">{item.icon}</div>
                <div className="text-3xl font-black text-yellow-400 mb-2">{item.rating}/5</div>
                <div className="flex justify-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < Math.floor(item.rating) ? "fill-yellow-400 text-yellow-400" : "text-muted"}`}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-20">
        {testimonials && testimonials.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-3xl blur-xl opacity-0 group-hover:opacity-50 transition duration-500" />
                <div className="relative bg-card rounded-3xl p-6 border border-border">
                  <Quote className="w-10 h-10 text-yellow-400/20 mb-4" />

                  {testimonial.rating && (
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < testimonial.rating ? "fill-yellow-400 text-yellow-400" : "text-muted"}`}
                        />
                      ))}
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground mb-6 italic">"{testimonial.content}"</p>

                  <div className="flex items-center gap-3">
                    {testimonial.photo_url ? (
                      <div className="relative w-12 h-12 rounded-full overflow-hidden">
                        <OptimizedImage
                          src={testimonial.photo_url}
                          alt={testimonial.author_name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-white font-bold">
                        {testimonial.author_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-sm">{testimonial.author_name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.author_role || "Parent"}</p>
                    </div>
                  </div>

                  {testimonial.video_url && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-purple-400">
                      <Video className="w-4 h-4" />
                      <span>Voir la vidéo</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">Aucun témoignage pour le moment</p>
            <p className="text-sm text-muted-foreground">Soyez le premier à partager votre expérience!</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
