import type { Metadata } from "next"
import Link from "next/link"
import { NivEmpty } from "@/components/brand"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { GraduationCap, Star } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Tuteurs & profs" }

// Refonte V2 (#158) — annuaire des tuteurs (centres education / tutoring_slots).
// Lit les partenaires de type education s'ils existent ; sinon état vide honnête.
export default async function TutorsPage() {
  let tutors: { id: string; company_name: string }[] = []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("partners")
      .select("id, company_name")
      .eq("partner_type", "education")
      .eq("status", "active")
      .limit(24)
    tutors = data ?? []
  } catch {
    tutors = []
  }

  return (
    <div className="space-y-8 pt-6">
      <header className="space-y-2">
        <p className="eyebrow tracking-[0.16em]">École & XP</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Trouve un <em className="font-semibold italic text-pink">tuteur</em>
        </h1>
        <p className="text-mute max-w-md">Centres et profs partenaires près de chez toi.</p>
      </header>

      {tutors.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tutors.map((t) => (
            <StickerCard key={t.id} className="gap-3 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-teal/15">
                  <GraduationCap className="h-6 w-6 text-ink" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-display font-bold leading-tight text-ink">{t.company_name}</h3>
                </div>
              </div>
              <div className="flex items-center gap-1 font-mono text-sm font-bold text-gold">
                <Star className="h-4 w-4 fill-gold" /> Partenaire vérifié
              </div>
            </StickerCard>
          ))}
        </div>
      ) : (
        <NivEmpty
          mood="calm"
          title="Bientôt des tuteurs près de toi"
          description="On recrute des centres et profs partenaires. Reviens vite !"
          action={
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/teen/aide-scolaire">Retour à l'aide scolaire</Link>
            </Button>
          }
        />
      )}
    </div>
  )
}
