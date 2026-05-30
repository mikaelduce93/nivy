import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import {
  CalendarCheck,
  CheckCircle2,
  Star,
  Wallet,
  ShieldAlert,
  Hourglass,
  ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default async function MentorDashboard() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "mentor") redirect("/auth/redirect")

  const supabase = await createClient()
  const mentorId = userInfo.mentorData?.id

  if (!mentorId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-lg text-center text-ink">
          <ShieldAlert className="w-16 h-16 mx-auto text-gold mb-4" />
          <h1 className="text-3xl font-black mb-2">Profil mentor introuvable</h1>
          <p className="text-mute mb-6">
            Votre compte a le rôle mentor mais aucune fiche dans la table <code>mentors</code>.
            Soumettez votre candidature pour démarrer.
          </p>
          <Link
            href="/mentor/profile/edit"
            className="inline-block px-6 py-3 rounded-2xl bg-white text-ink font-black"
          >
            Compléter mon profil
          </Link>
        </div>
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

  const stats = [
    {
      label: "Sessions à venir",
      value: upcomingCount,
      suffix: "",
      icon: CalendarCheck,
      color: "purple" as const,
      sub: upcoming[0]?.scheduled_for
        ? `Prochaine: ${new Date(upcoming[0].scheduled_for).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`
        : "Aucune programmée",
    },
    {
      label: "Sessions terminées",
      value: completedCount,
      suffix: "",
      icon: CheckCircle2,
      color: "emerald" as const,
      sub: `${userInfo.mentorData?.sessionsCount ?? completedCount} au total`,
    },
    {
      label: "Note moyenne",
      value: avgRating ?? 0,
      suffix: avgRating != null ? " / 5" : "",
      icon: Star,
      color: "amber" as const,
      sub: ratings.length > 0 ? `${ratings.length} évaluations` : "Aucune évaluation",
    },
    {
      label: "Revenus totaux",
      value: totalEarningsDh,
      suffix: " DH",
      icon: Wallet,
      color: "blue" as const,
      sub: "Sessions terminées uniquement",
    },
  ]

  const colorMap: Record<string, string> = {
    purple: "bg-pink/10 border-pink/20 text-pink",
    emerald: "bg-lime/10 border-lime/20 text-lime",
    amber: "bg-gold/10 border-gold/20 text-gold",
    blue: "bg-teal/10 border-teal/20 text-teal",
  }

  const status = userInfo.mentorData?.status || "pending"
  const kyc = userInfo.mentorData?.kycStatus || "pending"

  return (
    <div className="min-h-screen bg-[#030303] text-ink -m-4 md:-m-8 lg:-m-10 p-4 md:p-8 lg:p-10 -mt-24 pt-24">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-ink pb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-pink/10 text-pink text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-pink/20">
                Mentor
              </span>
              {status !== "active" && (
                <span className="px-3 py-1 bg-gold/10 text-gold text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-gold/20">
                  {status}
                </span>
              )}
              {kyc !== "approved" && (
                <span className="px-3 py-1 bg-destructive/10 text-destructive text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-destructive/20">
                  KYC {kyc}
                </span>
              )}
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
              Tableau de Bord
            </h1>
            <p className="text-mute text-lg mt-2 font-medium">
              Vos sessions, votre impact, vos revenus.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/mentor/sessions"
              className="h-12 px-6 rounded-2xl border border-ink bg-paper-2 hover:bg-paper-2 text-ink font-bold inline-flex items-center"
            >
              Voir mes sessions
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <Link
              href="/mentor/profile/edit"
              className="h-12 px-6 rounded-2xl bg-white text-ink hover:bg-paper-2 font-black inline-flex items-center"
            >
              Modifier mon profil
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-ink bg-card p-6 "
            >
              <div className="flex justify-between items-start">
                <div className={cn("p-3 rounded-2xl border", colorMap[stat.color])}>
                  <stat.icon className="w-6 h-6 stroke-[2.5px]" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-xs font-bold text-mute uppercase tracking-widest mb-1">
                  {stat.label}
                </div>
                <div className="text-4xl font-black tracking-tighter">
                  {stat.value}
                  {stat.suffix}
                </div>
                <p className="text-[11px] text-mute mt-2 font-medium">{stat.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-ink bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black">Prochaines sessions</h2>
              <Link
                href="/mentor/sessions?status=approved"
                className="text-xs font-bold text-mute hover:text-ink"
              >
                Tout voir
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-mute py-6 text-center">
                Aucune session programmée.
              </p>
            ) : (
              <ul className="space-y-3">
                {upcoming.slice(0, 5).map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-paper-2 border border-ink"
                  >
                    <div>
                      <p className="text-sm font-bold text-ink">
                        {new Date(s.scheduled_for).toLocaleString("fr-FR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      <p className="text-[11px] text-mute font-bold uppercase tracking-tight">
                        {Number(s.amount_dh) > 0 ? `${s.amount_dh} DH` : "Intro gratuite"}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-lime px-2 py-1 rounded-full border border-lime/20 bg-lime/10">
                      {s.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-ink bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black">État du compte</h2>
              <Hourglass className="w-5 h-5 text-mute" />
            </div>
            <div className="space-y-3 text-sm">
              <Row label="Statut" value={status} />
              <Row label="KYC" value={kyc} />
              <Row label="Expertises" value={userInfo.mentorData?.expertiseTags?.join(", ") || "—"} />
              <Row label="Sessions refusées" value={String(deniedCount ?? 0)} />
              <Row
                label="Note moyenne"
                value={avgRating != null ? `${avgRating} / 5` : "—"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center border-b border-ink pb-2">
      <span className="text-mute text-xs font-bold uppercase tracking-wider">{label}</span>
      <span className="text-ink text-sm font-bold">{value || "—"}</span>
    </div>
  )
}
