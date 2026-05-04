import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Award, Check, X, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import BackButton from "@/components/admin/BackButton"

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
    .select(`
      *,
      profiles!ambassadors_profile_id_fkey (prenom, nom, email, telephone, ville)
    `)
    .order("created_at", { ascending: false })

  const stats = {
    total: ambassadors?.length || 0,
    active: ambassadors?.filter((a) => a.status === "active").length || 0,
    pending: ambassadors?.filter((a) => a.status === "pending").length || 0,
    rejected: ambassadors?.filter((a) => a.status === "rejected").length || 0,
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        <BackButton href="/admin" label="Retour au dashboard" />
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">Gestion des ambassadeurs</h1>
          <p className="text-zinc-400">Gérez les candidatures et ambassadeurs actifs</p>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 bg-zinc-900 border-zinc-800">
            <p className="text-zinc-400 text-sm mb-1">Total</p>
            <p className="text-3xl font-black text-white">{stats.total}</p>
          </Card>
          <Card className="p-4 bg-zinc-900 border-green-500/30">
            <p className="text-zinc-400 text-sm mb-1">Actifs</p>
            <p className="text-3xl font-black text-green-400">{stats.active}</p>
          </Card>
          <Card className="p-4 bg-zinc-900 border-yellow-500/30">
            <p className="text-zinc-400 text-sm mb-1">En attente</p>
            <p className="text-3xl font-black text-yellow-400">{stats.pending}</p>
          </Card>
          <Card className="p-4 bg-zinc-900 border-red-500/30">
            <p className="text-zinc-400 text-sm mb-1">Rejetés</p>
            <p className="text-3xl font-black text-red-400">{stats.rejected}</p>
          </Card>
        </div>

        {ambassadors && ambassadors.length > 0 ? (
          <div className="space-y-4">
            {ambassadors.map((ambassador) => (
              <Card key={ambassador.id} className="p-6 bg-zinc-900 border-zinc-800">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-bold text-white">
                        {ambassador.profiles?.prenom} {ambassador.profiles?.nom}
                      </h3>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          ambassador.status === "active"
                            ? "bg-green-500/20 text-green-400"
                            : ambassador.status === "pending"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {ambassador.status === "active"
                          ? "ACTIF"
                          : ambassador.status === "pending"
                            ? "EN ATTENTE"
                            : "REJETÉ"}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-zinc-500 mb-1">Contact</p>
                        <p className="text-zinc-300">{ambassador.profiles?.email}</p>
                        {ambassador.profiles?.telephone && (
                          <p className="text-zinc-300">{ambassador.profiles.telephone}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-zinc-500 mb-1">Ville</p>
                        <p className="text-zinc-300">{ambassador.profiles?.ville || "Non renseignée"}</p>
                      </div>

                      <div>
                        <p className="text-zinc-500 mb-1">Code ambassadeur</p>
                        <p className="text-cyan-400 font-mono font-bold">{ambassador.referral_code}</p>
                      </div>
                    </div>

                    {ambassador.motivation && (
                      <div className="bg-zinc-950 rounded-lg p-4">
                        <p className="text-zinc-500 text-xs mb-2">Motivation</p>
                        <p className="text-zinc-300 text-sm">{ambassador.motivation}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="bg-transparent border-cyan-500 text-cyan-400"
                    >
                      <Link href={`/admin/ambassadeurs/${ambassador.id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        Voir
                      </Link>
                    </Button>

                    {ambassador.status === "pending" && (
                      <>
                        <form action="/api/admin/ambassadors/approve" method="POST">
                          <input type="hidden" name="ambassadorId" value={ambassador.id} />
                          <Button type="submit" size="sm" className="w-full bg-green-500 hover:bg-green-600 text-white">
                            <Check className="w-4 h-4 mr-2" />
                            Approuver
                          </Button>
                        </form>

                        <form action="/api/admin/ambassadors/reject" method="POST">
                          <input type="hidden" name="ambassadorId" value={ambassador.id} />
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="w-full bg-transparent border-red-500 text-red-400"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Rejeter
                          </Button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center bg-zinc-900 border-zinc-800">
            <Award className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Aucun ambassadeur</h3>
            <p className="text-zinc-400">Les candidatures apparaîtront ici</p>
          </Card>
        )}
      </div>
    </div>
  )
}
