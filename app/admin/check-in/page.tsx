import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CheckInInterface } from "@/components/check-in-interface"
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
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        <div className="max-w-6xl mx-auto">
          <BackButton href="/admin" label="Retour au dashboard" />

          <div className="mb-8">
            <h1 className="text-4xl font-black text-white mb-2">Check-in securise</h1>
            <p className="text-zinc-400">
              Scannez les QR codes pour l'entree et la sortie des participants
            </p>
          </div>

          {events && events.length > 0 ? (
            <CheckInInterface events={events} adminId={user.id} />
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-zinc-800 flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-zinc-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Aucun evenement a venir
              </h2>
              <p className="text-zinc-400 max-w-md mx-auto">
                Il n'y a pas d'evenements programmes pour les 7 prochains jours.
                Le check-in sera disponible lorsqu'un evenement sera proche.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
