import type { Metadata } from "next"
import Link from "next/link"
import { Niv } from "@/components/brand/niv"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Cake, MapPin, Sparkles } from "lucide-react"

export const metadata: Metadata = { title: "Mon anniversaire" }

// Refonte V1.5 (#105) — réservation d'anniversaire côté ado (packs venue/food).
// Entrée vers le flow /anniversaires.
export default function TeenBirthdayPage() {
  return (
    <div className="space-y-8 pt-6">
      <header className="space-y-2">
        <p className="eyebrow">Lifestyle</p>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Organise ton <span className="text-pink italic">anniversaire</span>
        </h1>
        <p className="text-mute max-w-md">Réserve un lieu, un pack food et invite ton crew.</p>
      </header>

      <Card className="bg-[linear-gradient(135deg,var(--night-2),var(--night))] border-ink items-center text-center py-12">
        <Niv size={120} mood="hype" float />
        <h2 className="text-2xl font-black text-paper mt-4">Ton jour, en grand 🎉</h2>
        <p className="text-paper/70 max-w-sm mt-2 mb-6">
          Choisis un pack chez nos lieux et restos partenaires, paie en coins, et invite tes amis.
        </p>
        <Button asChild variant="pink">
          <Link href="/anniversaires"><Cake className="w-4 h-4 mr-2" />Découvrir les packs</Link>
        </Button>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="gap-2"><div className="px-6 flex items-center gap-2 text-ink font-bold"><MapPin className="w-4 h-4 text-teal" />Lieux partenaires</div><p className="px-6 text-sm text-mute">Salles, lounges et cafés validés.</p></Card>
        <Card className="gap-2"><div className="px-6 flex items-center gap-2 text-ink font-bold"><Sparkles className="w-4 h-4 text-gold" />Packs clé en main</div><p className="px-6 text-sm text-mute">Déco, food et animations incluses.</p></Card>
      </div>
    </div>
  )
}
