import type { Metadata } from "next"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/ui/field"
import { Megaphone, Send } from "lucide-react"

export const metadata: Metadata = { title: "Broadcasts — Admin" }

// Refonte V1.5 (#107) — composer/envoyer des broadcasts push/notif (spec §16/§18).
export default function AdminBroadcastsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <header className="space-y-2">
        <p className="eyebrow">Communication</p>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Megaphone className="w-7 h-7 text-pink" /> Broadcasts
        </h1>
        <p className="text-mute">Envoie une annonce push/notification à un segment d'utilisateurs.</p>
      </header>
      <Card className="p-6 space-y-4">
        <div className="px-6 space-y-4">
          <FormField label="Titre"><Input placeholder="Nouvelle quête du jour 🔥" /></FormField>
          <FormField label="Message"><Input placeholder="Ton message..." /></FormField>
          <FormField label="Cible"><Input placeholder="Tous les ados / parents / partenaires" /></FormField>
          <Button variant="pink"><Send className="w-4 h-4 mr-2" />Envoyer le broadcast</Button>
        </div>
      </Card>
    </div>
  )
}
