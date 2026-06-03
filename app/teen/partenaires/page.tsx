import type { Metadata } from "next"
import Link from "next/link"
import { NivEmpty } from "@/components/brand"
import { StickerCard } from "@/components/ui/sticker-card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Store, Music, School, Utensils, ArrowRight, type LucideIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Partenaires" }

const TYPE_LABEL: Record<string, string> = {
  retail: "Boutique", venue: "Lieu", club: "Club", education: "École",
  food: "Resto", event_talent: "DJ", event_organizer: "Événement",
}

// Icône par type de partenaire (présentation seulement).
const TYPE_ICON: Record<string, LucideIcon> = {
  retail: Store, venue: MapPin, club: Music, education: School,
  food: Utensils, event_talent: Music, event_organizer: MapPin,
}

// Types acceptant le paiement en coins Nivy (lieux de consommation).
const COINS_ELIGIBLE = new Set(["retail", "food", "venue", "club"])

// Refonte V2 (#158) — annuaire unifié des partenaires côté ado
// (partner-ecosystem §7.4). Lit la table partners (actifs).
export default async function TeenPartenairesPage() {
  let partners: { id: string; company_name: string; partner_type?: string; sub_category?: string }[] = []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("partners")
      .select("id, company_name, partner_type, sub_category")
      .eq("status", "active")
      .limit(48)
    partners = data ?? []
  } catch {
    partners = []
  }

  return (
    <div className="space-y-8 pt-6">
      <header className="space-y-2">
        <p className="eyebrow tracking-[0.16em]">Écosystème</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Boutiques <em className="font-semibold italic text-pink">partenaires</em>
        </h1>
        <p className="text-mute max-w-md">
          Boutiques, lieux, clubs, restos &amp; profs partenaires. Entre dans une
          boutique pour acheter ses offres avec tes coins.
        </p>
        <p className="max-w-md text-xs text-mute">
          Tu cherches les <strong className="font-semibold text-ink">récompenses XP</strong> ?
          Elles sont dans{" "}
          <Link href="/teen/wallet?tab=shop" className="font-semibold text-pink underline-offset-2 hover:underline">
            ton wallet
          </Link>
          .
        </p>
      </header>

      {partners.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((p) => {
            const Icon = (p.partner_type && TYPE_ICON[p.partner_type]) || Store
            const acceptsCoins = !!p.partner_type && COINS_ELIGIBLE.has(p.partner_type)
            return (
              <Link
                key={p.id}
                href={`/teen/partners/${p.id}`}
                className="block rounded-2xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
                aria-label={`Ouvrir la boutique ${p.company_name}`}
              >
                <StickerCard variant="hover" className="h-full gap-3 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-accent-soft">
                      <Icon className="h-5 w-5 text-ink" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-display font-bold leading-tight text-ink">{p.company_name}</h3>
                      {p.sub_category && (
                        <p className="flex items-center gap-1 font-mono text-xs text-mute">
                          <MapPin className="h-3 w-3" />{p.sub_category}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-mute" aria-hidden />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {p.partner_type && (
                      <Badge variant="outline">{TYPE_LABEL[p.partner_type] || p.partner_type}</Badge>
                    )}
                    {acceptsCoins && (
                      <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-coral/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-ink">
                        ⊙ accepte tes coins
                      </span>
                    )}
                  </div>
                </StickerCard>
              </Link>
            )
          })}
        </div>
      ) : (
        <NivEmpty
          mood="happy"
          title="Bientôt plein de partenaires"
          description="On signe de nouveaux partenaires chaque semaine."
        />
      )}
    </div>
  )
}
