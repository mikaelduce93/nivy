/**
 * Wave V1.2-F — Partner support tickets.
 *
 * RSC. Reads `support_tickets` filtered by `requester_user_id = auth.uid()`
 * (RLS-friendly via the anon client — `support_tickets_self_read` policy
 * grants SELECT to the requester). Ticket creation goes through a server
 * action (./actions.ts) because no INSERT RLS policy exists.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  HelpCircle,
  MessageSquare,
  CheckCircle2,
  Clock,
  XCircle,
  Mail,
  ChevronRight,
} from "lucide-react"
import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { getPublicAppConfig } from "@/lib/config/app-config"
import { NewTicketForm } from "./new-ticket-form"
import { EmptyState } from "@/components/ui/states/empty-state"

export const dynamic = "force-dynamic"

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

function formatDate(value: string | null): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return DATE_FMT.format(d)
}

function statusBadge(status: string) {
  switch (status) {
    case "resolved":
    case "closed":
      return (
        <Badge className="bg-lime/20 text-lime">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Résolu
        </Badge>
      )
    case "in_progress":
    case "pending":
      return (
        <Badge className="bg-teal/20 text-teal">
          <Clock className="w-3 h-3 mr-1" />
          En cours
        </Badge>
      )
    case "rejected":
      return (
        <Badge className="bg-destructive/20 text-destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Refusé
        </Badge>
      )
    case "open":
    default:
      return (
        <Badge className="bg-gold/20 text-gold">
          <Clock className="w-3 h-3 mr-1" />
          Ouvert
        </Badge>
      )
  }
}

export default async function PartnerSupportPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")

  if (userInfo.role !== "partner") {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black text-ink">Support</h1>
        <Card className="bg-card border-ink">
          <CardContent className="p-10 text-center text-destructive">
            Accès refusé — espace réservé aux partenaires.
          </CardContent>
        </Card>
      </div>
    )
  }

  const { partnersEmail: PARTNERS_EMAIL } = getPublicAppConfig()

  const supabase = await createClient()
  const { data: ticketsRaw } = await supabase
    .from("support_tickets")
    .select("id, subject, body, status, created_at, updated_at")
    .eq("requester_user_id", userInfo.profileId)
    .order("created_at", { ascending: false })
    .limit(50)

  const tickets = (ticketsRaw ?? []) as Array<{
    id: string
    subject: string
    body: string
    status: string
    created_at: string
    updated_at: string
  }>

  const open = tickets.filter((t) => t.status === "open" || t.status === "pending").length
  const inProgress = tickets.filter((t) => t.status === "in_progress").length
  const resolved = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length

  const faqs = [
    {
      q: "Comment scanner un QR code membre ?",
      a: "Accédez à la page Scanner, activez la caméra et pointez vers le QR code de la carte membre.",
    },
    {
      q: "Comment créer une nouvelle offre ?",
      a: "Rendez-vous dans Mes Offres > Nouvelle offre et remplissez le formulaire.",
    },
    {
      q: "Quand sont versées les commissions ?",
      a: "Les versements sont calculés mensuellement par le cron partner-payout-monthly et apparaissent dans la page Paiements.",
    },
    {
      q: "Comment modifier mes documents KYC ?",
      a: "Pour le moment, ouvrez une demande de support depuis cette page : un administrateur vous contactera pour le re-dépôt.",
    },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-ink flex items-center gap-3">
          <MessageSquare className="w-7 h-7 text-lime" />
          Support
        </h1>
        <p className="text-mute mt-1">Vos demandes de support et contacts directs</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-ink">
          <CardContent className="p-5">
            <p className="text-xs text-mute">Total</p>
            <p className="text-2xl font-black text-ink">{tickets.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-ink">
          <CardContent className="p-5">
            <p className="text-xs text-gold font-medium">Ouverts</p>
            <p className="text-2xl font-black text-ink">{open}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-ink">
          <CardContent className="p-5">
            <p className="text-xs text-teal font-medium">En cours</p>
            <p className="text-2xl font-black text-ink">{inProgress}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-ink">
          <CardContent className="p-5">
            <p className="text-xs text-lime font-medium">Résolus</p>
            <p className="text-2xl font-black text-ink">{resolved}</p>
          </CardContent>
        </Card>
      </div>

      {/* Direct contact email */}
      <Card className="bg-card border-ink">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-pink/20 flex items-center justify-center">
              <Mail className="h-5 w-5 text-pink" />
            </div>
            <div>
              <p className="font-bold text-ink">Contact direct</p>
              <p className="text-sm text-mute">Réponse sous 24h ouvrables</p>
            </div>
          </div>
          <a
            href={`mailto:${PARTNERS_EMAIL}`}
            className="text-sm font-mono text-pink hover:underline"
          >
            {PARTNERS_EMAIL}
          </a>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* New ticket */}
        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink">Nouvelle demande</CardTitle>
            <CardDescription className="text-mute">
              Décrivez votre problème — nous traçons chaque ticket.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NewTicketForm />
          </CardContent>
        </Card>

        {/* My tickets */}
        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink">Mes demandes</CardTitle>
          </CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="Aucune demande de support"
                description="Vos tickets apparaîtront ici une fois soumis."
              />
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-lg bg-card border border-ink"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="font-semibold text-ink truncate">{t.subject}</p>
                      {statusBadge(t.status)}
                    </div>
                    <p className="text-xs text-mute">
                      Ouvert le {formatDate(t.created_at)}
                      {t.updated_at && t.updated_at !== t.created_at
                        ? ` · MAJ ${formatDate(t.updated_at)}`
                        : ""}
                    </p>
                    <p className="text-sm text-mute mt-2 line-clamp-2">{t.body}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <Card className="bg-card border-ink">
        <CardHeader>
          <CardTitle className="text-ink flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-gold" />
            Questions fréquentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {faqs.map((faq, i) => (
            <details key={i} className="group">
              <summary className="flex items-center justify-between p-4 rounded-xl bg-card border border-ink cursor-pointer list-none hover:border-ink transition-all">
                <span className="font-semibold text-ink">{faq.q}</span>
                <ChevronRight className="h-5 w-5 text-mute group-open:rotate-90 transition-transform" />
              </summary>
              <div className="p-4 text-mute text-sm">{faq.a}</div>
            </details>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
