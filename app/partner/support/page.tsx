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
        <Badge className="bg-green-500/20 text-green-400">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Résolu
        </Badge>
      )
    case "in_progress":
    case "pending":
      return (
        <Badge className="bg-blue-500/20 text-blue-400">
          <Clock className="w-3 h-3 mr-1" />
          En cours
        </Badge>
      )
    case "rejected":
      return (
        <Badge className="bg-red-500/20 text-red-400">
          <XCircle className="w-3 h-3 mr-1" />
          Refusé
        </Badge>
      )
    case "open":
    default:
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400">
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
        <h1 className="text-3xl font-black text-white">Support</h1>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-10 text-center text-red-400">
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
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <MessageSquare className="w-7 h-7 text-emerald-400" />
          Support
        </h1>
        <p className="text-zinc-400 mt-1">Vos demandes de support et contacts directs</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <p className="text-xs text-zinc-400">Total</p>
            <p className="text-2xl font-black text-white">{tickets.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <p className="text-xs text-yellow-400 font-medium">Ouverts</p>
            <p className="text-2xl font-black text-white">{open}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <p className="text-xs text-blue-400 font-medium">En cours</p>
            <p className="text-2xl font-black text-white">{inProgress}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <p className="text-xs text-green-400 font-medium">Résolus</p>
            <p className="text-2xl font-black text-white">{resolved}</p>
          </CardContent>
        </Card>
      </div>

      {/* Direct contact email */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Mail className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="font-bold text-white">Contact direct</p>
              <p className="text-sm text-zinc-400">Réponse sous 24h ouvrables</p>
            </div>
          </div>
          <a
            href={`mailto:${PARTNERS_EMAIL}`}
            className="text-sm font-mono text-purple-400 hover:underline"
          >
            {PARTNERS_EMAIL}
          </a>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* New ticket */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Nouvelle demande</CardTitle>
            <CardDescription className="text-zinc-400">
              Décrivez votre problème — nous traçons chaque ticket.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NewTicketForm />
          </CardContent>
        </Card>

        {/* My tickets */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Mes demandes</CardTitle>
          </CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <div className="p-10 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
                <p className="text-zinc-300 font-semibold">Aucune demande de support</p>
                <p className="text-sm text-zinc-500 mt-2">
                  Vos tickets apparaîtront ici une fois soumis.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-800"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="font-semibold text-white truncate">{t.subject}</p>
                      {statusBadge(t.status)}
                    </div>
                    <p className="text-xs text-zinc-500">
                      Ouvert le {formatDate(t.created_at)}
                      {t.updated_at && t.updated_at !== t.created_at
                        ? ` · MAJ ${formatDate(t.updated_at)}`
                        : ""}
                    </p>
                    <p className="text-sm text-zinc-400 mt-2 line-clamp-2">{t.body}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-amber-400" />
            Questions fréquentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {faqs.map((faq, i) => (
            <details key={i} className="group">
              <summary className="flex items-center justify-between p-4 rounded-xl bg-zinc-800 border border-zinc-700 cursor-pointer list-none hover:border-zinc-600 transition-all">
                <span className="font-semibold text-white">{faq.q}</span>
                <ChevronRight className="h-5 w-5 text-zinc-400 group-open:rotate-90 transition-transform" />
              </summary>
              <div className="p-4 text-zinc-400 text-sm">{faq.a}</div>
            </details>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
