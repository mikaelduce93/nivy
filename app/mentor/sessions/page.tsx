import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { MentorSessionsClient, type MentorSessionRow } from "./sessions-client"

const VALID_FILTERS = ["pending_approval", "approved", "completed", "denied"] as const
type Filter = (typeof VALID_FILTERS)[number]

export default async function MentorSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "mentor") redirect("/auth/redirect")

  const sp = await searchParams
  const filter: Filter =
    (VALID_FILTERS as readonly string[]).includes(sp.status ?? "")
      ? (sp.status as Filter)
      : "approved"

  const mentorId = userInfo.mentorData?.id

  let sessions: MentorSessionRow[] = []
  if (mentorId) {
    const supabase = await createClient()
    const { data } = await supabase
      .from("mentor_sessions")
      .select(`
        id, mentor_id, mentee_user_id, scheduled_for, duration_minutes,
        meeting_url, meeting_provider, status, amount_dh, amount_coins,
        is_intro, parent_attended, recorded, rating_by_mentee, rating_by_mentor,
        notes, created_at, completed_at, cancelled_at
      `)
      .eq("mentor_id", mentorId)
      .eq("status", filter)
      .order("scheduled_for", { ascending: filter === "approved" })
      .limit(200)

    sessions = (data ?? []) as MentorSessionRow[]
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white -m-4 md:-m-8 lg:-m-10 p-4 md:p-8 lg:p-10 -mt-24 pt-24">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="border-b border-white/5 pb-6">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter">Sessions</h1>
          <p className="text-zinc-400 mt-2">
            Gérez vos demandes en attente, vos rendez-vous à venir et l'historique.
          </p>
        </header>

        {!mentorId ? (
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-100">
            Profil mentor introuvable. Complétez votre fiche depuis l'écran Profil.
          </div>
        ) : (
          <MentorSessionsClient initialSessions={sessions} initialFilter={filter} />
        )}
      </div>
    </div>
  )
}
