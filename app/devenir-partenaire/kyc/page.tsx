/**
 * Wave 3B.3 — pre-auth KYC upload page for prospects (canon §2 stage 4, §4.6).
 *
 * Server component that validates the `?token=…` query param against
 * `partner_kyc_tokens` BEFORE rendering the uploader. Invalid / expired /
 * already-used tokens get a safe error screen — no leak of which condition
 * tripped beyond a generic message.
 */
import { Suspense } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldAlert, ShieldCheck } from "lucide-react"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { sha256Hex } from "@/lib/partners/kyc-token"
import { ProspectKycUploader } from "./prospect-kyc-uploader"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Dépôt de pièces KYC — Nivy",
  description: "Upload de pièces KYC partenaire via lien signé.",
  robots: { index: false, follow: false },
}

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function ProspectKycPage({ searchParams }: Props) {
  const { token } = await searchParams

  if (!token || typeof token !== "string") {
    return (
      <SafeError
        title="Lien manquant"
        body="Le lien KYC nécessite un token. Demande à l'équipe Nivy de te renvoyer le lien complet."
      />
    )
  }

  const sr = createServiceRoleClient()
  const { data: tokenRow } = await sr
    .from("partner_kyc_tokens")
    .select("id, partner_id, expires_at, used_at")
    .eq("token_hash", sha256Hex(token))
    .maybeSingle()

  if (!tokenRow) {
    return <SafeError title="Lien invalide" body="Ce lien KYC n'est pas reconnu. Contacte l'équipe Nivy." />
  }
  if (tokenRow.used_at) {
    return (
      <SafeError
        title="Lien déjà utilisé"
        body="Ce lien a déjà servi à uploader une pièce. Si tu as un autre document à envoyer, demande un nouveau lien."
      />
    )
  }
  if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return (
      <SafeError
        title="Lien expiré"
        body="Ce lien KYC est arrivé à expiration. Demande un nouveau lien à l'équipe Nivy."
      />
    )
  }

  // Look up partner display name (best-effort; do NOT leak status / KYC docs).
  const { data: partner } = await sr
    .from("partners")
    .select("company_name")
    .eq("id", tokenRow.partner_id)
    .maybeSingle()

  return (
    <main className="min-h-screen bg-background text-ink">
      <div className="container mx-auto px-4 py-12 max-w-2xl space-y-8">
        <header className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal/20 border border-teal/30">
            <ShieldCheck className="w-7 h-7 text-teal" />
          </div>
          <h1 className="text-3xl font-black">Dépôt KYC</h1>
          <p className="text-mute text-sm">
            {partner?.company_name ? `Pour ${partner.company_name}.` : null} Bucket privé,
            jamais d&apos;URL publique. Lien à usage unique.
          </p>
        </header>

        <Suspense fallback={null}>
          <ProspectKycUploader token={token} />
        </Suspense>

        <p className="text-xs text-center text-mute">
          Besoin d&apos;aide ?{" "}
          <Link href="/aide" className="underline">Contacter l&apos;équipe Nivy</Link>
        </p>
      </div>
    </main>
  )
}

function SafeError({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen bg-background text-ink">
      <div className="container mx-auto px-4 py-12 max-w-xl space-y-6">
        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-gold" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-ink-2 space-y-3">
            <p>{body}</p>
            <Button asChild variant="outline">
              <Link href="/aide">Contacter le support</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
