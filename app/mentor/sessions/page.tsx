import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { NivEmpty } from "@/components/brand"
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
    <div className="min-h-screen bg-background text-ink -m-4 md:-m-8 lg:-m-10 p-4 md:p-8 lg:p-10 -mt-24 pt-24">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="border-b border-ink pb-6">
          <p className="eyebrow tracking-[0.16em] text-pink">Espace mentor</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Tes <em className="font-semibold italic text-pink">sessions</em>
          </h1>
          <p className="mt-2 text-mute">
            Tes demandes en attente, tes rendez-vous à venir et ton historique.
          </p>
        </header>

        {!mentorId ? (
          <NivEmpty
            mood="calm"
            title="Profil mentor introuvable"
            description="Complète ta fiche depuis l'écran Profil pour gérer tes sessions."
            action={
              <Button asChild variant="pink">
                <Link href="/mentor/profile/edit">Compléter mon profil</Link>
              </Button>
            }
          />
        ) : (
          <MentorSessionsClient initialSessions={sessions} initialFilter={filter} />
        )}
      </div>
    </div>
  )
}
