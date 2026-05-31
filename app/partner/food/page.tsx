import type { Metadata } from "next"
import Link from "next/link"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach } from "@/components/brand"
import { UtensilsCrossed, ClipboardList, ChefHat } from "lucide-react"

export const metadata: Metadata = { title: "Restaurant — Partenaire" }

// Refonte V1.5 (#101) — workspace restaurant type-aware (food). Remplace le
// namespace /partner/restaurant non lié à la sidebar (partner-ecosystem D10).
export default function PartnerFoodDashboard() {
  return (
    <div className="space-y-8 pt-6">
      <header className="space-y-2">
        <p className="eyebrow">Restaurant</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Ton <em className="font-semibold italic text-pink">resto</em> sur Nivy
        </h1>
        <p className="text-mute max-w-md">Gère ton menu et tes commandes au même endroit, sans prise de tête.</p>
      </header>

      <NivCoach
        mood="hype"
        tone="dark"
        message="Mets ton menu à jour, suis tes commandes en direct et garde la cuisine au top. Je te guide à chaque étape."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/partner/food/menu" className="block">
          <StickerCard variant="hover" className="h-full gap-2 p-6">
            <div className="flex items-center gap-2 font-display font-bold text-ink"><ChefHat className="w-5 h-5 text-coral" />Menu</div>
            <p className="text-sm text-mute">Plats, prix et disponibilité.</p>
          </StickerCard>
        </Link>
        <Link href="/partner/food/orders" className="block">
          <StickerCard variant="hover" className="h-full gap-2 p-6">
            <div className="flex items-center gap-2 font-display font-bold text-ink"><ClipboardList className="w-5 h-5 text-teal" />Commandes</div>
            <p className="text-sm text-mute">Ticker cuisine en temps réel.</p>
          </StickerCard>
        </Link>
        <StickerCard variant="panel" className="h-full gap-2 p-6 opacity-70">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-display font-bold text-ink"><UtensilsCrossed className="w-5 h-5 text-gold" />Stats</span>
            <span className="rounded-full border-2 border-ink bg-paper-2 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-mute">Bientôt</span>
          </div>
          <p className="text-sm text-mute">CA et plats les plus commandés.</p>
        </StickerCard>
      </div>
    </div>
  )
}
