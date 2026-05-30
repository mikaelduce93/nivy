import type { Metadata } from "next"
import { Niv } from "@/components/brand/niv"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"

export const metadata: Metadata = { title: "Mes notes" }

// Refonte V1.5 (#104) — notes de l'ado (validées par prof, pas parent — cf.
// teacher-coach-xp F8). Statut de validation via <StatusBadge> (icône + label).
export default async function GradesPage() {
  let grades: { id: string; subject?: string; grade?: number; validated_at?: string | null }[] = []
  try {
    const supabase = await createClient()
    const info = await getUserRole()
    const teenId = info?.teenData?.id
    if (teenId) {
      const { data } = await supabase
        .from("teen_grades")
        .select("id, subject, grade, validated_at")
        .eq("teen_id", teenId)
        .order("created_at", { ascending: false })
        .limit(50)
      grades = data ?? []
    }
  } catch {
    grades = []
  }

  return (
    <div className="space-y-8 pt-6">
      <header className="space-y-2">
        <p className="eyebrow">Aide scolaire</p>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Mes <span className="text-pink italic">notes</span>
        </h1>
        <p className="text-mute max-w-md">Validées par tes profs partenaires.</p>
      </header>

      {grades.length > 0 ? (
        <div className="space-y-2">
          {grades.map((g) => (
            <Card key={g.id} padding="sm" className="px-5 flex-row items-center justify-between">
              <span className="font-bold text-ink">{g.subject || "Matière"}</span>
              <span className="flex items-center gap-3">
                <span className="font-display font-extrabold text-xl text-ink tabular-nums">
                  {g.grade ?? "—"}<span className="text-mute text-sm">/20</span>
                </span>
                <StatusBadge variant={g.validated_at ? "success" : "pending"} label={g.validated_at ? "Validée" : "En attente"} />
              </span>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="items-center text-center py-16">
          <Niv size={88} mood="calm" />
          <h3 className="text-xl font-black text-ink mt-4 mb-2">Aucune note pour l'instant</h3>
          <p className="text-mute max-w-sm">Tes profs valideront tes notes ici.</p>
        </Card>
      )}
    </div>
  )
}
