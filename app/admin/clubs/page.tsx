import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Award, Plus, Edit, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import BackButton from "@/components/admin/BackButton"

export default async function AdminClubsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/admin/clubs")
  }

  const { data: adminRole } = await supabase.from("admin_roles").select("*").eq("profile_id", user.id).single()

  if (!adminRole) {
    redirect("/")
  }

  const { data: clubs } = await supabase.from("clubs").select("*").order("created_at", { ascending: false })

  // Get enrollment counts for each club
  const clubsWithStats = await Promise.all(
    (clubs || []).map(async (club) => {
      const { count } = await supabase
        .from("club_enrollments")
        .select("*", { count: "exact", head: true })
        .eq("club_id", club.id)
        .eq("status", "active")

      return {
        ...club,
        enrollments: count || 0,
      }
    }),
  )

  const stats = {
    total: clubs?.length || 0,
    active: clubs?.filter((c) => c.status === "active").length || 0,
    totalEnrollments: clubsWithStats.reduce((sum, c) => sum + c.enrollments, 0),
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        <BackButton href="/admin" label="Retour au dashboard" />
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black text-white mb-2">Gestion des clubs</h1>
            <p className="text-zinc-400">Créez et gérez tous vos clubs</p>
          </div>
          <Button asChild className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
            <Link href="/admin/clubs/creer">
              <Plus className="w-4 h-4 mr-2" />
              Créer un club
            </Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30">
            <div className="flex items-center justify-between mb-4">
              <Award className="w-8 h-8 text-cyan-400" />
              <span className="text-3xl font-black text-white">{stats.total}</span>
            </div>
            <p className="text-white font-semibold">Clubs créés</p>
            <p className="text-cyan-400 text-sm">Total</p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
            <div className="flex items-center justify-between mb-4">
              <Award className="w-8 h-8 text-green-400" />
              <span className="text-3xl font-black text-white">{stats.active}</span>
            </div>
            <p className="text-white font-semibold">Clubs actifs</p>
            <p className="text-green-400 text-sm">Disponibles</p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-purple-400" />
              <span className="text-3xl font-black text-white">{stats.totalEnrollments}</span>
            </div>
            <p className="text-white font-semibold">Inscriptions</p>
            <p className="text-purple-400 text-sm">Total actives</p>
          </Card>
        </div>

        {clubsWithStats && clubsWithStats.length > 0 ? (
          <div className="grid gap-6">
            {clubsWithStats.map((club) => (
              <Card key={club.id} className="p-6 bg-zinc-900 border-zinc-800">
                <div className="flex gap-6">
                  <div className="relative w-48 h-32 rounded-xl overflow-hidden flex-shrink-0">
                    <Image
                      src={club.image_url || "/placeholder.svg?height=128&width=192&query=club"}
                      alt={club.name}
                      fill
                      sizes="192px"
                      className="object-cover"
                      loading="lazy"
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{club.name}</h3>
                        <p className="text-zinc-400 text-sm mb-2">{club.location}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-semibold">
                            {club.category}
                          </div>
                          <span className="text-zinc-400">{club.schedule}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {club.status === "active" ? (
                          <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">
                            ACTIF
                          </div>
                        ) : (
                          <div className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-xs font-semibold">
                            INACTIF
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="bg-zinc-950 rounded-lg p-3">
                        <p className="text-xs text-zinc-500 mb-1">Prix mensuel</p>
                        <p className="text-lg font-bold text-cyan-400">{club.monthly_price} DH</p>
                      </div>

                      <div className="bg-zinc-950 rounded-lg p-3">
                        <p className="text-xs text-zinc-500 mb-1">Inscriptions</p>
                        <p className="text-lg font-bold text-white">{club.enrollments}</p>
                      </div>

                      <div className="bg-zinc-950 rounded-lg p-3">
                        <p className="text-xs text-zinc-500 mb-1">Capacité</p>
                        <p className="text-lg font-bold text-purple-400">
                          {club.enrollments} / {club.capacity}
                        </p>
                      </div>

                      <div className="bg-zinc-950 rounded-lg p-3">
                        <p className="text-xs text-zinc-500 mb-1">Âge</p>
                        <p className="text-lg font-bold text-blue-400">
                          {club.age_min}-{club.age_max}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="bg-transparent border-cyan-500 text-cyan-400"
                      >
                        <Link href={`/clubs/${club.slug}`}>Voir</Link>
                      </Button>
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="bg-transparent border-blue-500 text-blue-400"
                      >
                        <Link href={`/admin/clubs/${club.id}/modifier`}>
                          <Edit className="w-4 h-4 mr-2" />
                          Modifier
                        </Link>
                      </Button>
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="bg-transparent border-red-500 text-red-400"
                      >
                        <Link href={`/admin/clubs/${club.id}/supprimer`}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center bg-zinc-900 border-zinc-800">
            <Award className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Aucun club</h3>
            <p className="text-zinc-400 mb-6">Créez votre premier club pour commencer</p>
            <Button asChild className="bg-gradient-to-r from-cyan-500 to-blue-500">
              <Link href="/admin/clubs/creer">
                <Plus className="w-4 h-4 mr-2" />
                Créer un club
              </Link>
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
