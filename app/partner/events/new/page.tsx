import type { Metadata } from "next"
import Link from "next/link"
import { Card } from "@/components/ui/card"
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
        <h1 className="text-4xl font-extrabold tracking-tight">Nouvel <span className="text-pink italic">événement</span></h1>
      </header>
      <Card className="p-6">
        <div className="px-6 space-y-4">
          <FormField label="Titre" required><Input placeholder="Soirée ado sans alcool" required /></FormField>
          <FormField label="Date"><Input type="date" /></FormField>
          <FormField label="Lieu"><Input placeholder="Adresse / salle" /></FormField>
          <FormField label="Capacité"><Input type="number" placeholder="200" /></FormField>
          <Button variant="pink"><CalendarPlus className="w-4 h-4 mr-2" />Soumettre à modération</Button>
        </div>
      </Card>
    </div>
  )
}
