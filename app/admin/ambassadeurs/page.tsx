import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Check, X, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import BackButton from "@/components/admin/BackButton"
import { StatCard } from "@/components/admin/stat-card"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"

export default async function AdminAmbassadorsPage() {
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

  const { data: ambassadors } = await supabase
    .from("ambassadors")
    .select("*")
    .order("created_at", { ascending: false })

  // #34 — there is no FK ambassadors→profiles (the FK on user_id points at
  // auth.users), so the old `profiles!ambassadors_profile_id_fkey` embed
  // was impossible. Resolve names/emails with a separate query keyed on
  // user_id (profiles.id == auth.users.id == ambassadors.user_id).
  const ambassadorUserIds = (ambassadors ?? [])
    .map((a) => a.user_id as string | null)
    .filter((id): id is string => Boolean(id))
  const { data: profileRows } = ambassadorUserIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", ambassadorUserIds)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] }
  const profileByUserId = new Map(
    (profileRows ?? []).map((p) => [p.id, p as { id: string; full_name: string | null; email: string | null }])
  )

  const stats = {
    total: ambassadors?.length || 0,
    active: ambassadors?.filter((a) => a.status === "active").length || 0,
    pending: ambassadors?.filter((a) => a.status === "pending").length || 0,
    rejected: ambassadors?.filter((a) => a.status === "rejected").length || 0,
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <BackButton href="/admin" label="Retour au dashboard" />

      <header className="mb-8 space-y-2">
        <p className="eyebrow text-mute">Admin · Ambassadeurs</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
          Gérer les <em className="font-semibold italic text-pink">ambassadeurs</em>
        </h1>
        <p className="text-mute">Candidatures et ambassadeurs actifs.</p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total" value={stats.total} tone="paper" />
        <StatCard label="Actifs" value={stats.active} tone="lime" />
        <StatCard label="En attente" value={stats.pending} tone="gold" />
        <StatCard label="Rejetés" value={stats.rejected} tone="coral" />
      </section>

      {ambassadors && ambassadors.length > 0 ? (
        <div className="space-y-4">
          {ambassadors.map((ambassador) => {
            const profile = profileByUserId.get(ambassador.user_id)
            return (
              <StickerCard key={ambassador.id} className="p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <h3 className="font-display text-lg font-bold text-ink">
                        {profile?.full_name || "Sans nom"}
                      </h3>
                      <AmbassadorStatusPill status={ambassador.status} />
                    </div>

                    <div className="grid gap-4 text-sm sm:grid-cols-3">
                      <div>
                        <p className="eyebrow mb-1 text-mute">Contact</p>
                        <p className="text-ink-2">{profile?.email || "—"}</p>
                      </div>

                      <div>
                        <p className="eyebrow mb-1 text-mute">Track · Tier</p>
                        <p className="text-ink-2">{ambassador.track} · {ambassador.tier}</p>
                      </div>

                      <div>
                        <p className="eyebrow mb-1 text-mute">Code ambassadeur</p>
                        <p className="font-mono font-bold text-teal">{ambassador.code}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
                    <Link
                      href={`/admin/ambassadeurs/${ambassador.id}`}
                      className="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border-2 border-ink bg-white px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-ink shadow-stkr-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink"
                    >
                      <Eye className="h-4 w-4" />
                      Voir
                    </Link>

                    {ambassador.status === "pending" && (
                      <>
                        <form action="/api/admin/ambassadors/approve" method="POST">
                          <input type="hidden" name="ambassadorId" value={ambassador.id} />
                          <Button type="submit" size="sm" variant="lime" className="w-full">
                            <Check className="mr-2 h-4 w-4" />
                            Approuver
                          </Button>
                        </form>

                        <form action="/api/admin/ambassadors/reject" method="POST">
                          <input type="hidden" name="ambassadorId" value={ambassador.id} />
                          <Button type="submit" size="sm" variant="outline" className="w-full text-coral">
                            <X className="mr-2 h-4 w-4" />
                            Rejeter
                          </Button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              </StickerCard>
            )
          })}
        </div>
      ) : (
        <NivEmpty
          title="Aucune candidature pour l'instant"
          description="Partage le lien ambassadeur — les premières candidatures s'afficheront ici."
        />
      )}
    </div>
  )
}

function AmbassadorStatusPill({ status }: { status?: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Actif", cls: "bg-lime/15 text-lime" },
    pending: { label: "En attente", cls: "bg-gold/15 text-gold" },
    rejected: { label: "Rejeté", cls: "bg-coral/15 text-coral" },
  }
  const it = map[status ?? ""] ?? { label: (status ?? "—").toUpperCase(), cls: "bg-white text-mute" }
  return (
    <span className={`inline-flex items-center rounded-full border-2 border-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] ${it.cls}`}>
      {it.label}
    </span>
  )
}
