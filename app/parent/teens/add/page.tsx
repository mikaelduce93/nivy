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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent/teens">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à mes teens
          </Link>
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-ink">Ajouter un Teen</h1>
          <p className="text-mute">Liez le compte de votre adolescent à votre espace parent</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Main Form */}
          <Card className="bg-gradient-to-br from-paper-2 to-card border-ink">
            <CardHeader>
              <CardTitle className="text-ink flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-lime" />
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
            <Card className="bg-gradient-to-br from-paper-2 to-card border-ink">
              <CardHeader>
                <CardTitle className="text-ink flex items-center gap-2">
                  <Info className="h-5 w-5 text-teal" />
                  Comment ça marche ?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-lime/20 flex items-center justify-center text-lime font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-ink">Entrez l'email ou le code</p>
                    <p className="text-sm text-mute">
                      Utilisez l'email du compte Teen ou son code unique de liaison
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-lime/20 flex items-center justify-center text-lime font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-ink">Demande envoyée</p>
                    <p className="text-sm text-mute">
                      Le teen reçoit une notification pour accepter la liaison
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-lime/20 flex items-center justify-center text-lime font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-ink">Compte lié</p>
                    <p className="text-sm text-mute">
                      Une fois accepté, gérez ses paramètres depuis votre dashboard
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alternative Methods */}
            <Card className="bg-gradient-to-br from-paper-2 to-card border-ink">
              <CardHeader>
                <CardTitle className="text-ink text-base">Autres méthodes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start border-ink text-ink-2 hover:border-lime/50"
                  disabled
                >
                  <QrCode className="h-4 w-4 mr-3 text-lime" />
                  Scanner un QR Code
                  <span className="ml-auto text-xs text-mute">Bientôt</span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-ink text-ink-2 hover:border-lime/50"
                  disabled
                >
                  <Mail className="h-4 w-4 mr-3 text-teal" />
                  Envoyer une invitation
                  <span className="ml-auto text-xs text-mute">Bientôt</span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-ink text-ink-2 hover:border-lime/50"
                  disabled
                >
                  <Link2 className="h-4 w-4 mr-3 text-pink" />
                  Lien de partage
                  <span className="ml-auto text-xs text-mute">Bientôt</span>
                </Button>
              </CardContent>
            </Card>

            {/* Info Box */}
            <div className="p-4 bg-teal/10 border border-teal/20 rounded-xl">
              <p className="text-sm text-teal">
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
