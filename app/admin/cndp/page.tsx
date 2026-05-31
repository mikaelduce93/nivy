import type { Metadata } from "next"
import { NivEmpty } from "@/components/brand/niv-usage"
import { StatHero, DarkSurface } from "@/components/brand/niv"
import { StickerCard } from "@/components/ui/sticker-card"
import { ShieldCheck, FileDown, Trash2, Clock } from "lucide-react"

export const metadata: Metadata = { title: "DSAR / CNDP — Admin" }

// Refonte V1.5 (#107) — file DSAR (droits CNDP : accès / effacement, spec §22).
export default function AdminCndpPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="eyebrow">Conformité · CNDP</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
          Demandes <em className="font-semibold italic text-pink">DSAR</em>
        </h1>
        <p className="text-mute">Accès et effacement (loi 09-08) à traiter sous 30 jours.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <StatHero
          eyebrow="En attente"
          value={0}
          tone="coral"
          icon={<Clock className="h-6 w-6" />}
          meta="Aucune demande dans le délai légal"
        />
        <DarkSurface tone="gold" shadow className="flex flex-col justify-center gap-2 p-5 sm:p-6">
          <span className="eyebrow tracking-[0.16em] text-paper/60">Rappel conformité</span>
          <p className="text-sm leading-snug text-paper/90">
            Loi <span className="font-mono">09-08</span> · CNDP : chaque demande doit être
            traitée sous <span className="font-mono font-semibold text-gold">30 jours</span>.
          </p>
        </DarkSurface>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <StickerCard className="gap-2 p-6">
          <div className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-teal" />
            <span className="font-display font-bold text-ink">Accès aux données</span>
          </div>
          <p className="text-sm text-mute">File des exports demandés via /account/export.</p>
        </StickerCard>
        <StickerCard className="gap-2 p-6">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-coral" />
            <span className="font-display font-bold text-ink">Effacement</span>
          </div>
          <p className="text-sm text-mute">File des suppressions demandées via /account/delete.</p>
        </StickerCard>
      </section>

      <NivEmpty
        mood="calm"
        title="Aucune demande en attente"
        description="Les demandes d'accès et d'effacement des utilisateurs apparaîtront ici, triées par échéance."
      />
    </div>
  )
}
