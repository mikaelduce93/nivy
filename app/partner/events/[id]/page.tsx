import type { Metadata } from "next"
import Link from "next/link"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Ticket, MapPin, ScanLine } from "lucide-react"

export const metadata: Metadata = { title: "Éditer l'événement — Partenaire" }

// Refonte V1.5 (#101) — édition d'un événement organisateur.
export default async function PartnerEventEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="space-y-6 pt-6 max-w-2xl">
      <Button asChild variant="ghost" size="sm"><Link href="/partner/events"><ArrowLeft className="w-4 h-4 mr-1" />Événements</Link></Button>
      <header className="space-y-2">
        <p className="eyebrow">Organisateur</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Éditer l'<em className="font-semibold italic text-pink">événement</em></h1>
        <p className="font-mono text-sm text-mute">ID : {id}</p>
      </header>

      <StickerCard className="gap-4 p-6">
        <span className="w-fit rounded-full border-2 border-ink bg-gold/15 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wide text-ink">
          En modération
        </span>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <Ticket className="mt-0.5 size-5 shrink-0 text-pink" />
            <div>
              <p className="font-display font-bold text-ink">Détails &amp; billetterie</p>
              <p className="text-sm text-mute">Titre, date, capacité et tarifs de ton event.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-teal" />
            <div>
              <p className="font-display font-bold text-ink">Lieu &amp; horaires</p>
              <p className="text-sm text-mute">Salle, adresse et créneaux d'ouverture.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <ScanLine className="mt-0.5 size-5 shrink-0 text-coral" />
            <div>
              <p className="font-display font-bold text-ink">Check-in à la porte</p>
              <p className="text-sm text-mute">Scan des cartes membres à l'entrée le jour J.</p>
            </div>
          </li>
        </ul>
      </StickerCard>

      <NivCoach
        mood="proud"
        tone="paper"
        message="Ton event passe en modération avant d'être visible. Une fois validé, tu pourras activer la billetterie et le check-in."
      />
    </div>
  )
}
