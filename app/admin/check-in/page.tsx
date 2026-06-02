import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CheckInInterface } from "@/components/check-in-interface"
import { DarkScannerShell } from "@/components/partner/dark-scanner-shell"
import { NivEmpty } from "@/components/brand"
import BackButton from "@/components/admin/BackButton"

export default async function CheckInPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/admin/check-in")
  }

  const { data: adminRole } = await supabase
    .from("admin_roles")
    .select("*")
    .eq("profile_id", user.id)
    .single()

  if (!adminRole) {
    redirect("/")
  }

  // Get today's events and upcoming events
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(today)
  endOfWeek.setDate(endOfWeek.getDate() + 7)

  const { data: events } = await supabase
    .from("events")
    .select("id, title, event_date, venue_name, capacity")
    .gte("event_date", today.toISOString())
    .lt("event_date", endOfWeek.toISOString())
    .order("event_date", { ascending: true })

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12 md:py-32">
        <div className="max-w-6xl mx-auto">
          <BackButton href="/admin" label="Retour au dashboard" />

          <header className="mb-8 space-y-2">
            <p className="eyebrow">Admin · Check-in</p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
              Check-in <em className="font-semibold italic text-pink">sécurisé</em>
            </h1>
            <p className="text-mute">
              Scannez les QR codes pour l&apos;entrée et la sortie des participants.
            </p>
          </header>

          {events && events.length > 0 ? (
            <DarkScannerShell
              eyebrow="Admin · Check-in"
              title="Scanner les"
              titleEm="participants"
              nivMood="calm"
              className="max-w-none"
            >
              <CheckInInterface events={events} adminId={user.id} />
            </DarkScannerShell>
          ) : (
            <NivEmpty
              mood="calm"
              title="Aucun event cette semaine — reviens plus tard !"
              description="Il n'y a pas d'événements programmés pour les 7 prochains jours. Le check-in sera disponible lorsqu'un événement sera proche."
            />
          )}
        </div>
      </div>
    </div>
  )
}
