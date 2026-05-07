import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, UserPlus, Info, QrCode, Mail, Link2 } from "lucide-react"
import Link from "next/link"
import { AddTeenForm } from "@/components/parent/add-teen-form"

export default async function AddTeenPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-zinc-400 hover:text-white">
          <Link href="/parent/teens">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à mes teens
          </Link>
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white">Ajouter un Teen</h1>
          <p className="text-zinc-400">Liez le compte de votre adolescent à votre espace parent</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Main Form */}
          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-emerald-400" />
                Lier un compte Teen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AddTeenForm parentId={userInfo.profileId} />
            </CardContent>
          </Card>

          {/* Help Section */}
          <div className="space-y-6">
            {/* How it works */}
            <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-400" />
                  Comment ça marche ?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-white">Entrez l'email ou le code</p>
                    <p className="text-sm text-zinc-400">
                      Utilisez l'email du compte Teen ou son code unique de liaison
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-white">Demande envoyée</p>
                    <p className="text-sm text-zinc-400">
                      Le teen reçoit une notification pour accepter la liaison
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-white">Compte lié</p>
                    <p className="text-sm text-zinc-400">
                      Une fois accepté, gérez ses paramètres depuis votre dashboard
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alternative Methods */}
            <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white text-base">Autres méthodes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start border-zinc-700 text-zinc-300 hover:border-emerald-500/50"
                  disabled
                >
                  <QrCode className="h-4 w-4 mr-3 text-emerald-400" />
                  Scanner un QR Code
                  <span className="ml-auto text-xs text-zinc-500">Bientôt</span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-zinc-700 text-zinc-300 hover:border-emerald-500/50"
                  disabled
                >
                  <Mail className="h-4 w-4 mr-3 text-blue-400" />
                  Envoyer une invitation
                  <span className="ml-auto text-xs text-zinc-500">Bientôt</span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-zinc-700 text-zinc-300 hover:border-emerald-500/50"
                  disabled
                >
                  <Link2 className="h-4 w-4 mr-3 text-purple-400" />
                  Lien de partage
                  <span className="ml-auto text-xs text-zinc-500">Bientôt</span>
                </Button>
              </CardContent>
            </Card>

            {/* Info Box */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-sm text-blue-400">
                <strong>Note :</strong> Le teen doit avoir un compte actif sur Nivy.
                S'il n'en a pas encore, invitez-le à créer son compte depuis l'application.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
