import type { Metadata } from "next"
import Link from "next/link"
import { Niv } from "@/components/brand/niv"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Gift, Users, Banknote } from "lucide-react"

export const metadata: Metadata = { title: "Parrainage parent" }

// Refonte V1.5 (#106) — parent-aussi-ambassadeur (commission de parrainage, spec §12).
export default function ParentAmbassadorPage() {
  return (
    <div className="space-y-8 pt-6 max-w-2xl">
      <header className="space-y-2">
        <p className="eyebrow">Programme</p>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Deviens <span className="text-pink italic">ambassadeur</span>
        </h1>
        <p className="text-mute">Parraine d'autres familles et gagne une commission en DH.</p>
      </header>

      <Card className="bg-[linear-gradient(135deg,var(--night-2),var(--night))] border-ink flex-row items-center gap-5 px-6 py-6">
        <Niv size={84} mood="proud" />
        <div className="text-paper">
          <h2 className="text-xl font-black">10% de commission</h2>
          <p className="text-paper/70 text-sm">sur les recharges de tes filleuls, retirable dès 500 DH.</p>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="gap-1"><div className="px-6 flex items-center gap-2 text-ink font-bold"><Users className="w-4 h-4 text-teal" />Parraine</div><p className="px-6 text-sm text-mute">Partage ton lien aux familles.</p></Card>
        <Card className="gap-1"><div className="px-6 flex items-center gap-2 text-ink font-bold"><Gift className="w-4 h-4 text-pink" />Ils s'inscrivent</div><p className="px-6 text-sm text-mute">Attribution automatique.</p></Card>
        <Card className="gap-1"><div className="px-6 flex items-center gap-2 text-ink font-bold"><Banknote className="w-4 h-4 text-lime" />Tu encaisses</div><p className="px-6 text-sm text-mute">Commission mensuelle.</p></Card>
      </div>

      <Button asChild variant="pink"><Link href="/devenir-ambassadeur">Rejoindre le programme →</Link></Button>
    </div>
  )
}
