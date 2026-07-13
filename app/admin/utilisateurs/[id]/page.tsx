import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatHero } from "@/components/brand"
import { StatCard } from "@/components/admin/stat-card"
import { Button } from "@/components/ui/button"
import { UserAdminActions } from "./user-actions-client"
import { ArrowLeft, Mail, Shield, Coins, Zap, Flame } from "lucide-react"

export const metadata: Metadata = { title: "Détail utilisateur — Admin" }

export default async function AdminUserDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/admin/utilisateurs")
  }

  const { data: adminRole } = await supabase.from("admin_roles").select("*").eq("profile_id", user.id).single()

  if (!adminRole) {
    redirect("/")
  }

  // Profil + rôle admin (mêmes sources que la liste).
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, admin_roles (*)")
    .eq("id", id)
    .single()

  if (!profile) {
    notFound()
  }

  // Stats (mêmes requêtes que la liste, filtrées sur ce profil).
  // bookings est keyée sur user_id (pas de colonne parent_id en live).
  const { data: userBookings } = await supabase
    .from("bookings")
    .select("total_amount")
    .eq("user_id", id)
  const { data: linkedTeens } = await supabase
    .from("parent_teen_links")
    .select("parent_id")
    .eq("parent_id", id)

  const bookingsCount = userBookings?.length || 0
  const teensCount = linkedTeens?.length || 0
  const revenue = (userBookings || []).reduce((sum, b) => sum + (b.total_amount || 0), 0)

  // Économie — colonnes canoniques keyées sur teen_id (== profiles.id). Renvoie
  // null pour les non-ados (parents/admins) ; pas de colonne morte coins_balance.
  const [{ data: coins }, { data: xp }, { data: streak }] = await Promise.all([
    supabase.from("user_coins").select("balance").eq("teen_id", id).maybeSingle(),
    supabase.from("user_xp").select("total_xp, current_level").eq("teen_id", id).maybeSingle(),
    supabase.from("user_streaks").select("current_streak").eq("teen_id", id).maybeSingle(),
  ])
  const hasEconomy = Boolean(coins || xp || streak)

  const isAdmin = !!profile.admin_roles
  const fullName = profile.full_name || "Utilisateur"

  return (
    <div className="container mx-auto space-y-8 px-4 sm:px-6 py-8 sm:py-10">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
          <Link href="/admin/utilisateurs">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Utilisateurs
          </Link>
        </Button>
        <p className="eyebrow text-mute">Utilisateur</p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-teal/15">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={fullName}
                width={56}
                height={56}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span className="font-display text-xl font-bold text-ink">{fullName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">{fullName}</h1>
          <span
            className={`inline-flex items-center gap-1 rounded-full border-2 border-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] ${
              isAdmin ? "bg-ink text-paper" : "bg-white text-mute"
            }`}
          >
            {isAdmin && <Shield className="h-3 w-3" />}
            {isAdmin ? "Admin" : "Parent"}
          </span>
        </div>
        <p className="font-mono text-sm text-mute">ID : {id}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Identité / contact */}
          <StickerCard className="gap-3 p-6">
            <h2 className="font-display text-lg font-bold text-ink">Identité</h2>
            {profile.email && (
              <div className="flex items-center gap-3 text-mute">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${profile.email}`} className="transition-colors hover:text-ink">
                  {profile.email}
                </a>
              </div>
            )}
            <p className="text-sm text-mute">
              Inscrit le{" "}
              {profile.created_at
                ? new Date(profile.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </StickerCard>

          {/* Stats */}
          <section className="grid grid-cols-3 gap-3">
            <StatCard label="Réservations" value={bookingsCount} tone="teal" />
            <StatCard label="Ados liés" value={teensCount} tone="paper" />
            <StatCard label="Revenus" value={`${revenue} DH`} tone="lime" mono />
          </section>

          {/* Économie (ado uniquement) */}
          {hasEconomy && (
            <StickerCard className="gap-4 p-6">
              <h2 className="font-display text-lg font-bold text-ink">Économie</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="flex items-center justify-center gap-1 font-mono text-xl font-bold text-coral tabular-nums">
                    <Coins className="h-4 w-4" />⊙ {coins?.balance ?? 0}
                  </p>
                  <p className="eyebrow mt-1 text-mute">Coins</p>
                </div>
                <div>
                  <p className="flex items-center justify-center gap-1 font-mono text-xl font-bold text-gold tabular-nums">
                    <Zap className="h-4 w-4" />
                    {xp?.total_xp ?? 0}
                  </p>
                  <p className="eyebrow mt-1 text-mute">XP · niv {xp?.current_level ?? 1}</p>
                </div>
                <div>
                  <p className="flex items-center justify-center gap-1 font-mono text-xl font-bold text-pink tabular-nums">
                    <Flame className="h-4 w-4" />
                    {streak?.current_streak ?? 0}
                  </p>
                  <p className="eyebrow mt-1 text-mute">Streak</p>
                </div>
              </div>
            </StickerCard>
          )}

          {/* Conformité CNDP */}
          <StickerCard className="gap-3 p-6">
            <h2 className="font-display text-lg font-bold text-ink">Conformité (CNDP)</h2>
            <p className="text-sm text-mute">
              Export des données personnelles (DSAR) et anonymisation irréversible.
            </p>
            <UserAdminActions userId={id} userLabel={fullName} />
          </StickerCard>
        </div>

        {/* Sidebar — solde coins dominant si ado, sinon revenus générés */}
        <div className="space-y-6">
          {hasEconomy ? (
            <StatHero
              eyebrow="Solde coins"
              tone="coral"
              value={`⊙ ${(coins?.balance ?? 0).toLocaleString()}`}
              icon={<Coins className="h-5 w-5" />}
              meta={
                <span className="font-mono">
                  {(xp?.total_xp ?? 0).toLocaleString()} XP · niveau {xp?.current_level ?? 1}
                </span>
              }
            />
          ) : (
            <StatHero
              eyebrow="Revenus générés"
              tone="lime"
              value={revenue.toLocaleString()}
              unit="DH"
              meta={
                <span className="font-mono">
                  {bookingsCount} réservation{bookingsCount !== 1 ? "s" : ""}
                </span>
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
