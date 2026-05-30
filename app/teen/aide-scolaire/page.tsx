import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { Suspense } from "react"
import { AideScolaireClient } from "./aide-scolaire-client"
import { createClient } from "@/lib/supabase/server"

// Subject display metadata — deterministic, no DB dependency.
// Color and icon assignments are config-only.
const SUBJECT_META: Record<string, { color: string; icon: string }> = {
  math:        { color: "from-teal to-teal",       icon: "📐" },
  french:      { color: "from-pink to-pink",     icon: "📖" },
  arabic:      { color: "from-lime to-lime",   icon: "ع" },
  english:     { color: "from-destructive to-pink",        icon: "🇬🇧" },
  physics:     { color: "from-lime to-lime",   icon: "⚗️" },
  svt:         { color: "from-teal to-teal",       icon: "🌿" },
  history:     { color: "from-gold to-coral",    icon: "🗺️" },
  philosophy:  { color: "from-pink to-pink",   icon: "💭" },
  islamic:     { color: "from-lime to-lime",   icon: "🕌" },
  sport:       { color: "from-coral to-destructive",      icon: "🏃" },
  art:         { color: "from-pink to-pink",    icon: "🎨" },
  music:       { color: "from-gold to-gold",    icon: "🎵" },
  informatique:{ color: "from-teal to-teal",        icon: "💻" },
}

export default async function AideScolairePage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  const teenId = userInfo.teenData?.id ?? userInfo.profileId

  // Fetch grades from the existing /api/teen/education/grades endpoint
  // using a direct Supabase query to avoid a self-HTTP call in RSC.
  const supabase = await createClient()

  let grades: any[] = []
  let gradeStats: {
    bySubject: Array<{
      subject: string
      label: string
      count: number
      average: number | null
    }>
  } = { bySubject: [] }

  try {
    const { data, error } = await supabase
      .from("teen_grades")
      .select("id, subject, subject_label, grade, max_grade, grade_type, term, grade_date, status, xp_awarded")
      .eq("teen_id", teenId)
      .eq("status", "approved")
      .order("grade_date", { ascending: false })
      .limit(100)

    if (!error && data) {
      grades = data

      // Compute per-subject averages
      const subjectMap: Record<
        string,
        { label: string; grades: { grade: number; maxGrade: number }[] }
      > = {}
      for (const g of data) {
        if (!subjectMap[g.subject]) {
          subjectMap[g.subject] = {
            label: g.subject_label ?? g.subject,
            grades: [],
          }
        }
        subjectMap[g.subject].grades.push({
          grade: g.grade,
          maxGrade: g.max_grade ?? 20,
        })
      }

      gradeStats.bySubject = Object.entries(subjectMap).map(([subject, info]) => {
        const avg =
          info.grades.length > 0
            ? info.grades.reduce(
                (sum, g) => sum + (g.grade / g.maxGrade) * 20,
                0
              ) / info.grades.length
            : null
        return {
          subject,
          label: info.label,
          count: info.grades.length,
          average: avg !== null ? Math.round(avg * 10) / 10 : null,
        }
      })
    }
  } catch (err) {
    console.error("AideScolaire grades fetch error:", err)
  }

  // Build subject cards from real grade data
  const subjects = gradeStats.bySubject.map((s) => {
    const meta = SUBJECT_META[s.subject] ?? {
      color: "from-paper-2 to-card",
      icon: "📚",
    }
    return {
      id: s.subject,
      name: s.label,
      icon: meta.icon,
      color: meta.color,
      average: s.average,
      gradeCount: s.count,
    }
  })

  // Total XP earned from approved grades
  const totalXP = grades.reduce((sum, g) => sum + (g.xp_awarded ?? 0), 0)

  const props = JSON.parse(
    JSON.stringify({ subjects, totalXP, gradeCount: grades.length })
  )

  return (
    <div className="min-h-screen pb-32">
      <Suspense fallback={<AideScolaireSkeleton />}>
        <AideScolaireClient {...props} />
      </Suspense>
    </div>
  )
}

function AideScolaireSkeleton() {
  return (
    <div className="space-y-8 pt-6 animate-pulse">
      <div className="h-14 bg-card rounded-2xl w-64" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-card rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-48 bg-card rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
