import type { Metadata } from "next"
import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatHero, Niv } from "@/components/brand"
import { StatCard } from "@/components/admin/stat-card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Mail, Users, Wallet } from "lucide-react"

export const metadata: Metadata = { title: "Détail ambassadeur — Admin" }

function StatusPill({ status }: { status?: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Actif", cls: "bg-lime/15 text-lime" },
    pending: { label: "En attente", cls: "bg-gold/15 text-gold" },
    rejected: { label: "Rejeté", cls: "bg-coral/15 text-coral" },
    suspended: { label: "Suspendu", cls: "bg-coral/15 text-coral" },
  }
  const it = map[status ?? ""] ?? { label: (status ?? "—").toUpperCase(), cls: "bg-white text-mute" }
  return (
    <span className={`inline-flex items-center rounded-full border-2 border-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] ${it.cls}`}>
      {it.label}
    </span>
  )
}

export default async function AdminAmbassadorDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/admin/ambassadeurs")
  }

  const { data: adminRole } = await supabase.from("admin_roles").select("*").eq("profile_id", user.id).single()

  if (!adminRole) {
    redirect("/")
  }

  const { data: ambassador } = await supabase
    .from("ambassadors")
    .select("*")
    .eq("id", id)
    .single()

  if (!ambassador) {
    notFound()
  }

  // #34 — pas de FK ambassadors→profiles : on résout via user_id.
  const { data: profile } = ambassador.user_id
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", ambassador.user_id)
        .maybeSingle()
    : { data: null }

  // Commissions / payouts / filleuls — RLS les réserve à l'ambassadeur
  // propriétaire (migration 107), donc lecture admin via service-role.
  const sr = createServiceRoleClient()
  const [{ data: commissions }, { data: payouts }, { data: referrals }] = await Promise.all([
    sr.from("ambassador_commissions").select("amount_dh, status").eq("ambassador_id", id),
    sr.from("ambassador_payouts").select("amount_dh, status").eq("ambassador_id", id),
    sr.from("referral_attribution").select("referred_user_id").eq("ambassador_id", id),
  ])

  const totalEarnings = (commissions || []).reduce((s, c) => s + (Number(c.amount_dh) || 0), 0)
  const committedPayouts = (payouts || [])
    .filter((p) => p.status === "pending" || p.status === "paid")
    .reduce((s, p) => s + (Number(p.amount_dh) || 0), 0)
  const availableBalance = totalEarnings - committedPayouts
  const referralCount = referrals?.length || 0

  const fullName = profile?.full_name || "Sans nom"
  const isTop = ambassador.status === "active" && availableBalance >= 1000

  return (
    <div className="container mx-auto space-y-8 px-4 sm:px-6 py-8 sm:py-10">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
          <Link href="/admin/ambassadeurs">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Ambassadeurs
          </Link>
        </Button>
        <p className="eyebrow text-mute">Ambassadeur</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">{fullName}</h1>
          <StatusPill status={ambassador.status} />
          {ambassador.tier && (
            <span className="inline-flex items-center rounded-full border-2 border-ink bg-gold/15 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-gold">
              {ambassador.tier}
            </span>
          )}
        </div>
        <p className="font-mono text-sm text-mute">Code : {ambassador.code}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {isTop && (
            <StickerCard className="p-5">
              <div className="flex items-center gap-4">
                <Niv mood="proud" size={56} className="shrink-0" />
                <p className="text-sm text-ink">
                  Top ambassadeur — solde de commissions élevé. Beau travail de parrainage !
                </p>
              </div>
            </StickerCard>
          )}

          {/* Identité */}
          <StickerCard className="gap-3 p-6">
            <h2 className="font-display text-lg font-bold text-ink">Identité</h2>
            {profile?.email && (
              <div className="flex items-center gap-3 text-mute">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${profile.email}`} className="transition-colors hover:text-ink">
                  {profile.email}
                </a>
              </div>
            )}
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="text-mute">
                Track : <span className="font-medium text-ink">{ambassador.track || "—"}</span>
              </span>
              <span className="text-mute">
                Tier : <span className="font-medium text-ink">{ambassador.tier || "—"}</span>
              </span>
            </div>
          </StickerCard>

          {/* Stats */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Filleuls" value={referralCount} tone="teal" icon={<Users className="h-5 w-5" />} />
            <StatCard label="Total gagné" value={`${totalEarnings.toLocaleString()} DH`} tone="lime" mono />
            <StatCard label="Retraits" value={`${committedPayouts.toLocaleString()} DH`} tone="coral" mono />
          </section>
        </div>

        {/* Sidebar — solde de commissions dominant */}
        <div className="space-y-6">
          <StatHero
            eyebrow="Solde commissions"
            tone="lime"
            value={availableBalance.toLocaleString()}
            unit="DH"
            icon={<Wallet className="h-5 w-5" />}
            meta={
              <span className="font-mono">
                {totalEarnings.toLocaleString()} DH gagnés · {committedPayouts.toLocaleString()} DH retirés
              </span>
            }
          />

          {/* Actions — validation KYC / traitement retrait non branchées côté
              serveur (seuls approve/reject existent, sur la liste). */}
          <StickerCard className="gap-3 p-6">
            <h2 className="font-display text-lg font-bold text-ink">Actions admin</h2>
            <p className="text-sm text-mute">
              La validation KYC et le traitement des retraits ne sont pas encore branchés côté serveur. L'approbation
              des candidatures se fait depuis la liste.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled>Valider le KYC</Button>
              <Button variant="outline" disabled>Traiter un retrait</Button>
            </div>
          </StickerCard>
        </div>
      </div>
    </div>
  )
}
