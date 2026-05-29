import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, ShieldCheck, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { ParentSignatureClient } from "@/components/parent/e-signature-client"

/**
 * #51 — Parent onboarding step 1: e-signature (loi 09-08 / CNDP).
 *
 * Canonical onboarding route (canon §4.1: "E-signature CGU",
 * /onboarding/parent/e-signature, hard requirement: an e_signatures row with
 * signed_at NOT NULL). Mirrors the post-onboarding /parent/e-signature page
 * but chains into the parent onboarding router (/onboarding/parent) instead of
 * /parent/topup. Reuses the existing core (ParentSignatureClient →
 * /api/parent/e-signature/create); no new engine.
 */
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

export default async function ParentOnboardingESignaturePage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  const existing = await getExistingSignature(userInfo.profileId)
  // After signing, the parent continues to the onboarding router which
  // finalises is_onboarded (gated on this signature existing).
  const redirectTo = "/onboarding/parent"

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32 max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="h-8 w-8 text-cyan-400" />
            <h1 className="text-3xl font-black text-white">
              Bienvenue — autorisation parentale
            </h1>
          </div>
          <p className="text-zinc-400">
            Première étape de votre inscription : nous devons vérifier votre
            identité et recueillir votre consentement signé électroniquement
            (loi 09-08 / CNDP) avant d&apos;activer votre espace parent.
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
              <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <Link href={redirectTo}>Continuer mon inscription</Link>
              </Button>
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
            <ParentSignatureClient redirectTo={redirectTo} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
