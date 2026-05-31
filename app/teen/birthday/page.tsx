import type { Metadata } from "next"
import Link from "next/link"
import { Niv } from "@/components/brand/niv"
import { DarkSurface } from "@/components/brand"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { Cake, MapPin, Sparkles, ArrowRight } from "lucide-react"

export const metadata: Metadata = { title: "Mon anniversaire" }

// Refonte V2 (#158) — réservation d'anniversaire côté ado (packs venue/food).
// Entrée vers le flow /anniversaires (demande → sponsor parent).
// Note: aucun prix de pack n'est affiché ici — la grille tarifaire vit dans
// le flow /anniversaires (pas de prix mockés sans source BDD).
export default function TeenBirthdayPage() {
  return (
    <div className="space-y-8 pt-6">
      <header className="space-y-2">
        <p className="eyebrow tracking-[0.16em]">Lifestyle</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Organise ton <em className="font-semibold italic text-pink">anniversaire</em>
        </h1>
        <p className="text-mute max-w-md">Réserve un lieu, un pack food et invite ton crew.</p>
      </header>

      <DarkSurface tone="pink" shadow className="flex flex-col items-center p-8 text-center sm:p-12">
        <Niv size={120} mood="hype" float />
        <h2 className="mt-4 font-display text-2xl font-extrabold text-paper">Ton jour, en grand 🎉</h2>
        <p className="mt-2 mb-6 max-w-sm text-paper/70">
          Choisis un pack chez nos lieux et restos partenaires, paie en coins, et invite tes amis.
        </p>
        <Button asChild variant="pink">
          <Link href="/anniversaires"><Cake className="mr-2 h-4 w-4" />Découvrir les packs</Link>
        </Button>
      </DarkSurface>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/anniversaires" className="rounded-2xl focus-visible:outline-none">
          <StickerCard variant="hover" className="h-full p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-teal/15">
                <MapPin className="h-5 w-5 text-ink" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display font-bold text-ink">Lieux partenaires</h3>
                <p className="text-sm text-mute">Salles, lounges et cafés validés.</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-mute" aria-hidden />
            </div>
          </StickerCard>
        </Link>
        <Link href="/anniversaires" className="rounded-2xl focus-visible:outline-none">
          <StickerCard variant="hover" className="h-full p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-gold/15">
                <Sparkles className="h-5 w-5 text-ink" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display font-bold text-ink">Packs clé en main</h3>
                <p className="text-sm text-mute">Déco, food et animations incluses.</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-mute" aria-hidden />
            </div>
          </StickerCard>
        </Link>
      </div>
    </div>
  )
}
