import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import {
  CalendarCheck,
  CheckCircle2,
  Star,
  ShieldAlert,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { Niv, StatHero, NivCoach, NivEmpty } from "@/components/brand"

export default async function MentorDashboard() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "mentor") redirect("/auth/redirect")

  const supabase = await createClient()
  const mentorId = userInfo.mentorData?.id

  if (!mentorId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <StickerCard className="max-w-lg items-center gap-4 p-8 text-center">
          <span className="grid size-16 place-items-center rounded-2xl border-2 border-ink bg-paper-2">
            <ShieldAlert className="size-8 text-gold" aria-hidden="true" />
          </span>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
            Ton profil mentor n&apos;est pas encore prêt
          </h1>
          <p className="text-mute">
            Ton compte a bien le rôle mentor, mais ta fiche n&apos;est pas encore
            créée. Complète ton profil pour démarrer, akhouya.
          </p>
          <Button asChild variant="pink">
            <Link href="/mentor/profile/edit">Compléter mon profil</Link>
          </Button>
        </StickerCard>
      </div>
    )
  }

  const nowIso = new Date().toISOString()

  const [{ data: upcomingRaw }, { data: completedRaw }, { count: deniedCount }] = await Promise.all([
    supabase
      .from("mentor_sessions")
      .select("id, status, scheduled_for, amount_dh, rating_by_mentee")
      .eq("mentor_id", mentorId)
      .in("status", ["approved", "dispatched"])
      .gte("scheduled_for", nowIso)
      .order("scheduled_for", { ascending: true }),
    supabase
      .from("mentor_sessions")
      .select("id, amount_dh, rating_by_mentee, completed_at, scheduled_for, duration_minutes")
      .eq("mentor_id", mentorId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(500),
    supabase
      .from("mentor_sessions")
      .select("id", { count: "exact", head: true })
      .eq("mentor_id", mentorId)
      .eq("status", "denied"),
  ])

  const upcoming = upcomingRaw ?? []
  const completed = completedRaw ?? []

  const upcomingCount = upcoming.length
  const completedCount = completed.length
  const totalEarningsDh = Math.round(
    completed.reduce((s, r) => s + Number(r.amount_dh || 0), 0),
  )

  const ratings = completed
    .map((r) => Number(r.rating_by_mentee))
    .filter((n) => Number.isFinite(n) && n > 0)
  const avgRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
      : null

  const kpis = [
    {
      label: "Sessions à venir",
      value: upcomingCount,
      icon: CalendarCheck,
      accent: "text-pink",
      sub: upcoming[0]?.scheduled_for
        ? `Prochaine : ${new Date(upcoming[0].scheduled_for).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`
        : "Aucune programmée",
    },
    {
      label: "Sessions terminées",
      value: completedCount,
      icon: CheckCircle2,
      accent: "text-lime",
      sub: `${userInfo.mentorData?.sessionsCount ?? completedCount} au total`,
    },
    {
      label: "Note moyenne",
      value: avgRating != null ? `${avgRating} / 5` : "—",
      icon: Star,
      accent: "text-gold",
      sub: ratings.length > 0 ? `${ratings.length} évaluations` : "Aucune évaluation",
    },
  ]

  const status = userInfo.mentorData?.status || "pending"
  const kyc = userInfo.mentorData?.kycStatus || "pending"
  const statusFr: Record<string, string> = {
    active: "Actif",
    pending: "En attente",
    suspended: "Suspendu",
    denied: "Refusé",
  }
  const kycFr: Record<string, string> = {
    approved: "Vérifié",
    pending: "En cours",
    rejected: "Refusé",
  }
  const statusLabel = statusFr[status] ?? status
  const kycLabel = kycFr[kyc] ?? kyc

  return (
    <div className="min-h-screen bg-background text-ink -m-4 md:-m-8 lg:-m-10 p-4 md:p-8 lg:p-10 -mt-24 pt-24">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Hero éditorial */}
        <header className="flex flex-col gap-6 border-b border-ink pb-10 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-4">
            <Niv mood="proud" size={84} className="hidden shrink-0 sm:block" />
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="eyebrow tracking-[0.16em] text-pink">Espace mentor</span>
                {status !== "active" && (
                  <span className="rounded-full border-2 border-ink bg-gold/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-gold">
                    {statusLabel}
                  </span>
                )}
                {kyc !== "approved" && (
                  <span className="rounded-full border-2 border-ink bg-coral/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-coral">
                    KYC {kycLabel}
                  </span>
                )}
              </div>
              <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-ink md:text-5xl">
                Ton <em className="font-semibold italic text-pink">impact</em>, en un coup d&apos;œil
              </h1>
              <p className="mt-2 text-mute">
                Tes sessions, tes revenus, tes mentees. Tout est là, akhouya.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/mentor/sessions">
                Voir mes sessions
                <ArrowRight className="ml-2 size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="pink">
              <Link href="/mentor/profile/edit">Modifier mon profil</Link>
            </Button>
          </div>
        </header>

        {/* Hiérarchie 1-2-3 : revenus dominants + KPI secondaires */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <StatHero
            eyebrow="Revenus totaux"
            value={totalEarningsDh.toLocaleString("fr-FR")}
            unit="DH"
            tone="coral"
            size="lg"
            meta="Sessions terminées uniquement"
            className="lg:col-span-1 lg:row-span-1"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-2">
            {kpis.map((kpi) => (
              <StickerCard key={kpi.label} className="gap-3 p-5">
                <span className="grid size-11 place-items-center rounded-xl border-2 border-ink bg-paper-2">
                  <kpi.icon className={`size-5 ${kpi.accent}`} aria-hidden="true" />
                </span>
                <div>
                  <p className="eyebrow tracking-[0.14em]">{kpi.label}</p>
                  <p className="mt-1 font-display text-3xl font-extrabold tabular-nums tracking-tight text-ink">
                    {kpi.value}
                  </p>
                  <p className="mt-1 text-xs text-mute">{kpi.sub}</p>
                </div>
              </StickerCard>
            ))}
          </div>
        </div>

        {/* Coach Niv */}
        <NivCoach
          mood="proud"
          message="Garde tes créneaux à jour et réponds vite aux demandes : c'est ce qui fait grimper tes bookings, coach."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <StickerCard className="gap-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-extrabold tracking-tight">Prochaines sessions</h2>
              <Link
                href="/mentor/sessions?status=approved"
                className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-mute transition-colors hover:text-ink"
              >
                Tout voir
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <NivEmpty
                title="Aucune session à venir"
                description="Dès qu'un teen te réserve, ça s'affiche ici. En attendant, soigne ton profil."
              />
            ) : (
              <ul className="space-y-3">
                {upcoming.slice(0, 5).map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border-2 border-line bg-paper-2 p-3"
                  >
                    <div>
                      <p className="font-mono text-sm font-bold text-ink">
                        {new Date(s.scheduled_for).toLocaleString("fr-FR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-mute">
                        {Number(s.amount_dh) > 0 ? `${s.amount_dh} DH` : "Intro gratuite"}
                      </p>
                    </div>
                    <span className="rounded-full border-2 border-ink bg-lime/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-lime">
                      À venir
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </StickerCard>

          <StickerCard className="gap-4 p-6">
            <h2 className="font-display text-xl font-extrabold tracking-tight">État du compte</h2>
            <div className="flex flex-wrap gap-2">
              <Tag label="Statut" value={statusLabel} />
              <Tag label="KYC" value={kycLabel} />
              <Tag label="Sessions refusées" value={String(deniedCount ?? 0)} />
              <Tag label="Note moyenne" value={avgRating != null ? `${avgRating} / 5` : "—"} />
            </div>
            {userInfo.mentorData?.expertiseTags?.length ? (
              <div>
                <p className="eyebrow tracking-[0.14em]">Expertises</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {userInfo.mentorData.expertiseTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border-2 border-ink bg-white px-3 py-1 font-mono text-xs font-bold text-ink"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </StickerCard>
        </div>
      </div>
    </div>
  )
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border-2 border-line bg-paper-2 px-3 py-2">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-mute">{label}</p>
      <p className="mt-0.5 font-display text-sm font-extrabold text-ink">{value || "—"}</p>
    </div>
  )
}
