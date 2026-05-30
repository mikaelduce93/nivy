import type { Metadata } from "next"
import Link from "next/link"
import { Niv } from "@/components/brand/niv"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GraduationCap, Star, MapPin } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Tuteurs & profs" }

// Refonte V1.5 (#104) — annuaire des tuteurs (centres education / tutoring_slots).
// Lit les partenaires de type education s'ils existent ; sinon état vide honnête.
export default async function TutorsPage() {
  let tutors: { id: string; company_name: string; city?: string }[] = []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("partners")
      .select("id, company_name, city")
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
        <p className="eyebrow">Aide scolaire</p>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Trouve un <span className="text-pink italic">tuteur</span>
        </h1>
        <p className="text-mute max-w-md">Centres et profs partenaires près de chez toi.</p>
      </header>

      {tutors.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tutors.map((t) => (
            <Card key={t.id} className="gap-3">
              <div className="flex items-center gap-3 px-6">
                <div className="w-12 h-12 rounded-2xl border-2 border-ink bg-info-soft flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-teal" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-ink leading-tight">{t.company_name}</h3>
                  {t.city && (
                    <p className="text-mute text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {t.city}
                    </p>
                  )}
                </div>
              </div>
              <div className="px-6 flex items-center gap-1 text-gold text-sm font-bold">
                <Star className="w-4 h-4 fill-gold" /> Partenaire vérifié
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="items-center text-center py-16">
          <Niv size={88} mood="calm" />
          <h3 className="text-xl font-black text-ink mt-4 mb-2">Bientôt des tuteurs près de toi</h3>
          <p className="text-mute max-w-sm mb-6">
            On recrute des centres et profs partenaires. Reviens vite !
          </p>
          <Button asChild variant="outline">
            <Link href="/teen/aide-scolaire">Retour à l'aide scolaire</Link>
          </Button>
        </Card>
      )}
    </div>
  )
}
