import type { Metadata } from "next"
import Link from "next/link"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/ui/field"
import { ArrowLeft, CalendarPlus } from "lucide-react"

export const metadata: Metadata = { title: "Nouvel événement — Partenaire" }

// Refonte V1.5 (#101) — création d'événement (organizer). /partner/events était list-only.
export default function PartnerEventNew() {
  return (
    <div className="space-y-6 pt-6 max-w-2xl">
      <Button asChild variant="ghost" size="sm"><Link href="/partner/events"><ArrowLeft className="w-4 h-4 mr-1" />Événements</Link></Button>
      <header className="space-y-2">
        <p className="eyebrow">Organisateur</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Nouvel <em className="font-semibold italic text-pink">événement</em></h1>
      </header>
      <StickerCard className="gap-4 p-6">
        <FormField label="Titre" required><Input placeholder="Soirée ado sans alcool" required /></FormField>
        <FormField label="Date"><Input type="date" /></FormField>
        <FormField label="Lieu"><Input placeholder="Adresse / salle" /></FormField>
        <FormField label="Capacité"><Input type="number" placeholder="200" /></FormField>
        <Button variant="pink" disabled title="Bientôt disponible"><CalendarPlus className="w-4 h-4 mr-2" />Soumettre (bientôt)</Button>
        <p className="text-sm text-mute">La création d'événement par les partenaires arrive bientôt — ton espace sera notifié dès l'ouverture.</p>
      </StickerCard>
    </div>
  )
}
