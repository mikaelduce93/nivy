import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Users, Shield, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import Link from "next/link"
import BackButton from "@/components/admin/BackButton"
import { StatCard } from "@/components/admin/stat-card"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search } = await searchParams
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

  // No FK between profiles and admin_roles: the `admin_roles (*)` embed fails (PGRST200), fetch separately.
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })

  const { data: allAdminRoles } = await supabase.from("admin_roles").select("profile_id")
  const adminIds = new Set(allAdminRoles?.map((r) => r.profile_id) ?? [])

  // bookings has no parent_id in live; the booker is user_id.
  const { data: totalBookings } = await supabase.from("bookings").select("user_id, total_amount")

  // #28 — no `children` table; count linked teens via parent_teen_links.
  const { data: totalChildren } = await supabase.from("parent_teen_links").select("parent_id")

  const profilesWithStats = allProfiles?.map((profile) => {
    const userBookings = totalBookings?.filter((b) => b.user_id === profile.id) || []
    const userChildren = totalChildren?.filter((c) => c.parent_id === profile.id) || []
    const revenue = userBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)

    return {
      ...profile,
      bookings_count: userBookings.length,
      children_count: userChildren.length,
      total_revenue: revenue,
      is_admin: adminIds.has(profile.id),
    }
  })

  const filteredProfiles = profilesWithStats?.filter((profile) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      profile.full_name?.toLowerCase().includes(searchLower) ||
      profile.email?.toLowerCase().includes(searchLower)
    )
  })

  const stats = {
    total: allProfiles?.length || 0,
    admins: allProfiles?.filter((p) => adminIds.has(p.id)).length || 0,
    parents: allProfiles?.filter((p) => !adminIds.has(p.id)).length || 0,
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <BackButton href="/admin" label="Retour au dashboard" />

      <header className="mb-8 space-y-2">
        <p className="eyebrow text-mute">Admin · Utilisateurs</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
          Gérer les <em className="font-semibold italic text-pink">utilisateurs</em>
        </h1>
        <p className="text-mute">Tous les comptes de la plateforme, parents et administrateurs.</p>
      </header>

      <section className="mb-8 grid grid-cols-3 gap-3">
        <StatCard label="Total" value={stats.total} tone="teal" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Administrateurs" value={stats.admins} tone="coral" icon={<Shield className="h-5 w-5" />} />
        <StatCard label="Parents" value={stats.parents} tone="paper" />
      </section>

      <form method="GET" className="relative mb-6 lg:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 w-5 h-5 -translate-y-1/2 text-mute" />
        <Input
          name="search"
          defaultValue={search ?? ""}
          placeholder="Rechercher par nom, email..."
          className="rounded-xl border-2 border-ink bg-white pl-10"
        />
      </form>

      {filteredProfiles && filteredProfiles.length > 0 ? (
        <div className="space-y-4">
          {filteredProfiles.map((profile) => (
            <StickerCard key={profile.id} variant="hover" className="p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-teal/20">
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.full_name || "Utilisateur"}
                        width={48}
                        height={48}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="font-display text-lg font-bold text-ink">
                        {(profile.full_name || "U").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h3 className="font-display text-lg font-bold text-ink">
                        {profile.full_name}
                      </h3>
                      {profile.is_admin && (
                        <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-ink px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-paper">
                          <Shield className="h-3 w-3" />
                          Admin
                        </span>
                      )}
                    </div>

                    <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="eyebrow mb-1 text-mute">Contact</p>
                        <p className="text-ink-2">{profile.email}</p>
                      </div>

                      <div>
                        <p className="eyebrow mb-1 text-mute">Statistiques</p>
                        <p className="text-teal">
                          {profile.bookings_count} réservation{profile.bookings_count !== 1 ? "s" : ""}
                        </p>
                        <p className="text-teal">
                          {profile.children_count} ado{profile.children_count !== 1 ? "s" : ""}
                        </p>
                      </div>

                      <div>
                        <p className="eyebrow mb-1 text-mute">Revenus générés</p>
                        <p className="font-mono text-lg font-bold text-lime tabular-nums">{profile.total_revenue} DH</p>
                      </div>

                      <div>
                        <p className="eyebrow mb-1 text-mute">Inscription</p>
                        <p className="text-xs text-mute">
                          {profile.created_at
                            ? new Date(profile.created_at).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/admin/utilisateurs/${profile.id}`}
                  className="inline-flex min-h-touch shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-white px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-ink shadow-stkr-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink"
                >
                  Détails
                </Link>
              </div>
            </StickerCard>
          ))}
        </div>
      ) : (
        <NivEmpty
          title="Aucun utilisateur trouvé"
          description="Personne ne matche ta recherche, frérot — essaie un autre nom ou email."
        />
      )}
    </div>
  )
}
