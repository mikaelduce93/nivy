import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Users, Shield, Search, Download, Filter, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import Link from "next/link"
import BackButton from "@/components/admin/BackButton"

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

  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("*, admin_roles (*)")
    .order("created_at", { ascending: false })

  const { data: totalBookings } = await supabase.from("bookings").select("parent_id, total_amount")

  // #28 — no `children` table; count linked teens via parent_teen_links.
  const { data: totalChildren } = await supabase.from("parent_teen_links").select("parent_id")

  const profilesWithStats = allProfiles?.map((profile) => {
    const userBookings = totalBookings?.filter((b) => b.parent_id === profile.id) || []
    const userChildren = totalChildren?.filter((c) => c.parent_id === profile.id) || []
    const revenue = userBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)

    return {
      ...profile,
      bookings_count: userBookings.length,
      children_count: userChildren.length,
      total_revenue: revenue,
      is_admin: !!profile.admin_roles,
    }
  })

  const filteredProfiles = profilesWithStats?.filter((profile) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      profile.prenom?.toLowerCase().includes(searchLower) ||
      profile.nom?.toLowerCase().includes(searchLower) ||
      profile.email?.toLowerCase().includes(searchLower) ||
      profile.telephone?.toLowerCase().includes(searchLower)
    )
  })

  const stats = {
    total: allProfiles?.length || 0,
    admins: allProfiles?.filter((p) => p.admin_roles).length || 0,
    parents: allProfiles?.filter((p) => !p.admin_roles).length || 0,
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        <BackButton href="/admin" label="Retour au dashboard" />
        <div className="mb-8">
          <h1 className="text-4xl font-black text-ink mb-2">Gestion des utilisateurs</h1>
          <p className="text-mute">Gérez tous les utilisateurs de la plateforme</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="p-4 bg-card border-ink">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-mute text-sm mb-1">Total</p>
                <p className="text-3xl font-black text-ink">{stats.total}</p>
              </div>
              <Users className="w-10 h-10 text-teal" />
            </div>
          </Card>
          <Card className="p-4 bg-card border-pink/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-mute text-sm mb-1">Administrateurs</p>
                <p className="text-3xl font-black text-pink">{stats.admins}</p>
              </div>
              <Shield className="w-10 h-10 text-pink" />
            </div>
          </Card>
          <Card className="p-4 bg-card border-teal/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-mute text-sm mb-1">Parents</p>
                <p className="text-3xl font-black text-teal">{stats.parents}</p>
              </div>
              <UserPlus className="w-10 h-10 text-teal" />
            </div>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-mute" />
            <Input
              placeholder="Rechercher par nom, email, téléphone..."
              className="pl-10 bg-card border-ink"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-transparent border-ink">
              <Filter className="w-4 h-4 mr-2" />
              Filtres
            </Button>
            <Button variant="outline" className="bg-transparent border-ink">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        {filteredProfiles && filteredProfiles.length > 0 ? (
          <div className="space-y-4">
            {filteredProfiles.map((profile) => (
              <Card key={profile.id} className="p-6 bg-card border-ink">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal to-teal flex items-center justify-center flex-shrink-0">
                      {profile.avatar_url ? (
                        <Image
                          src={profile.avatar_url || "/placeholder.svg"}
                          alt={profile.prenom || "User"}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <span className="text-ink font-bold text-lg">
                          {(profile.prenom || "U").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-ink">
                          {profile.prenom} {profile.nom}
                        </h3>
                        {profile.is_admin && (
                          <div className="px-2 py-1 rounded-full bg-pink/20 text-pink text-xs font-semibold flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            ADMIN
                          </div>
                        )}
                      </div>

                      <div className="grid md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-mute mb-1">Contact</p>
                          <p className="text-ink-2">{profile.email}</p>
                          {profile.telephone && <p className="text-mute">{profile.telephone}</p>}
                        </div>

                        <div>
                          <p className="text-mute mb-1">Statistiques</p>
                          <p className="text-teal">
                            {profile.bookings_count} réservation{profile.bookings_count !== 1 ? "s" : ""}
                          </p>
                          <p className="text-teal">
                            {profile.children_count} ado{profile.children_count !== 1 ? "s" : ""}
                          </p>
                        </div>

                        <div>
                          <p className="text-mute mb-1">Revenus générés</p>
                          <p className="text-lime font-bold text-lg">{profile.total_revenue} DH</p>
                        </div>

                        <div>
                          <p className="text-mute mb-1">Inscription</p>
                          <p className="text-mute text-xs">
                            {new Date(profile.created_at).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="bg-transparent border-teal text-teal"
                    >
                      <Link href={`/admin/utilisateurs/${profile.id}`}>Détails</Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center bg-card border-ink">
            <Users className="w-16 h-16 text-ink mx-auto mb-4" />
            <h3 className="text-xl font-bold text-ink mb-2">Aucun utilisateur trouvé</h3>
            <p className="text-mute">Essayez de modifier vos critères de recherche</p>
          </Card>
        )}
      </div>
    </div>
  )
}
