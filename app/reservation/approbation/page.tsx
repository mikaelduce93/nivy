import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { redirect } from "next/navigation"
import { Clock, CheckCircle2, XCircle, AlertTriangle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import Link from "next/link"

/**
 * /reservation/approbation?request=<parental_approvals.id> (issue #45)
 *
 * Waiting screen a teen lands on when a booking exceeds their budget and needs
 * parental approval (bookings/create writes a parental_approvals row, #25/#30).
 * Shows the live status. Read via service-role then authorized to the
 * requesting teen (teen_id == auth.uid()).
 */
const STATUS_VIEW: Record<
  string,
  { icon: any; tone: string; title: string; message: string }
> = {
  pending: {
    icon: Clock,
    tone: "from-gold to-coral",
    title: "En attente d'approbation",
    message:
      "Ta réservation dépasse ton budget : ton parent a reçu une demande d'approbation. Tu seras notifié dès qu'il aura décidé.",
  },
  approved: {
    icon: CheckCircle2,
    tone: "from-lime to-lime",
    title: "Demande approuvée !",
    message: "Ton parent a approuvé la demande. Tu peux finaliser ta réservation.",
  },
  auto_approved: {
    icon: CheckCircle2,
    tone: "from-lime to-lime",
    title: "Demande approuvée !",
    message: "La demande a été approuvée automatiquement. Tu peux finaliser ta réservation.",
  },
  denied: {
    icon: XCircle,
    tone: "from-destructive to-pink",
    title: "Demande refusée",
    message: "Ton parent a refusé cette demande. Parles-en avec lui si tu penses que c'est une erreur.",
  },
  auto_denied: {
    icon: XCircle,
    tone: "from-destructive to-pink",
    title: "Demande refusée",
    message: "La demande a été refusée automatiquement.",
  },
  expired: {
    icon: AlertTriangle,
    tone: "from-paper-2 to-card",
    title: "Demande expirée",
    message: "Cette demande d'approbation a expiré. Tu peux refaire ta réservation.",
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
  const Icon = view.icon

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-6 py-32">
        <div className="max-w-lg mx-auto">
          <Card className="bg-gradient-to-br from-paper-2 to-card border-ink p-8 text-center">
            <div
              className={`w-20 h-20 rounded-full bg-gradient-to-br ${view.tone} flex items-center justify-center mx-auto mb-6`}
            >
              <Icon className="h-10 w-10 text-ink" />
            </div>
            <h1 className="text-2xl font-black text-ink mb-2">{view.title}</h1>
            <p className="text-mute mb-6">{view.message}</p>
            {approval.amount != null && (
              <p className="text-sm text-mute mb-6">
                Montant concerné : <span className="font-bold text-ink">{approval.amount} DH</span>
              </p>
            )}
            <Button asChild className="w-full">
              <Link href="/agenda">
                Retour à l'agenda
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  )
}
