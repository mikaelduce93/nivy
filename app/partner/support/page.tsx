/**
 * Wave V1.2-F — Partner support tickets.
 *
 * RSC. Reads `support_tickets` filtered by `requester_user_id = auth.uid()`
 * (RLS-friendly via the anon client — `support_tickets_self_read` policy
 * grants SELECT to the requester). Ticket creation goes through a server
 * action (./actions.ts) because no INSERT RLS policy exists.
 */
import { Mail, ChevronRight } from "lucide-react"
import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { getPublicAppConfig } from "@/lib/config/app-config"
import { NewTicketForm } from "./new-ticket-form"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"
import { NivCoach, NivEmpty } from "@/components/brand"

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

/** Mapping statut → pill mono UPPERCASE charte (mapping inchangé). */
function ticketStatus(status: string): { label: string; variant: StatusVariant } {
  switch (status) {
    case "resolved":
    case "closed":
      return { label: "RÉSOLU", variant: "success" }
    case "in_progress":
      return { label: "EN COURS", variant: "info" }
    case "rejected":
      return { label: "REFUSÉ", variant: "danger" }
    case "pending":
    case "open":
    default:
      return { label: "OUVERT", variant: "warning" }
  }
}

export default async function PartnerSupportPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")

  if (userInfo.role !== "partner") {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-extrabold text-ink">Support</h1>
        <StickerCard className="p-10 text-center text-coral">
          Accès refusé — espace réservé aux partenaires.
        </StickerCard>
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
      a: "Va sur la page Scanner, active la caméra et vise le QR code de la carte membre. C'est tout, ça valide direct.",
    },
    {
      q: "Comment créer une nouvelle offre ?",
      a: "Direction Mes Offres > Nouvelle offre, tu remplis le formulaire et c'est parti.",
    },
    {
      q: "Quand sont versées les commissions ?",
      a: "Les versements sont calculés chaque mois par le cron partner-payout-monthly et apparaissent dans ta page Paiements.",
    },
    {
      q: "Comment modifier mes documents KYC ?",
      a: "Pour l'instant, ouvre une demande de support ici : un admin te recontacte pour le re-dépôt.",
    },
  ]

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header éditorial */}
      <header>
        <span className="eyebrow tracking-[0.16em] text-mute">Support</span>
        <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
          Un <em className="font-semibold italic text-pink">souci</em> ? On gère
        </h1>
        <p className="mt-2 text-mute">
          Balance ta demande, l&apos;équipe te répond. On trace chaque ticket de bout en bout.
        </p>
      </header>

      {/* Coach Niv */}
      <NivCoach
        mood="calm"
        message="Balance ton souci ici, l'équipe répond sous 24h ouvrables, wllah. Plus c'est détaillé, plus c'est rapide."
      />

      {/* Stats — sticker cards différenciées */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StickerCard className="p-5">
          <span className="eyebrow tracking-[0.16em] text-mute">Total</span>
          <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-ink">
            {tickets.length}
          </p>
        </StickerCard>
        <StickerCard className="bg-warning-soft p-5">
          <span className="eyebrow tracking-[0.16em] text-ink-2">Ouverts</span>
          <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-ink">
            {open}
          </p>
        </StickerCard>
        <StickerCard className="bg-info-soft p-5">
          <span className="eyebrow tracking-[0.16em] text-ink-2">En cours</span>
          <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-ink">
            {inProgress}
          </p>
        </StickerCard>
        <StickerCard className="bg-success-soft p-5">
          <span className="eyebrow tracking-[0.16em] text-ink-2">Résolus</span>
          <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-ink">
            {resolved}
          </p>
        </StickerCard>
      </div>

      {/* Contact direct */}
      <StickerCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border-2 border-ink bg-pink/15">
              <Mail className="size-5 text-pink" aria-hidden="true" />
            </span>
            <div>
              <p className="font-display font-bold text-ink">Contact direct</p>
              <p className="text-sm text-mute">Réponse sous 24h ouvrables</p>
            </div>
          </div>
          <a
            href={`mailto:${PARTNERS_EMAIL}`}
            className="font-mono text-sm text-pink hover:underline"
          >
            {PARTNERS_EMAIL}
          </a>
        </div>
      </StickerCard>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Nouvelle demande */}
        <StickerCard className="gap-4 p-6">
          <div>
            <h2 className="font-display text-lg font-extrabold text-ink">Nouvelle demande</h2>
            <p className="mt-1 text-sm text-mute">
              Décris ton souci — on te répond vite, promis.
            </p>
          </div>
          <NewTicketForm />
        </StickerCard>

        {/* Mes demandes */}
        <StickerCard className="gap-4 p-6">
          <h2 className="font-display text-lg font-extrabold text-ink">Mes demandes</h2>
          {tickets.length === 0 ? (
            <NivEmpty
              title="Aucune demande pour l'instant"
              description="Tes tickets s'afficheront ici dès que tu en ouvres un."
            />
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => {
                const s = ticketStatus(t.status)
                return (
                  <div
                    key={t.id}
                    className="rounded-xl border-2 border-ink bg-paper-2 p-4"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <p className="truncate font-semibold text-ink">{t.subject}</p>
                      <StatusBadge variant={s.variant} label={s.label} size="sm" />
                    </div>
                    <p className="font-mono text-xs text-mute">
                      Ouvert le {formatDate(t.created_at)}
                      {t.updated_at && t.updated_at !== t.created_at
                        ? ` · MAJ ${formatDate(t.updated_at)}`
                        : ""}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-mute">{t.body}</p>
                  </div>
                )
              })}
            </div>
          )}
        </StickerCard>
      </div>

      {/* FAQ */}
      <StickerCard className="gap-4 p-6">
        <h2 className="font-display text-lg font-extrabold text-ink">Questions fréquentes</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <details key={i} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border-2 border-ink bg-paper-2 p-4 transition-colors group-open:bg-white">
                <span className="font-semibold text-ink">{faq.q}</span>
                <ChevronRight className="size-5 text-mute transition-transform group-open:rotate-90" aria-hidden="true" />
              </summary>
              <div className="p-4 text-sm text-mute">{faq.a}</div>
            </details>
          ))}
        </div>
      </StickerCard>
    </div>
  )
}
