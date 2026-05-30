import type { Metadata } from "next"
import { Niv } from "@/components/brand/niv"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Store } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Partenaires" }

const TYPE_LABEL: Record<string, string> = {
  retail: "Boutique", venue: "Lieu", club: "Club", education: "École",
  food: "Resto", event_talent: "DJ", event_organizer: "Événement",
}

// Refonte V1.5 (#104) — annuaire unifié des partenaires côté ado
// (partner-ecosystem §7.4). Lit la table partners (actifs).
export default async function TeenPartenairesPage() {
  let partners: { id: string; company_name: string; partner_type?: string; city?: string }[] = []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("partners")
      .select("id, company_name, partner_type, city")
      .eq("status", "active")
      .limit(48)
    partners = data ?? []
  } catch {
    partners = []
  }

  return (
    <div className="space-y-8 pt-6">
      <header className="space-y-2">
        <p className="eyebrow">Écosystème</p>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Nos <span className="text-pink italic">partenaires</span>
        </h1>
        <p className="text-mute max-w-md">Boutiques, lieux, clubs, restos & profs qui acceptent ta carte Nivy.</p>
      </header>

      {partners.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((p) => (
            <Card key={p.id} className="gap-2">
              <div className="flex items-center gap-3 px-6">
                <div className="w-11 h-11 rounded-2xl border-2 border-ink bg-accent-soft flex items-center justify-center">
                  <Store className="w-5 h-5 text-ink" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-ink leading-tight truncate">{p.company_name}</h3>
                  {p.city && <p className="text-mute text-xs flex items-center gap-1"><MapPin className="w-3 h-3" />{p.city}</p>}
                </div>
              </div>
              {p.partner_type && (
                <div className="px-6"><Badge variant="outline">{TYPE_LABEL[p.partner_type] || p.partner_type}</Badge></div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="items-center text-center py-16">
          <Niv size={88} mood="happy" />
          <h3 className="text-xl font-black text-ink mt-4 mb-2">Bientôt plein de partenaires</h3>
          <p className="text-mute max-w-sm">On signe de nouveaux partenaires chaque semaine.</p>
        </Card>
      )}
    </div>
  )
}
