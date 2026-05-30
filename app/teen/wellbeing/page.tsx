import type { Metadata } from "next"
import { Niv } from "@/components/brand/niv"
import { Card } from "@/components/ui/card"
import { Moon, Heart, Wind } from "lucide-react"

export const metadata: Metadata = { title: "Bien-être" }

// Refonte V1.5 (#105) — espace bien-être (différé au canon §19.4). Page charte
// avec le ton "calm" de Niv ; contenu enrichi ultérieurement.
export default function TeenWellbeingPage() {
  return (
    <div className="space-y-8 pt-6">
      <header className="space-y-2">
        <p className="eyebrow">Bien-être</p>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Prends soin de <span className="text-pink italic">toi</span>
        </h1>
        <p className="text-mute max-w-md">Respire, dors, équilibre. Niv veille sur ton rythme.</p>
      </header>

      <Card className="items-center text-center py-12">
        <Niv size={110} mood="calm" float />
        <p className="text-mute max-w-sm mt-4">Cet espace s'enrichira bientôt de routines et de rappels doux.</p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="gap-2"><div className="px-6 flex items-center gap-2 text-ink font-bold"><Moon className="w-4 h-4 text-teal" />Sommeil</div><p className="px-6 text-sm text-mute">Quiet hours 22h–7h activées.</p></Card>
        <Card className="gap-2"><div className="px-6 flex items-center gap-2 text-ink font-bold"><Wind className="w-4 h-4 text-lime" />Respiration</div><p className="px-6 text-sm text-mute">Pauses guidées à venir.</p></Card>
        <Card className="gap-2"><div className="px-6 flex items-center gap-2 text-ink font-bold"><Heart className="w-4 h-4 text-pink" />Équilibre</div><p className="px-6 text-sm text-mute">Pas de pression sur les streaks.</p></Card>
      </div>
    </div>
  )
}
