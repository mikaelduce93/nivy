import type { Metadata } from "next"
import { Niv } from "@/components/brand/niv"
import { Card } from "@/components/ui/card"
import { ShieldCheck } from "lucide-react"

export const metadata: Metadata = { title: "DSAR / CNDP — Admin" }

// Refonte V1.5 (#107) — file DSAR (droits CNDP : accès / effacement, spec §22).
export default function AdminCndpPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="eyebrow">Conformité · CNDP</p>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-pink" /> Demandes DSAR
        </h1>
        <p className="text-mute">Demandes d'accès et d'effacement (loi 09-08) à traiter sous 30 jours.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="gap-1"><div className="px-6 font-bold text-ink">Accès aux données</div><p className="px-6 text-sm text-mute">File des exports demandés via /account/export.</p></Card>
        <Card className="gap-1"><div className="px-6 font-bold text-ink">Effacement</div><p className="px-6 text-sm text-mute">File des suppressions demandées via /account/delete.</p></Card>
      </div>
      <Card className="items-center text-center py-14">
        <Niv size={80} mood="calm" />
        <p className="text-mute mt-3 max-w-sm">Aucune demande en attente. Les demandes des utilisateurs apparaîtront ici.</p>
      </Card>
    </div>
  )
}
