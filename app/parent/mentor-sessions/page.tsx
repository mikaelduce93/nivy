import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { ArrowLeft, GraduationCap, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"
import { Niv, DarkSurface, NivEmpty } from "@/components/brand"
import { MentorSessionActions } from "@/components/parent/mentor-session-row"

export const dynamic = "force-dynamic"

interface MentorSessionRow {
  id: string
  mentor_id: string
  mentee_user_id: string
  scheduled_for: string
  duration_minutes: number
  amount_dh: number | null
  amount_coins: number | null
  is_intro: boolean
  status: string
  created_at: string
}

export default async function ParentMentorSessionsPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") redirect("/auth/redirect")

  const supabase = await createClient()

  // Polish-F: capture errors from each Supabase read so the page can surface
  // a banner instead of silently rendering an empty list when RLS or the
  // network fails. Each read still degrades to [] on failure so the rest of
  // the page renders normally.
  let loadError: string | null = null

  // Get linked teens (we use this to scope sessions and to display names)
  const { data: linkRows, error: linkErr } = await supabase
    .from("parent_teen_links")
    .select("teen_id, profiles:teen_id (full_name, avatar_url)")
    .eq("parent_id", userInfo.profileId)
  if (linkErr) {
    console.error("[parent/mentor-sessions] parent_teen_links error:", linkErr)
    loadError = "Impossible de charger vos teens liés."
  }

  const teenIds = (linkRows ?? []).map((r: any) => r.teen_id)
  const teenMap = new Map<string, { full_name?: string; avatar_url?: string }>()
  for (const row of (linkRows ?? []) as any[]) {
    const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    teenMap.set(row.teen_id, {
      full_name: p?.full_name,
      avatar_url: p?.avatar_url,
    })
  }

  let sessions: MentorSessionRow[] = []
  let mentorMap = new Map<
    string,
    { user_id?: string; bio?: string; expertise_tags?: string[]; full_name?: string; avatar_url?: string }
  >()

  if (teenIds.length > 0) {
    const { data: rows, error: sessErr } = await supabase
      .from("mentor_sessions")
      .select(
        "id, mentor_id, mentee_user_id, scheduled_for, duration_minutes, amount_dh, amount_coins, is_intro, status, created_at"
      )
      .in("mentee_user_id", teenIds)
      .order("scheduled_for", { ascending: true })
      .limit(100)
    if (sessErr) {
      console.error("[parent/mentor-sessions] mentor_sessions error:", sessErr)
      loadError = loadError ?? "Impossible de charger les sessions."
    }
    sessions = (rows ?? []) as MentorSessionRow[]

    const mentorIds = Array.from(new Set(sessions.map((s) => s.mentor_id)))
    if (mentorIds.length > 0) {
      const { data: mentors } = await supabase
        .from("mentors")
        .select("id, user_id, bio, expertise_tags")
        .in("id", mentorIds)

      const mentorUserIds = (mentors ?? [])
        .map((m: any) => m.user_id)
        .filter(Boolean)

      let mentorProfiles: any[] = []
      if (mentorUserIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", mentorUserIds)
        mentorProfiles = data ?? []
      }
      const profByUser = new Map<string, any>(
        mentorProfiles.map((p: any) => [p.id, p])
      )

      for (const m of (mentors ?? []) as any[]) {
        const prof = m.user_id ? profByUser.get(m.user_id) : undefined
        mentorMap.set(m.id, {
          user_id: m.user_id ?? undefined,
          bio: m.bio ?? undefined,
          expertise_tags: m.expertise_tags ?? [],
          full_name: prof?.full_name,
          avatar_url: prof?.avatar_url,
        })
      }
    }
  }

  const pending = sessions.filter((s) => s.status === "pending_approval")
  const decided = sessions.filter((s) => s.status !== "pending_approval")

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  const statusLabel = (s: string): { text: string; variant: StatusVariant } => {
    switch (s) {
      case "pending_approval":
        return { text: "En attente", variant: "warning" }
      case "approved":
        return { text: "Approuvée", variant: "success" }
      case "denied":
        return { text: "Refusée", variant: "danger" }
      case "completed":
        return { text: "Terminée", variant: "info" }
      case "cancelled":
        return { text: "Annulée", variant: "neutral" }
      case "no_show":
        return { text: "Absent", variant: "danger" }
      case "dispatched":
        return { text: "Démarrée", variant: "info" }
      default:
        return { text: s.replace(/_/g, " "), variant: "neutral" }
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <Button variant="ghost" asChild className="text-mute hover:text-ink">
        <Link href="/parent">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au dashboard
        </Link>
      </Button>

      {/* Header éditorial */}
      <header>
        <p className="eyebrow text-pink">SUIVI · MENTORAT</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Les sessions de <em className="font-semibold italic text-pink">ton crew</em>
        </h1>
        <p className="mt-2 text-sm text-mute">
          Approuve les sessions de mentorat réservées par tes teens.
        </p>
      </header>

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {loadError}
        </div>
      )}

      {/* Bandeau compteur surface sombre quand des demandes attendent */}
      {pending.length > 0 && (
        <DarkSurface tone="gold" shadow className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow tracking-[0.16em] text-paper/60">À approuver</p>
              <p className="mt-1 font-display text-4xl font-extrabold tabular-nums text-gold">
                {pending.length}
                <span className="ml-2 align-middle font-sans text-base font-medium text-paper/70">
                  {pending.length > 1 ? "demandes attendent" : "demande attend"} ton feu vert
                </span>
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-3 border-t border-paper/15 pt-4">
            <Niv mood="proud" size={48} className="shrink-0" />
            <div>
              <span className="eyebrow tracking-[0.14em] text-pink">Niv</span>
              <p className="mt-1 text-sm text-paper/90">
                Vérifie l&apos;identité du mentor avant de valider, akhouya.
              </p>
            </div>
          </div>
        </DarkSurface>
      )}

      {/* En attente */}
      <section className="space-y-4">
        <h2 className="eyebrow text-mute">En attente d&apos;approbation</h2>
        {pending.length === 0 ? (
          <NivEmpty
            mood="happy"
            title="Walou en attente"
            description="Ton crew est sage 👌 Les nouvelles demandes de session s'afficheront ici."
          />
        ) : (
          pending.map((s) => {
            const teen = teenMap.get(s.mentee_user_id)
            const mentor = mentorMap.get(s.mentor_id)
            const mentorName = mentor?.full_name ?? "Mentor"
            return (
              <StickerCard key={s.id} className="p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {mentor?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mentor.avatar_url}
                          alt={mentorName}
                          className="h-12 w-12 rounded-full border-2 border-ink object-cover"
                        />
                      ) : (
                        <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-ink bg-paper">
                          <GraduationCap className="h-6 w-6 text-mute" />
                        </div>
                      )}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-base font-bold text-ink">{mentorName}</p>
                          {s.is_intro && (
                            <StatusBadge
                              variant="success"
                              icon={Sparkles}
                              label="Intro gratuite"
                              size="sm"
                            />
                          )}
                        </div>
                        <p className="text-xs text-mute">
                          Pour <span className="text-ink-2">{teen?.full_name ?? "Teen"}</span>
                        </p>
                        <p className="font-mono text-xs text-mute">
                          {formatDateTime(s.scheduled_for)} · {s.duration_minutes} min
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-base font-bold tabular-nums text-ink">
                        {s.is_intro ? "Gratuit" : `${s.amount_dh ?? 0} DH`}
                      </p>
                      {!s.is_intro && s.amount_coins ? (
                        <p className="font-mono text-xs text-coral">⊙ {s.amount_coins}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink/10 pt-4">
                    <Button asChild variant="ghost" size="sm" className="text-mute hover:text-ink">
                      <Link href={`/parent/mentor-sessions/${s.id}`}>Voir le détail</Link>
                    </Button>
                    <MentorSessionActions
                      sessionId={s.id}
                      mentorName={mentorName}
                      teenName={teen?.full_name ?? "Teen"}
                      amountDh={s.amount_dh ?? undefined}
                      amountCoins={s.amount_coins ?? undefined}
                      isIntro={s.is_intro}
                    />
                  </div>
                </div>
              </StickerCard>
            )
          })
        )}
      </section>

      {/* Historique */}
      <section className="space-y-3">
        <h2 className="eyebrow text-mute">Historique</h2>
        {decided.length === 0 ? (
          <NivEmpty title="Aucune session passée" description="Les sessions traitées s'afficheront ici." />
        ) : (
          decided.map((s) => {
            const teen = teenMap.get(s.mentee_user_id)
            const mentor = mentorMap.get(s.mentor_id)
            const mentorName = mentor?.full_name ?? "Mentor"
            const status = statusLabel(s.status)
            return (
              <Link key={s.id} href={`/parent/mentor-sessions/${s.id}`} className="block">
                <StickerCard variant="hover" className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {mentor?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mentor.avatar_url}
                          alt={mentorName}
                          className="h-10 w-10 rounded-full border-2 border-ink object-cover"
                        />
                      ) : (
                        <div className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-paper">
                          <GraduationCap className="h-5 w-5 text-mute" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {mentorName}
                          <span className="ml-1 text-xs text-mute">· {teen?.full_name ?? "Teen"}</span>
                        </p>
                        <p className="font-mono text-xs text-mute">
                          {formatDateTime(s.scheduled_for)} · {s.duration_minutes} min
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge variant={status.variant} label={status.text} size="sm" />
                      <span className="font-mono text-sm font-semibold tabular-nums text-ink">
                        {s.is_intro ? "Gratuit" : `${s.amount_dh ?? 0} DH`}
                      </span>
                    </div>
                  </div>
                </StickerCard>
              </Link>
            )
          })
        )}
      </section>
    </div>
  )
}
