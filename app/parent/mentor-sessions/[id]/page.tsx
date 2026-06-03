import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
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
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"
import { DarkSurface, NivCoach } from "@/components/brand"
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
  const status = statusLabel(session.status)

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-3xl">
      <Button variant="ghost" asChild className="text-mute hover:text-ink">
        <Link href="/parent/mentor-sessions">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Toutes les sessions
        </Link>
      </Button>

      {/* Bloc décision remonté en haut : coût hero + actions */}
      {isPending ? (
        <DarkSurface tone="coral" shadow className="p-6">
          <p className="eyebrow tracking-[0.16em] text-paper/60">Décision à prendre</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-display text-[40px] font-extrabold leading-none tabular-nums text-coral">
                {session.is_intro ? "Gratuit" : `${session.amount_dh ?? 0}`}
                {!session.is_intro && (
                  <span className="ml-1.5 font-mono text-base font-medium text-paper/60">DH</span>
                )}
              </p>
              {!session.is_intro && session.amount_coins ? (
                <p className="mt-1 font-mono text-sm text-coral">
                  ⊙ {session.amount_coins} coins débités du teen
                </p>
              ) : null}
            </div>
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
              <p className="text-xs text-gold">
                Le teen doit reprendre la réservation et cocher la case de consentement avant
                que tu puisses approuver.
              </p>
            )}
          </div>
        </DarkSurface>
      ) : (
        <StickerCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow text-mute">Statut</p>
              <p className="mt-1 text-sm text-ink-2">
                Cette session n&apos;est plus en attente d&apos;approbation.
              </p>
            </div>
            <StatusBadge variant={status.variant} label={status.text} />
          </div>
        </StickerCard>
      )}

      {/* En-tête mentor */}
      <StickerCard className="p-5">
        <p className="eyebrow mb-3 text-mute">Mentor</p>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {mentorProfile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mentorProfile.avatar_url}
                alt={mentorName}
                className="h-16 w-16 rounded-full border-2 border-ink object-cover"
              />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-ink bg-paper">
                <GraduationCap className="h-8 w-8 text-mute" />
              </div>
            )}
            <div>
              <p className="font-display text-xl font-bold text-ink">{mentorName}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {session.is_intro && (
                  <StatusBadge variant="success" icon={Sparkles} label="Intro gratuite" size="sm" />
                )}
                {mentor?.rating !== null && mentor?.rating !== undefined && (
                  <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-gold/20 px-2 py-0.5 font-mono text-xs font-bold text-ink">
                    <Star className="h-3 w-3 text-gold" aria-hidden="true" />
                    {Number(mentor.rating).toFixed(2)}
                  </span>
                )}
                {mentor?.sessions_count !== undefined && (
                  <span className="font-mono text-xs text-mute">{mentor.sessions_count} sessions</span>
                )}
              </div>
            </div>
          </div>
          {!isPending && <StatusBadge variant={status.variant} label={status.text} size="sm" />}
        </div>

        {mentor?.bio && (
          <p className="mt-4 text-sm leading-relaxed text-mute">{mentor.bio}</p>
        )}

        {mentor?.expertise_tags && mentor.expertise_tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {mentor.expertise_tags.map((tag: string) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-paper px-2.5 py-0.5 font-mono text-xs text-ink-2"
              >
                <Tag className="h-3 w-3" aria-hidden="true" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </StickerCard>

      {/* Détails en mini-cartes sticker 2 colonnes */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InfoCard icon={User} label="Teen" value={teenName} />
        <InfoCard icon={Calendar} label="Date prévue" value={formatDate(session.scheduled_for)} />
        <InfoCard icon={Clock} label="Durée" value={`${session.duration_minutes} min`} />
        <InfoCard
          icon={Wallet}
          label="Coût"
          value={
            session.is_intro
              ? "Gratuit (intro)"
              : `${session.amount_dh ?? 0} DH${
                  session.amount_coins ? ` · ⊙ ${session.amount_coins}` : ""
                }`
          }
        />
        {session.meeting_provider && (
          <InfoCard icon={Video} label="Plateforme" value={session.meeting_provider} />
        )}
        {mentor?.years_experience !== null && mentor?.years_experience !== undefined && (
          <InfoCard
            icon={GraduationCap}
            label="Expérience"
            value={`${mentor.years_experience} an${mentor.years_experience > 1 ? "s" : ""}`}
          />
        )}
      </div>

      {session.notes && (
        <StickerCard className="p-4">
          <p className="eyebrow text-mute">Notes</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink-2">{session.notes}</p>
        </StickerCard>
      )}

      {/* Consentement enregistrement + coach Niv */}
      {isPending ? (
        <div className="space-y-4">
          {teenConsentedToRecording ? (
            <div className="flex items-start gap-2 rounded-xl border-2 border-teal/40 bg-teal/10 p-4 text-sm text-teal">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
              <span>
                {teenName} a accepté l&apos;enregistrement de la session pour raisons de
                sécurité (conservation 90 jours, accès réservé aux participants et aux
                administrateurs).
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-xl border-2 border-gold/40 bg-gold/10 p-4 text-sm text-gold">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span>
                {teenName} n&apos;a pas accepté l&apos;enregistrement. L&apos;approbation est
                bloquée tant que le consentement n&apos;est pas donné par le teen lors de la
                réservation.
              </span>
            </div>
          )}

          <NivCoach
            mood="calm"
            tone="paper"
            message="Vérifie l'identité du mentor avant de valider, akhouya."
          />

          <p className="text-sm text-mute">
            {session.is_intro
              ? "Cette session d'intro est gratuite. Approuver autorisera le mentor à rejoindre."
              : `Approuver débitera ${session.amount_coins ?? 0} coins du teen et autorisera la session.`}
          </p>
        </div>
      ) : (
        <StickerCard className="p-4">
          <div className="flex items-center gap-3">
            <StatusBadge variant="success" label="Traitée" icon={ShieldCheck} size="sm" />
            <p className="text-sm text-mute">
              Cette session n&apos;est plus en attente d&apos;approbation.
            </p>
          </div>
        </StickerCard>
      )}
    </div>
  )
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <StickerCard className="p-4">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-mute" />
        <div className="min-w-0">
          <p className="eyebrow text-[10px] text-mute">{label}</p>
          <p className="mt-0.5 font-mono text-sm text-ink-2">{value}</p>
        </div>
      </div>
    </StickerCard>
  )
}
