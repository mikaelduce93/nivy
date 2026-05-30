import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Niv, DarkSurface } from "@/components/brand"
import { SegmentedProgress } from "@/components/ui/progress"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"

/**
 * Wave 1A bare stub — partner awaiting approval. Full
 * <PartnerAwaitingApproval /> banner lives at /partner already; this page
 * is the canonical landing target per /auth/redirect when partner status
 * is not 'active'.
 */
export default async function PartnerAwaitingApprovalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper p-6">
      <DarkSurface tone="gold" shadow className="w-full max-w-md p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <Niv mood="proud" size={120} float />

          <span className="eyebrow tracking-[0.16em] text-paper/60">En attente</span>
          <h1 className="font-display text-3xl font-extrabold leading-tight text-paper">
            Ton dossier est en <em className="font-semibold italic text-gold">modération</em>
          </h1>

          <StatusBadge variant="pending" label="EN ATTENTE" pulse size="md" />

          <p className="max-w-sm text-sm text-paper/80">
            Salam ! Ton dossier partenaire est entre de bonnes mains, ya sahbi. On le passe en
            revue et tu reçois un email dès qu&apos;il est validé.
          </p>

          {/* Progression onboarding */}
          <div className="w-full pt-2">
            <SegmentedProgress steps={3} current={1} />
            <div className="mt-2 flex justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-paper/60">
              <span>Inscription</span>
              <span className="text-pink">Vérification</span>
              <span>Actif</span>
            </div>
          </div>

          <p className="text-xs text-paper/60">
            Réponse habituelle sous 48h ouvrables · on te prévient par email.
          </p>

          <Button asChild variant="pink" className="mt-1 w-full">
            <Link href="/auth/login">Retour à la connexion</Link>
          </Button>
        </div>
      </DarkSurface>
    </main>
  )
}
