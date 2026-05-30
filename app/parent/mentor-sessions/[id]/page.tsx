import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  AlertTriangle,
  Calendar,
  Clock,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  User,
  Video,
  Wallet,
} from "lucide-react"
import { MentorSessionActions } from "@/components/parent/mentor-session-row"

export const dynamic = "force-dynamic"

export default async function ParentMentorSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") redirect("/auth/redirect")

  const supabase = await createClient()

  const { data: session, error } = await supabase
    .from("mentor_sessions")
    .select(
      `id, mentor_id, mentee_user_id, scheduled_for, duration_minutes,
       meeting_url, meeting_provider, status, parent_approval_id,
       amount_dh, amount_coins, is_intro, parent_attended, recorded,
       notes, created_at, completed_at, cancelled_at`
    )
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("[parent/mentor-sessions/:id] fetch failed", error)
  }
  if (!session) notFound()

  // Verify the teen belongs to this parent (RLS should already enforce, but be explicit).
  const { data: link } = await supabase
    .from("parent_teen_links")
    .select("teen_id, profiles:teen_id (full_name, avatar_url)")
    .eq("parent_id", userInfo.profileId)
    .eq("teen_id", session.mentee_user_id)
    .maybeSingle()

  if (!link) {
    redirect("/parent/mentor-sessions")
  }

  const teenProfile = Array.isArray((link as any).profiles)
    ? (link as any).profiles[0]
    : (link as any).profiles
  const teenName: string = teenProfile?.full_name ?? "Teen"

  const { data: mentor } = await supabase
    .from("mentors")
    .select(
      "id, user_id, bio, expertise_tags, hourly_rate_dh, rating, sessions_count, years_experience"
    )
    .eq("id", session.mentor_id)
    .maybeSingle()

  let mentorProfile: { full_name?: string; avatar_url?: string } | null = null
  if (mentor?.user_id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", mentor.user_id)
      .maybeSingle()
    mentorProfile = prof
      ? {
          full_name: prof.full_name ?? undefined,
          avatar_url: prof.avatar_url ?? undefined,
        }
      : null
  }

  const mentorName: string = mentorProfile?.full_name ?? "Mentor"

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  const isPending = session.status === "pending_approval"

  // V1.2-A: surface the recording-consent state captured at booking time.
  // The teen flips `recorded=true` only via the explicit consent checkbox in
  // book-mentor-session-button.tsx. Parent approval is gated on it: if the
  // teen did NOT consent, the parent CANNOT approve a recorded session.
  const teenConsentedToRecording = Boolean(session.recorded)
  const consentRequired = true // policy: recording is mandatory for V1.2 mentor sessions
  const canApprove = isPending && (!consentRequired || teenConsentedToRecording)

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
  const status = statusLabel(session.status)

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-3xl">
      <Button variant="ghost" asChild className="text-mute hover:text-ink">
        <Link href="/parent/mentor-sessions">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Toutes les sessions
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {mentorProfile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mentorProfile.avatar_url}
                  alt={mentorName}
                  className="w-16 h-16 rounded-full object-cover border border-ink"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center">
                  <GraduationCap className="w-8 h-8 text-mute" />
                </div>
              )}
              <div>
                <CardTitle className="text-xl">{mentorName}</CardTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {session.is_intro && (
                    <Badge className="bg-lime/20 text-lime border-lime/30">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Intro gratuite
                    </Badge>
                  )}
                  {mentor?.rating !== null && mentor?.rating !== undefined && (
                    <span className="inline-flex items-center gap-1 text-xs text-ink-2">
                      <Star className="w-3 h-3 text-gold" />
                      {Number(mentor.rating).toFixed(2)}
                    </span>
                  )}
                  {mentor?.sessions_count !== undefined && (
                    <span className="text-xs text-mute">
                      {mentor.sessions_count} sessions
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span
              className={`text-xs px-3 py-1 rounded-full whitespace-nowrap ${status.cls}`}
            >
              {status.text}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {mentor?.bio && (
            <p className="text-sm text-mute leading-relaxed">{mentor.bio}</p>
          )}

          {mentor?.expertise_tags && mentor.expertise_tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {mentor.expertise_tags.map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InfoRow icon={User} label="Teen" value={teenName} />
            <InfoRow
              icon={Calendar}
              label="Date prévue"
              value={formatDate(session.scheduled_for)}
            />
            <InfoRow
              icon={Clock}
              label="Durée"
              value={`${session.duration_minutes} min`}
            />
            <InfoRow
              icon={Wallet}
              label="Coût"
              value={
                session.is_intro
                  ? "Gratuit (intro)"
                  : `${session.amount_dh ?? 0} DH${
                      session.amount_coins ? ` · ${session.amount_coins} coins` : ""
                    }`
              }
            />
            {session.meeting_provider && (
              <InfoRow
                icon={Video}
                label="Plateforme"
                value={session.meeting_provider}
              />
            )}
            {mentor?.years_experience !== null && mentor?.years_experience !== undefined && (
              <InfoRow
                icon={GraduationCap}
                label="Expérience"
                value={`${mentor.years_experience} an${mentor.years_experience > 1 ? "s" : ""}`}
              />
            )}
          </div>

          {session.notes && (
            <div className="p-4 rounded-md bg-card border border-ink">
              <p className="text-xs text-mute uppercase tracking-wider font-bold mb-1">
                Notes
              </p>
              <p className="text-sm text-ink-2 whitespace-pre-wrap">
                {session.notes}
              </p>
            </div>
          )}

          {isPending ? (
            <div className="pt-4 border-t border-ink space-y-4">
              {/* V1.2-A: recording-consent surface. */}
              {teenConsentedToRecording ? (
                <div className="rounded-md border border-teal/30 bg-teal/10 p-3 flex gap-2 items-start text-sm text-teal">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-teal" />
                  <span>
                    {teenName} a accepté l&apos;enregistrement de la session
                    pour raisons de sécurité (conservation 90 jours, accès
                    réservé aux participants et aux administrateurs).
                  </span>
                </div>
              ) : (
                <div className="rounded-md border border-gold/30 bg-gold/10 p-3 flex gap-2 items-start text-sm text-gold">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-gold" />
                  <span>
                    {teenName} n&apos;a pas accepté l&apos;enregistrement.
                    L&apos;approbation est bloquée tant que le consentement
                    n&apos;est pas donné par le teen lors de la réservation.
                  </span>
                </div>
              )}

              <p className="text-sm text-mute">
                {session.is_intro
                  ? "Cette session d'intro est gratuite. Approuver autorisera le mentor à rejoindre."
                  : `Approuver débitera ${session.amount_coins ?? 0} coins du teen et autorisera la session.`}
              </p>
              {canApprove ? (
                <MentorSessionActions
                  sessionId={session.id}
                  mentorName={mentorName}
                  teenName={teenName}
                  amountDh={session.amount_dh ?? undefined}
                  amountCoins={session.amount_coins ?? undefined}
                  isIntro={session.is_intro}
                />
              ) : (
                <p className="text-xs text-gold/80">
                  Le teen doit reprendre la réservation et cocher la case de
                  consentement avant que tu puisses approuver.
                </p>
              )}
            </div>
          ) : (
            <div className="pt-4 border-t border-ink text-sm text-mute">
              Cette session n&apos;est plus en attente d&apos;approbation.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-md bg-card border border-ink">
      <Icon className="w-4 h-4 text-mute mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-[10px] uppercase tracking-wider text-mute font-bold">
          {label}
        </p>
        <p className="text-sm text-ink-2">{value}</p>
      </div>
    </div>
  )
}
