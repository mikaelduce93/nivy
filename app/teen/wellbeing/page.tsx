import type { Metadata } from "next"
import { Niv, DarkSurface } from "@/components/brand"
import { StickerCard } from "@/components/ui/sticker-card"
import { Moon, Heart, Wind } from "lucide-react"

export const metadata: Metadata = { title: "Bien-être" }

// Refonte V2 (#158) — espace bien-être (différé au canon §19.4). Placeholder
// Niv calm conservé ; coach posé sur une <DarkSurface> (F2).
export default function TeenWellbeingPage() {
  return (
    <div className="space-y-8 pt-6">
      <header className="space-y-2">
        <p className="eyebrow tracking-[0.16em]">Bien-être</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Prends soin de <em className="font-semibold italic text-pink">toi</em>
        </h1>
        <p className="text-mute max-w-md">Respire, dors, équilibre. Niv veille sur ton rythme.</p>
      </header>

      <DarkSurface tone="teal" shadow className="flex flex-col items-center p-8 text-center sm:p-12">
        <Niv size={110} mood="calm" float />
        <p className="mt-4 max-w-sm font-display text-lg font-bold text-paper">
          Respire, pas de pression sur les streaks.
        </p>
        <p className="mt-2 max-w-sm text-sm text-paper/70">
          Cet espace s&apos;enrichira bientôt de routines et de rappels doux.
        </p>
      </DarkSurface>

      <div className="grid gap-4 sm:grid-cols-3">
        <StickerCard className="gap-2 p-5">
          <div className="flex items-center gap-2 font-bold text-ink"><Moon className="h-4 w-4 text-teal" />Sommeil</div>
          <p className="text-sm text-mute">Quiet hours 22h–7h activées.</p>
        </StickerCard>
        <StickerCard className="gap-2 p-5">
          <div className="flex items-center gap-2 font-bold text-ink"><Wind className="h-4 w-4 text-lime" />Respiration</div>
          <p className="text-sm text-mute">Pauses guidées à venir.</p>
        </StickerCard>
        <StickerCard className="gap-2 p-5">
          <div className="flex items-center gap-2 font-bold text-ink"><Heart className="h-4 w-4 text-pink" />Équilibre</div>
          <p className="text-sm text-mute">Pas de pression sur les streaks.</p>
        </StickerCard>
      </div>
    </div>
  )
}
