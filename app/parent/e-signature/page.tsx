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
  searchParams: { redirect?: string; teen?: string }
}) {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  const existing = await getExistingSignature(userInfo.profileId)
  const redirectTo = searchParams.redirect || "/parent/topup"
  const teenId = searchParams.teen

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32 max-w-3xl">
        <Button variant="ghost" asChild className="mb-6 text-zinc-400 hover:text-white">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="h-8 w-8 text-cyan-400" />
            <h1 className="text-3xl font-black text-white">
              Autorisation parentale
            </h1>
          </div>
          <p className="text-zinc-400">
            Avant de pouvoir recharger des coins ou approuver des demandes,
            nous devons vérifier votre identité et recueillir votre
            consentement signé électroniquement (loi 09-08 / CNDP).
          </p>
        </div>

        {existing ? (
          <Card className="bg-emerald-500/10 border-emerald-500/30 mb-6">
            <CardHeader>
              <CardTitle className="text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Signature déjà enregistrée
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-zinc-300">
                Une autorisation parentale a été signée
                {existing.parent_full_name ? ` par ${existing.parent_full_name}` : ""}
                {" "}le {new Date(existing.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                .
              </p>
              <p className="text-xs text-zinc-500">
                Vous pouvez signer une nouvelle autorisation si vos
                informations ont changé. Sinon, retournez à la recharge.
              </p>
              <div className="flex gap-3">
                <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  <Link href={redirectTo}>
                    Continuer
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-zinc-700 text-zinc-300">
                  <Link href="/parent/documents">
                    Voir mes documents
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-amber-500/10 border-amber-500/30 mb-6">
            <CardHeader>
              <CardTitle className="text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Signature requise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-300">
                Cette signature électronique a la même valeur juridique
                qu&apos;une signature manuscrite. Vos documents seront
                conservés conformément au RGPD/CNDP.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-400" />
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
