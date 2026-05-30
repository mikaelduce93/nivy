import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileText, ShieldCheck, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { ParentSignatureClient } from "@/components/parent/e-signature-client"

async function getExistingSignature(parentId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("e_signatures")
    .select("id, created_at, parent_full_name")
    .eq("parent_id", parentId)
    .eq("terms_accepted", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return data
}

export default async function ParentESignaturePage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; teen?: string }>
}) {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  const existing = await getExistingSignature(userInfo.profileId)
  const params = await searchParams
  const redirectTo = params.redirect || "/parent/topup"
  const teenId = params.teen

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32 max-w-3xl">
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="h-8 w-8 text-teal" />
            <h1 className="text-3xl font-black text-ink">
              Autorisation parentale
            </h1>
          </div>
          <p className="text-mute">
            Avant de pouvoir recharger des coins ou approuver des demandes,
            nous devons vérifier votre identité et recueillir votre
            consentement signé électroniquement (loi 09-08 / CNDP).
          </p>
        </div>

        {existing ? (
          <Card className="bg-lime/10 border-lime/30 mb-6">
            <CardHeader>
              <CardTitle className="text-lime flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Signature déjà enregistrée
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-ink-2">
                Une autorisation parentale a été signée
                {existing.parent_full_name ? ` par ${existing.parent_full_name}` : ""}
                {" "}le {new Date(existing.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                .
              </p>
              <p className="text-xs text-mute">
                Vous pouvez signer une nouvelle autorisation si vos
                informations ont changé. Sinon, retournez à la recharge.
              </p>
              <div className="flex gap-3">
                <Button asChild className="bg-lime hover:bg-lime text-ink">
                  <Link href={redirectTo}>
                    Continuer
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-ink text-ink-2">
                  <Link href="/parent/documents">
                    Voir mes documents
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gold/10 border-gold/30 mb-6">
            <CardHeader>
              <CardTitle className="text-gold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Signature requise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-ink-2">
                Cette signature électronique a la même valeur juridique
                qu&apos;une signature manuscrite. Vos documents seront
                conservés conformément au RGPD/CNDP.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal" />
              {existing ? "Renouveler la signature" : "Signer l'autorisation"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ParentSignatureClient
              childId={teenId}
              redirectTo={redirectTo}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
