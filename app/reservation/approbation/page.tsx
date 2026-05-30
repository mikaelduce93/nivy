import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { redirect } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach } from "@/components/brand"
import type { NivMood } from "@/components/brand"

/**
 * /reservation/approbation?request=<parental_approvals.id> (issue #45)
 *
 * Waiting screen a teen lands on when a booking exceeds their budget and needs
 * parental approval (bookings/create writes a parental_approvals row, #25/#30).
 * Shows the live status. Read via service-role then authorized to the
 * requesting teen (teen_id == auth.uid()).
 */
type StatusView = {
  mood: NivMood
  /** Couleur de la pill statut (token économique charte). */
  badgeClass: string
  badgeLabel: string
  title: string
  message: string
  /** CTA contextualisé au statut. */
  cta: { label: string; href: string }
}

const FINALIZE_CTA = { label: "Finaliser ma réservation", href: "/agenda" }
const REDO_CTA = { label: "Refaire ma réservation", href: "/agenda" }
const BACK_CTA = { label: "Retour à l'agenda", href: "/agenda" }

const STATUS_VIEW: Record<string, StatusView> = {
  pending: {
    mood: "calm",
    badgeClass: "border-gold bg-gold/15 text-ink",
    badgeLabel: "En attente",
    title: "En attente d'approbation",
    message:
      "Ta réservation dépasse ton budget : ton parent a reçu une demande d'approbation. Tu seras notifié dès qu'il aura décidé.",
    cta: BACK_CTA,
  },
  approved: {
    mood: "hype",
    badgeClass: "border-lime bg-lime/20 text-ink",
    badgeLabel: "Approuvée",
    title: "Demande approuvée !",
    message: "Ton parent a approuvé la demande. Tu peux finaliser ta réservation.",
    cta: FINALIZE_CTA,
  },
  auto_approved: {
    mood: "hype",
    badgeClass: "border-lime bg-lime/20 text-ink",
    badgeLabel: "Approuvée",
    title: "Demande approuvée !",
    message: "La demande a été approuvée automatiquement. Tu peux finaliser ta réservation.",
    cta: FINALIZE_CTA,
  },
  denied: {
    mood: "proud",
    badgeClass: "border-coral bg-coral/15 text-ink",
    badgeLabel: "Refusée",
    title: "Demande refusée",
    message: "Ton parent a refusé cette demande. Parles-en avec lui si tu penses que c'est une erreur.",
    cta: REDO_CTA,
  },
  auto_denied: {
    mood: "proud",
    badgeClass: "border-coral bg-coral/15 text-ink",
    badgeLabel: "Refusée",
    title: "Demande refusée",
    message: "La demande a été refusée automatiquement.",
    cta: REDO_CTA,
  },
  expired: {
    mood: "calm",
    badgeClass: "border-ink bg-paper-2 text-ink",
    badgeLabel: "Expirée",
    title: "Demande expirée",
    message: "Cette demande d'approbation a expiré. Tu peux refaire ta réservation.",
    cta: REDO_CTA,
  },
}

export default async function ReservationApprovalPage({
  searchParams,
}: {
  searchParams: Promise<{ request?: string }>
}) {
  const { request: requestId } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/auth/login?redirect=/reservation/approbation?request=${requestId ?? ""}`)
  }

  let approval: any = null
  if (requestId) {
    const sr = createServiceRoleClient()
    const { data } = await sr
      .from("parental_approvals")
      .select("id, teen_id, action_type, amount, status, requested_at")
      .eq("id", requestId)
      .maybeSingle()
    approval = data
  }

  // Only the requesting teen may view their own approval.
  if (!approval || approval.teen_id !== user.id) {
    redirect("/agenda")
  }

  const view = STATUS_VIEW[approval.status] ?? STATUS_VIEW.pending

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <div className="container mx-auto px-6 py-32">
        <div className="max-w-lg mx-auto space-y-6">
          <StickerCard className="p-8 text-center">
            <p className="eyebrow tracking-[0.16em] text-mute">Approbation parentale</p>
            <div className="mt-3 mb-4 flex justify-center">
              <span
                className={`rounded-full border-2 px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] ${view.badgeClass}`}
              >
                {view.badgeLabel}
              </span>
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink mb-2">{view.title}</h1>
            <p className="text-mute mb-6">{view.message}</p>
            {approval.amount != null && (
              <p className="text-sm text-mute mb-6">
                Montant concerné :{" "}
                <span className="font-mono font-bold text-ink tabular-nums">{approval.amount} DH</span>
              </p>
            )}
            <Button asChild variant="pink" className="w-full">
              <Link href={view.cta.href}>
                {view.cta.label}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </StickerCard>

          <NivCoach mood={view.mood} message={view.message} />
        </div>
      </div>
      <Footer />
    </div>
  )
}
