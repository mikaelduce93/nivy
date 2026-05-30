import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Clock, GraduationCap, Eye, Sparkles } from "lucide-react"

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

  const statusLabel = (s: string) => {
    switch (s) {
      case "pending_approval":
        return { text: "En attente", cls: "bg-gold/20 text-gold" }
      case "approved":
        return { text: "Approuvée", cls: "bg-lime/20 text-lime" }
      case "denied":
        return { text: "Refusée", cls: "bg-destructive/20 text-destructive" }
      case "completed":
        return { text: "Terminée", cls: "bg-teal/20 text-teal" }
      case "cancelled":
        return { text: "Annulée", cls: "bg-muted text-mute" }
      case "no_show":
        return { text: "Absent", cls: "bg-pink/20 text-pink" }
      case "dispatched":
        return { text: "Démarrée", cls: "bg-teal/20 text-teal" }
      default:
        return { text: s, cls: "bg-muted text-mute" }
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <Button
        variant="ghost"
        asChild
        className="text-mute hover:text-ink"
      >
        <Link href="/parent">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au dashboard
        </Link>
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-lime" />
            Sessions de mentorat
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Approuvez les sessions de mentorat réservées par vos teens.
          </p>
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {loadError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gold" />
            En attente d&apos;approbation
            {pending.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {pending.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Aucune demande en attente
            </p>
          ) : (
            pending.map((s) => {
              const teen = teenMap.get(s.mentee_user_id)
              const mentor = mentorMap.get(s.mentor_id)
              return (
                <Link
                  key={s.id}
                  href={`/parent/mentor-sessions/${s.id}`}
                  className="block"
                >
                  <div className="flex items-start justify-between border rounded-md p-4 hover:border-lime/40 hover:bg-lime/5 transition-colors">
                    <div className="flex items-start gap-3">
                      {mentor?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mentor.avatar_url}
                          alt={mentor.full_name ?? "Mentor"}
                          className="w-12 h-12 rounded-full object-cover border border-ink"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center">
                          <GraduationCap className="w-6 h-6 text-mute" />
                        </div>
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">
                            {mentor?.full_name ?? "Mentor"}
                          </p>
                          {s.is_intro && (
                            <Badge className="bg-lime/20 text-lime border-lime/30">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Intro gratuite
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Pour{" "}
                          <span className="text-ink-2">
                            {teen?.full_name ?? "Teen"}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(s.scheduled_for)} · {s.duration_minutes} min
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-sm font-bold">
                        {s.is_intro
                          ? "Gratuit"
                          : `${s.amount_dh ?? 0} DH`}
                      </span>
                      {!s.is_intro && s.amount_coins ? (
                        <span className="text-xs text-mute">
                          {s.amount_coins} coins
                        </span>
                      ) : null}
                      <Eye className="w-4 h-4 text-mute" />
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {decided.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Aucune session passée.
            </p>
          ) : (
            decided.map((s) => {
              const teen = teenMap.get(s.mentee_user_id)
              const mentor = mentorMap.get(s.mentor_id)
              const status = statusLabel(s.status)
              return (
                <Link
                  key={s.id}
                  href={`/parent/mentor-sessions/${s.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between border rounded-md p-3 hover:bg-card transition-colors">
                    <div className="flex items-center gap-3">
                      {mentor?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mentor.avatar_url}
                          alt={mentor.full_name ?? "Mentor"}
                          className="w-10 h-10 rounded-full object-cover border border-ink"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-mute" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {mentor?.full_name ?? "Mentor"}{" "}
                          <span className="text-mute text-xs">
                            · {teen?.full_name ?? "Teen"}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(s.scheduled_for)} · {s.duration_minutes} min
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${status.cls}`}
                      >
                        {status.text}
                      </span>
                      <span className="text-sm font-semibold">
                        {s.is_intro ? "Gratuit" : `${s.amount_dh ?? 0} DH`}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
