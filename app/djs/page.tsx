import { Star, Music, Calendar } from 'lucide-react'
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { Niv, NivEmpty, DarkSurface } from "@/components/brand"
import { MeshBackground } from "@/components/ui/effects/mesh-background"

// The `djs` table was dropped from the live database (no `djs` relation nor any
// of its columns exist in the regenerated Supabase types). The previous query
// `.from("djs")…` always returned an error, so `djs` was always null and this
// page has only ever rendered the empty state. Kept that observable behavior
// until the DJ feature is rebuilt against a real table.
interface Dj {
  id: string
  name: string
  stage_name: string
  photo_url: string | null
  bio: string | null
  rating: number | null
  music_styles: string[] | null
  hourly_rate: number
}

export default async function DJsPage() {
  const djs: Dj[] = []

  const count = djs.length

  return (
    <main className="min-h-screen bg-paper">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-32">
        <MeshBackground />
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="flex flex-col items-center gap-5 text-center">
            <Niv mood="hype" size={104} float />
            <p className="eyebrow tracking-[0.16em]">DJs · Nivy</p>
            <h1 className="font-display text-5xl font-extrabold leading-[1.04] tracking-tight md:text-6xl">
              Nos <em className="font-semibold italic text-pink">DJs</em>
            </h1>
            <p className="max-w-2xl text-xl text-ink-2">
              Les meilleurs DJs du Maroc pour animer tes événements et mettre le feu à la piste.
            </p>
            {count > 0 && (
              <span className="rounded-full border-2 border-ink bg-white px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.14em] text-ink">
                {count} DJ{count > 1 ? "s" : ""} actif{count > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* DJs Grid */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-7xl">
          {!djs || djs.length === 0 ? (
            <div className="mx-auto max-w-md">
              <NivEmpty
                mood="calm"
                title="Nos DJs arrivent bientôt !"
                description="On sélectionne les meilleurs DJs du Maroc pour toi."
                action={
                  <Button asChild variant="pink">
                    <Link href="/agenda">Découvrir nos événements</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {djs.map((dj) => (
                <StickerCard key={dj.id} variant="hover" className="overflow-hidden p-0">
                  <div className="relative h-64 border-b-2 border-ink">
                    <Image
                      src={dj.photo_url || "/placeholder.svg"}
                      alt={dj.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover"
                      loading="lazy"
                    />
                    {dj.rating && (
                      <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full border-2 border-ink bg-white px-3 py-1">
                        <Star className="size-4 fill-gold text-gold" aria-hidden="true" />
                        <span className="font-mono text-sm font-bold text-ink">{dj.rating}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4 p-6">
                    <div>
                      <h3 className="font-display text-2xl font-extrabold text-ink">{dj.stage_name}</h3>
                      <p className="text-sm text-mute">{dj.name}</p>
                    </div>
                    <p className="line-clamp-2 text-mute">{dj.bio}</p>

                    {(dj.music_styles?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {(dj.music_styles ?? []).map((style: string) => (
                          <span key={style} className="rounded-full border-2 border-ink bg-paper-2 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink">
                            {style}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t-2 border-dashed border-line pt-4">
                      <div>
                        <div className="font-display text-2xl font-extrabold text-ink">{dj.hourly_rate} DH</div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">par heure</div>
                      </div>
                      <Button asChild variant="pink" size="sm">
                        <Link href={`/djs/${dj.id}`}>Voir profil</Link>
                      </Button>
                    </div>
                  </div>
                </StickerCard>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section — surface sombre ponctuelle */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <DarkSurface tone="pink" shadow className="p-10 text-center sm:p-12">
            <h2 className="font-display text-4xl font-extrabold text-paper">Tu mixes ? Rejoins-nous</h2>
            <p className="mt-3 text-xl text-paper/80">
              Deviens DJ Nivy et fais vibrer les soirées ados du Maroc.
            </p>
            <Button asChild size="lg" variant="pink" className="mt-6">
              <Link href="/devenir-dj">
                <Calendar className="mr-2 size-5" aria-hidden="true" />
                Devenir DJ Nivy
              </Link>
            </Button>
          </DarkSurface>
        </div>
      </section>
    </main>
  )
}
