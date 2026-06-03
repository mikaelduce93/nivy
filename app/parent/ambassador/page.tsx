import type { Metadata } from "next"
import Link from "next/link"
import { StatHero } from "@/components/brand"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { Gift, Users, Banknote } from "lucide-react"

export const metadata: Metadata = { title: "Parrainage parent" }

const STEPS = [
  { n: "01", icon: Users, color: "text-teal", title: "Parraine", desc: "Partage ton lien aux familles." },
  { n: "02", icon: Gift, color: "text-pink", title: "Ils s'inscrivent", desc: "Attribution automatique." },
  { n: "03", icon: Banknote, color: "text-lime", title: "Tu encaisses", desc: "Commission mensuelle." },
]

// Refonte V1.5 (#106) — parent-aussi-ambassadeur (commission de parrainage, spec §12).
export default function ParentAmbassadorPage() {
  return (
    <div className="space-y-8 pt-6 max-w-2xl">
      <header className="space-y-2">
        <p className="eyebrow">Programme</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Deviens <em className="font-semibold italic text-pink">ambassadeur</em>
        </h1>
        <p className="text-mute">Parraine d'autres familles et gagne une commission en DH.</p>
      </header>

      <StatHero
        eyebrow="Commission de parrainage"
        value="10%"
        tone="lime"
        size="lg"
        meta={<span className="font-mono">sur les recharges de tes filleuls · retirable dès 500 DH</span>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((s) => (
          <StickerCard key={s.n} className="gap-2 p-5">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-mute">{s.n}/03</p>
            <div className="flex items-center gap-2 text-ink font-bold">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              {s.title}
            </div>
            <p className="text-sm text-mute">{s.desc}</p>
          </StickerCard>
        ))}
      </div>

      <Button asChild variant="pink"><Link href="/devenir-ambassadeur">Rejoindre le programme →</Link></Button>
    </div>
  )
}
