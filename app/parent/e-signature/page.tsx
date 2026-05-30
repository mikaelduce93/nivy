import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { Niv, DarkSurface } from "@/components/brand"
import { Confetti } from "@/components/ui/effects/confetti"
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
      <div className="container mx-auto px-6 pt-10 pb-20 sm:pt-16 max-w-3xl">
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        <div className="mb-8 flex items-center gap-4">
          <Niv size={72} mood="calm" />
          <div>
            <p className="eyebrow">Sécurité · Autorisation</p>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
              Ta <em className="font-semibold italic text-pink">signature</em>, c'est le go
            </h1>
            <p className="text-mute mt-1">
              Avant de recharger des coins ou d'approuver des demandes,
              on vérifie ton identité et on recueille ton consentement
              signé électroniquement (loi 09-08 / CNDP).
            </p>
          </div>
        </div>

        {existing ? (
          <DarkSurface tone="lime" shadow className="mb-6 p-6">
            <Confetti trigger palette="success" />
            <div className="flex items-start gap-4">
              <Niv size={64} mood="proud" className="shrink-0" />
              <div>
                <p className="eyebrow text-lime">Signature enregistrée</p>
                <p className="font-display text-xl font-extrabold text-paper mt-1">
                  Tout est en règle 🎉
                </p>
                <p className="text-sm text-paper/80 mt-2">
                  Une autorisation parentale a été signée
                  {existing.parent_full_name ? ` par ${existing.parent_full_name}` : ""}
                  {" "}le {new Date(existing.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  .
                </p>
                <p className="font-mono text-xs text-paper/60 mt-2">
                  Tu peux re-signer si tes infos ont changé. Sinon, retourne à la recharge.
                </p>
                <div className="flex flex-wrap gap-3 mt-4">
                  <Button asChild variant="pink">
                    <Link href={redirectTo}>Continuer</Link>
                  </Button>
                  <Button asChild variant="outline" className="border-paper text-paper hover:bg-paper hover:text-ink">
                    <Link href="/parent/documents">Voir mes documents</Link>
                  </Button>
                </div>
              </div>
            </div>
          </DarkSurface>
        ) : (
          <StickerCard className="mb-6 p-6">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 shrink-0 rounded-full border-2 border-ink bg-gold flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-ink" />
              </div>
              <div>
                <p className="font-display text-lg font-extrabold text-ink">Signature requise</p>
                <p className="text-sm text-mute mt-1">
                  Cette signature électronique a la même valeur juridique
                  qu&apos;une signature manuscrite. Tes documents sont
                  conservés conformément au RGPD/CNDP.
                </p>
              </div>
            </div>
          </StickerCard>
        )}

        {!existing && (
          <StickerCard variant="panel" className="mb-6 p-4 bg-teal/10">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-teal shrink-0 mt-0.5" />
              <p className="text-sm text-ink-2">
                Valeur juridique CNDP : ta signature électronique vaut signature
                manuscrite. Données chiffrées, bucket privé, accès tracé.
              </p>
            </div>
          </StickerCard>
        )}

        <StickerCard className="p-6">
          <h2 className="font-display text-xl font-extrabold text-ink flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-teal" />
            {existing ? "Renouveler la signature" : "Signer l'autorisation"}
          </h2>
          <ParentSignatureClient
            childId={teenId}
            redirectTo={redirectTo}
          />
        </StickerCard>
      </div>
    </div>
  )
}
