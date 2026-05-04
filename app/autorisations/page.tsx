import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Shield, Plus, UserCheck, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"

export default async function AutorisationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/autorisations")
  }

  const { data: children } = await supabase.from("children").select("*").eq("parent_id", user.id)

  const { data: authorizations } = await supabase
    .from("child_authorizations")
    .select(`
      *,
      children (prenom, nom)
    `)
    .eq("parent_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-black text-white mb-2">Autorisations parentales</h1>
              <p className="text-zinc-400">Gérez les personnes autorisées à récupérer vos enfants</p>
            </div>
            <Button
              asChild
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              <Link href="/autorisations/ajouter">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une autorisation
              </Link>
            </Button>
          </div>

          {!children || children.length === 0 ? (
            <Card className="p-12 text-center bg-zinc-900 border-zinc-800">
              <Shield className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Aucun enfant enregistré</h3>
              <p className="text-zinc-400 mb-6">Ajoutez d'abord un enfant avant de créer des autorisations</p>
              <Button asChild className="bg-cyan-500 hover:bg-cyan-600">
                <Link href="/profile/enfants/ajouter">Ajouter un enfant</Link>
              </Button>
            </Card>
          ) : authorizations && authorizations.length > 0 ? (
            <div className="space-y-4">
              {authorizations.map((auth) => {
                const isActive = auth.status === "active"
                const isExpired = auth.expires_at && new Date(auth.expires_at) < new Date()

                return (
                  <Card key={auth.id} className="p-6 bg-zinc-900 border-zinc-800">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                            <UserCheck className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">{auth.authorized_person_name}</h3>
                            <p className="text-sm text-zinc-400">{auth.relationship}</p>
                          </div>
                          <div
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              isExpired
                                ? "bg-red-500/20 text-red-400"
                                : isActive
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-zinc-700 text-zinc-400"
                            }`}
                          >
                            {isExpired ? "EXPIRÉ" : isActive ? "ACTIF" : "INACTIF"}
                          </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-zinc-500 mb-1">Enfant autorisé</p>
                            <p className="text-white font-semibold">
                              {auth.children?.prenom} {auth.children?.nom}
                            </p>
                          </div>

                          <div>
                            <p className="text-zinc-500 mb-1">Contact</p>
                            <p className="text-zinc-300">{auth.authorized_person_phone}</p>
                            {auth.authorized_person_id && (
                              <p className="text-zinc-400 text-xs">CIN: {auth.authorized_person_id}</p>
                            )}
                          </div>

                          {auth.expires_at && (
                            <div>
                              <p className="text-zinc-500 mb-1">Expire le</p>
                              <p className="text-zinc-300">{new Date(auth.expires_at).toLocaleDateString("fr-FR")}</p>
                            </div>
                          )}
                        </div>

                        {auth.notes && (
                          <div className="mt-4 bg-zinc-950 rounded-lg p-3">
                            <p className="text-zinc-400 text-sm">{auth.notes}</p>
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
                          <Link href={`/autorisations/${auth.id}`}>Voir</Link>
                        </Button>
                        {isActive && (
                          <form action="/api/authorizations/revoke" method="POST">
                            <input type="hidden" name="authorizationId" value={auth.id} />
                            <Button
                              type="submit"
                              size="sm"
                              variant="outline"
                              className="w-full bg-transparent border-red-500 text-red-400"
                            >
                              Révoquer
                            </Button>
                          </form>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="p-12 text-center bg-zinc-900 border-zinc-800">
              <Shield className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Aucune autorisation</h3>
              <p className="text-zinc-400 mb-6">
                Créez des autorisations pour permettre à d'autres personnes de récupérer vos enfants
              </p>
              <Button asChild className="bg-gradient-to-r from-cyan-500 to-blue-500">
                <Link href="/autorisations/ajouter">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une autorisation
                </Link>
              </Button>
            </Card>
          )}

          <Card className="p-6 bg-cyan-500/10 border-cyan-500/30 mt-8">
            <div className="flex items-start gap-4">
              <Clock className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="text-white font-semibold mb-2">Important</h4>
                <ul className="text-sm text-zinc-300 space-y-1">
                  <li>• Les personnes autorisées devront présenter une pièce d'identité lors de la récupération</li>
                  <li>• Vous recevrez une notification à chaque récupération effectuée</li>
                  <li>• Vous pouvez révoquer une autorisation à tout moment</li>
                  <li>• Les autorisations temporaires expirent automatiquement</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
