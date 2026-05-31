import type { Metadata } from "next"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatHero, NivEmpty } from "@/components/brand"
import { StatusBadge } from "@/components/ui/status-badge"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"

export const metadata: Metadata = { title: "Mes notes" }

// Métadonnées d'affichage des matières (icône + label FR), alignées sur
// aide-scolaire/page.tsx (SUBJECT_META). Config-only, sans dépendance BDD.
const SUBJECT_META: Record<string, { label: string; icon: string }> = {
  math: { label: "Maths", icon: "📐" },
  french: { label: "Français", icon: "📖" },
  arabic: { label: "Arabe", icon: "ع" },
  english: { label: "Anglais", icon: "🇬🇧" },
  physics: { label: "Physique", icon: "⚗️" },
  svt: { label: "SVT", icon: "🌿" },
  history: { label: "Histoire-Géo", icon: "🗺️" },
  philosophy: { label: "Philosophie", icon: "💭" },
  islamic: { label: "Éducation islamique", icon: "🕌" },
  sport: { label: "Sport", icon: "🏃" },
  art: { label: "Arts plastiques", icon: "🎨" },
  music: { label: "Musique", icon: "🎵" },
  informatique: { label: "Informatique", icon: "💻" },
}

interface Grade {
  id: string
  subject?: string
  subject_label?: string | null
  grade?: number
  max_grade?: number | null
  xp_awarded?: number | null
  validated_at?: string | null
}

// Refonte V2 (#158) — notes de l'ado (validées par prof, pas parent — cf.
// teacher-coach-xp F8). Bandeau stats StatHero (moyenne /20 + XP gold),
// chip +XP gold par note, statut de validation via <StatusBadge>.
export default async function GradesPage() {
  let grades: Grade[] = []
  try {
    const supabase = await createClient()
    const info = await getUserRole()
    const teenId = info?.teenData?.id
    if (teenId) {
      const { data } = await supabase
        .from("teen_grades")
        .select("id, subject, subject_label, grade, max_grade, xp_awarded, validated_at")
        .eq("teen_id", teenId)
        .order("created_at", { ascending: false })
        .limit(50)
      grades = data ?? []
    }
  } catch {
    grades = []
  }

  // Stats dérivées (présentation seulement).
  const totalXP = grades.reduce((sum, g) => sum + (g.xp_awarded ?? 0), 0)
  const normalized = grades
    .filter((g) => typeof g.grade === "number")
    .map((g) => (Number(g.grade) / Number(g.max_grade ?? 20)) * 20)
  const average =
    normalized.length > 0
      ? Math.round(
          (normalized.reduce((s, v) => s + v, 0) / normalized.length) * 10
        ) / 10
      : null

  return (
    <div className="space-y-8 pt-6">
      <header className="space-y-2">
        <p className="eyebrow tracking-[0.16em]">École & XP</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Mes <em className="font-semibold italic text-pink">notes</em>
        </h1>
        <p className="text-mute max-w-md">Validées par tes profs partenaires.</p>
      </header>

      {grades.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatHero
              eyebrow="Moyenne générale"
              value={average !== null ? average.toFixed(1) : "—"}
              unit="/ 20"
              tone="teal"
            />
            <StatHero
              eyebrow="XP total gagné"
              value={totalXP.toLocaleString()}
              unit="XP"
              tone="gold"
            />
          </div>

          <div className="space-y-2">
            {grades.map((g) => {
              const meta = g.subject ? SUBJECT_META[g.subject] : undefined
              const label = meta?.label ?? g.subject_label ?? g.subject ?? "Matière"
              const max = g.max_grade ?? 20
              return (
                <StickerCard key={g.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      {meta?.icon ? (
                        <span className="text-lg" aria-hidden>{meta.icon}</span>
                      ) : null}
                      <span className="truncate font-bold text-ink">{label}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      {g.xp_awarded ? (
                        <span className="font-mono text-xs font-bold text-gold">
                          +{g.xp_awarded} XP
                        </span>
                      ) : null}
                      <span className="font-mono text-xl font-bold tabular-nums text-ink">
                        {g.grade ?? "—"}
                        <span className="text-sm text-mute">/{max}</span>
                      </span>
                      <StatusBadge
                        variant={g.validated_at ? "success" : "pending"}
                        label={g.validated_at ? "Validée" : "En attente"}
                      />
                    </span>
                  </div>
                </StickerCard>
              )
            })}
          </div>
        </>
      ) : (
        <NivEmpty
          mood="calm"
          title="Aucune note pour l'instant"
          description="Tes profs valideront tes notes ici."
        />
      )}
    </div>
  )
}
