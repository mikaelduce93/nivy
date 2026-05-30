import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"
import { DarkSurface, StatHero, NivCoach, NivEmpty } from "@/components/brand"
import {
  Users,
  ArrowLeft,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"

async function getAmbassadorReferrals(profileId: string) {
  const supabase = await createClient()

  // #29 — ambassadors is keyed on user_id; totals are no longer stored on the
  // row (commission_pct lives there, counts are recomputed from source tables).
  const { data: ambassador } = await supabase
    .from("ambassadors")
    .select("id, commission_pct")
    .eq("user_id", profileId)
    .maybeSingle()

  if (!ambassador) return { referrals: [], stats: null }

  // #29/#33 — referral_attribution is the canonical ambassador→filleul link
  // (keyed on ambassador_id). referral_uses/referral_usage carry no
  // ambassador_id; #67 will consolidate the two referral systems.
  const { data: attributions, error } = await supabase
    .from("referral_attribution")
    .select("id, referred_user_id, attributed_at")
    .eq("ambassador_id", ambassador.id)
    .order("attributed_at", { ascending: false })

  if (error) {
    console.error("Error fetching referrals:", error)
    return { referrals: [], stats: { totalReferrals: 0, totalEarnings: 0 } }
  }

  const rows = attributions || []

  // Resolve filleul profiles + per-filleul commission totals.
  const referredIds = [...new Set(rows.map((r) => r.referred_user_id).filter(Boolean))]
  const profileById = new Map<string, { full_name: string; email: string; role: string }>()
  const earningsByUser = new Map<string, number>()
  let totalEarnings = 0

  if (referredIds.length > 0) {
    const [{ data: profs }, { data: commissions }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, role").in("id", referredIds),
      supabase
        .from("ambassador_commissions")
        .select("referred_user_id, amount_dh")
        .eq("ambassador_id", ambassador.id),
    ])
    for (const p of profs || []) {
      profileById.set(p.id, {
        full_name: p.full_name || "Utilisateur",
        email: p.email || "",
        role: p.role || "user",
      })
    }
    for (const c of commissions || []) {
      const amt = Number(c.amount_dh) || 0
      totalEarnings += amt
      if (c.referred_user_id) {
        earningsByUser.set(
          c.referred_user_id,
          (earningsByUser.get(c.referred_user_id) || 0) + amt,
        )
      }
    }
  }

  const referrals = rows.map((r) => ({
    id: r.id,
    created_at: r.attributed_at,
    // referral_attribution has no status column → an attributed filleul is active.
    status: "active" as const,
    commission_amount: earningsByUser.get(r.referred_user_id) || 0,
    user:
      profileById.get(r.referred_user_id) || { full_name: "Utilisateur", email: "", role: "user" },
  }))

  // Calculate stats
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())

  const monthlyReferrals = referrals.filter((r) => new Date(r.created_at) >= startOfMonth).length
  const weeklyReferrals = referrals.filter((r) => new Date(r.created_at) >= startOfWeek).length

  return {
    referrals,
    stats: {
      totalReferrals: referrals.length,
      totalEarnings,
      monthlyReferrals,
      weeklyReferrals,
      activeReferrals: referrals.length,
    },
  }
}

export default async function AmbassadorReferralsPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "ambassador") {
    redirect("/auth/redirect")
  }

  const { referrals, stats } = await getAmbassadorReferrals(userInfo.profileId)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return "Hier"
    if (diffDays < 7) return `Il y a ${diffDays} jours`
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`
    return formatDate(dateString)
  }

  const getStatus = (status: string | null): { variant: StatusVariant; label: string } => {
    switch (status) {
      case "active":
      case null:
      case undefined:
        return { variant: "success", label: "Actif" }
      case "pending":
        return { variant: "pending", label: "En attente" }
      case "inactive":
        return { variant: "neutral", label: "Inactif" }
      default:
        return { variant: "neutral", label: "Inconnu" }
    }
  }

  // Privacy mineurs : on masque l'email, on ne montre que prénom + initiale.
  const maskEmail = (email: string) => {
    if (!email || !email.includes("@")) return ""
    const [local, domain] = email.split("@")
    const head = local.slice(0, 2)
    return `${head}${"•".repeat(Math.max(local.length - 2, 1))}@${domain}`
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/ambassador">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header éditorial */}
        <div className="mb-8">
          <span className="eyebrow tracking-[0.16em] text-pink">Mes filleuls</span>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink">
            Ton <em className="font-semibold italic text-pink">crew</em>, tout ton réseau Nivy.
          </h1>
          <p className="mt-2 text-mute">Suis tous tes parrainages.</p>
        </div>

        {/* 3 KPI forts : Total · Actifs · Gains (surface sombre) */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StickerCard className="p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow tracking-[0.16em] text-mute">Total filleuls</span>
              <Users className="h-5 w-5 text-teal" />
            </div>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-ink">{stats?.totalReferrals || 0}</p>
          </StickerCard>

          <StickerCard className="p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow tracking-[0.16em] text-mute">Actifs</span>
              <CheckCircle className="h-5 w-5 text-lime" />
            </div>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-ink">{stats?.activeReferrals || 0}</p>
          </StickerCard>

          {/* Gains — surface sombre (argent) */}
          <DarkSurface tone="lime" shadow className="p-5">
            <span className="eyebrow tracking-[0.16em] text-paper/60">Gains DH</span>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-lime">
              {(stats?.totalEarnings || 0).toLocaleString()} <span className="font-mono text-sm text-paper/60">DH</span>
            </p>
          </DarkSurface>
        </div>

        {/* Referrals List */}
        <StickerCard className="p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold text-ink">
            <Users className="h-5 w-5 text-gold" />
            Liste des filleuls ({referrals.length})
          </h2>
          {referrals.length > 0 ? (
            <div className="space-y-3">
              {referrals.map((referral: any) => {
                const status = getStatus(referral.status)
                const userName = referral.user?.full_name || "Utilisateur"
                const userEmail = referral.user?.email || ""
                const userRole = referral.user?.role || "user"

                return (
                  <div
                    key={referral.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border-2 border-line bg-white p-5 md:flex-row md:items-center"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-pink font-display text-xl font-extrabold text-ink">
                        {userName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-extrabold text-ink">{userName}</h3>
                        {userEmail && (
                          <p className="font-mono text-xs text-mute">{maskEmail(userEmail)}</p>
                        )}
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded-full border-2 border-line px-2 py-0.5 font-mono text-[11px] text-mute">
                            {userRole === "teen" ? "Ado" : userRole === "parent" ? "Parent" : "Membre"}
                          </span>
                          <span className="font-mono text-xs text-mute">
                            Inscrit {getRelativeTime(referral.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-mono text-lg font-bold tabular-nums text-lime">
                          +{referral.commission_amount || 0} DH
                        </p>
                        <p className="font-mono text-[11px] text-mute">Commission</p>
                      </div>
                      <StatusBadge variant={status.variant} label={status.label} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <NivEmpty
              title="Pas encore de filleuls"
              description="Partage ton code de parrainage pour ramener ton premier filleul et commencer à gagner."
              action={
                <Button asChild variant="pink">
                  <Link href="/ambassador">Partager mon code</Link>
                </Button>
              }
            />
          )}
        </StickerCard>

        {/* Coach Niv — comment gagner plus */}
        <NivCoach
          className="mt-8"
          mood="happy"
          message="Plus tes filleuls sont actifs (réservations, achats), plus tu touches de commissions récurrentes. Partage ton code sur tes réseaux et autour de toi pour maximiser tes gains."
        />
      </div>
    </div>
  )
}
