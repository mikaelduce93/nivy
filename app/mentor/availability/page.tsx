/**
 * Wave 3B.2 — mentor availability page (truthful empty state).
 *
 * `mentor_availability` table is not in the canonical DB yet (canon §1 row 7
 * deferred to Wave 3B.3). We render an honest "module not yet available"
 * state — never fake calendar slots.
 */
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "lucide-react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { EmptyState } from "@/components/ui/states/empty-state"

export const dynamic = "force-dynamic"

export default async function MentorAvailabilityPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "mentor") {
    return (
      <main className="space-y-6">
        <h1 className="text-3xl font-black text-ink">Mes disponibilités</h1>
        <Card className="bg-card border-ink">
          <CardContent className="p-10 text-center text-destructive">
            Accès réservé aux mentors.
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-ink flex items-center gap-3">
          <Calendar className="w-7 h-7 text-teal" />
          Mes disponibilités
        </h1>
      </header>
      <Card className="bg-card border-ink">
        <CardHeader>
          <CardTitle className="text-ink">Calendrier</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Calendar}
            title="Module en cours de mise en place"
            description="La gestion de tes créneaux récurrents (mentor_availability) sera disponible avec Wave 3B.3. En attendant, tu peux contacter ton parent partenaire pour fixer une session ad-hoc via /mentor/sessions."
            action={{ label: "Voir mes sessions", href: "/mentor/sessions" }}
          />
        </CardContent>
      </Card>
    </main>
  )
}
