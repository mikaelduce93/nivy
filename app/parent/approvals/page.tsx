import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import {
  FileCheck,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  ShoppingBag,
  Ticket,
  ShieldCheck
} from "lucide-react"
import Link from "next/link"
import { ApprovalButtons } from "@/components/parent/approval-buttons"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatHero, Niv } from "@/components/brand"
import { NivEmpty } from "@/components/brand"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"

async function getParentSignature(parentId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("e_signatures")
    .select("id")
    .eq("parent_id", parentId)
    .eq("terms_accepted", true)
    .limit(1)
    .maybeSingle()
  return data
}

async function getApprovals(parentId: string) {
  const supabase = await createClient()

  const { data: approvals, error } = await supabase
    .from("parental_approvals")
    .select(`
      *,
      teen:teen_id (
        id,
        full_name
      )
    `)
    .eq("parent_id", parentId)
    // #30 — real sort column is requested_at (no created_at).
    .order("requested_at", { ascending: false })

  if (error) {
    console.error("Error fetching approvals:", error)
    return []
  }

  return approvals || []
}

export default async function ParentApprovalsPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  const [approvals, parentSignature] = await Promise.all([
    getApprovals(userInfo.profileId),
    getParentSignature(userInfo.profileId),
  ])
  const hasSigned = !!parentSignature

  const pendingApprovals = approvals.filter((a: any) => a.status === "pending")
  const approvedApprovals = approvals.filter((a: any) => a.status === "approved")
  // #30 — canonical refusal status is 'denied' (not 'rejected').
  const rejectedApprovals = approvals.filter((a: any) => a.status === "denied")

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // #30 — canonical action_type values (parental_approvals_action_type_check).
  const getApprovalIcon = (type: string) => {
    switch (type) {
      case "booking":
        return <Ticket className="h-5 w-5 text-pink" />
      case "purchase_above_ceiling":
        return <ShoppingBag className="h-5 w-5 text-teal" />
      case "food_order":
        return <ShoppingBag className="h-5 w-5 text-lime" />
      case "coach_meeting":
      case "venue_visit":
        return <Calendar className="h-5 w-5 text-coral" />
      default:
        return <FileCheck className="h-5 w-5 text-mute" />
    }
  }

  const getApprovalTypeName = (type: string) => {
    switch (type) {
      case "booking":
        return "Réservation"
      case "purchase_above_ceiling":
        return "Achat au-dessus du plafond"
      case "food_order":
        return "Commande food"
      case "coach_meeting":
        return "Séance mentor"
      case "venue_visit":
        return "Visite de lieu"
      case "crew_join":
        return "Rejoindre un crew"
      case "xp_award_above_cap":
        return "Bonus XP exceptionnel"
      default:
        return type
    }
  }

  // #30 — statut canonique → variant StatusBadge + libellé FR.
  const statusMeta: Record<string, { variant: StatusVariant; label: string }> = {
    pending: { variant: "pending", label: "En attente" },
    approved: { variant: "success", label: "Approuvé" },
    denied: { variant: "danger", label: "Refusé" },
  }
  const getStatusMeta = (status: string) =>
    statusMeta[status] ?? { variant: "neutral" as StatusVariant, label: status }

  return (
    <div className="min-h-screen bg-paper">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header éditorial */}
        <div className="mb-8">
          <p className="eyebrow text-pink">À valider</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink">
            Les demandes de ton <em className="font-semibold italic text-pink">crew</em>
          </h1>
          <p className="mt-2 text-mute">Gère les demandes de tes teens en un coup d&apos;œil.</p>
        </div>

        {/* Signature gate banner */}
        {!hasSigned && (
          <StickerCard className="mb-8 border-gold bg-gold/10 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <Niv mood="calm" size={64} className="shrink-0" />
                <div>
                  <p className="eyebrow text-gold">Étape légale</p>
                  <h3 className="mt-1 font-display text-lg font-extrabold text-ink">
                    Signe d&apos;abord, c&apos;est la loi 09-08
                  </h3>
                  <p className="mt-1 text-sm text-mute">
                    Pour valider certaines demandes (sorties, paiements,
                    consentements photo), tu dois d&apos;abord signer
                    l&apos;autorisation parentale.
                  </p>
                </div>
              </div>
              <Button asChild variant="default" className="shrink-0">
                <Link href="/parent/e-signature?redirect=/parent/approvals">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Signer maintenant
                </Link>
              </Button>
            </div>
          </StickerCard>
        )}

        {/* Hiérarchie 1-2-3 : chiffre dominant + KPI secondaires */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <StatHero
            eyebrow="En attente"
            value={pendingApprovals.length}
            tone="gold"
            icon={<Clock className="h-5 w-5" />}
            meta="à traiter"
          />
          <StickerCard className="justify-between p-5">
            <div className="flex items-center justify-between">
              <p className="eyebrow text-lime">Approuvés</p>
              <CheckCircle className="h-5 w-5 text-lime" />
            </div>
            <p className="mt-2 font-display text-4xl font-extrabold tabular-nums text-ink">
              {approvedApprovals.length}
            </p>
          </StickerCard>
          <StickerCard className="justify-between p-5">
            <div className="flex items-center justify-between">
              <p className="eyebrow text-coral">Refusés</p>
              <XCircle className="h-5 w-5 text-coral" />
            </div>
            <p className="mt-2 font-display text-4xl font-extrabold tabular-nums text-ink">
              {rejectedApprovals.length}
            </p>
          </StickerCard>
        </div>

        {/* Pending Approvals - Priority */}
        {pendingApprovals.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold text-ink">
              <Clock className="h-5 w-5 text-gold" />
              Demandes en attente ({pendingApprovals.length})
            </h2>
            <div className="space-y-4">
              {pendingApprovals.map((approval: any) => {
                const status = getStatusMeta(approval.status)
                return (
                  <StickerCard key={approval.id} variant="hover" className="p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-ink bg-paper">
                          {getApprovalIcon(approval.action_type)}
                        </div>
                        <div>
                          <p className="eyebrow text-mute">
                            {getApprovalTypeName(approval.action_type)}
                          </p>
                          <h3 className="mt-1 font-display text-lg font-extrabold text-ink">
                            {getApprovalTypeName(approval.action_type) || "Demande d'approbation"}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-xs text-mute">
                            <span>De : {approval.teen?.full_name || "Teen"}</span>
                            <span>•</span>
                            <span>{formatDate(approval.requested_at)}</span>
                          </div>
                          {approval.details?.reason && (
                            <p className="mt-2 text-sm text-mute">{approval.details?.reason}</p>
                          )}
                          {approval.amount && (
                            <p className="mt-2 font-mono text-lg font-bold text-ink">{approval.amount} DH</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <StatusBadge variant={status.variant} label={status.label} pulse />
                        <ApprovalButtons
                          approvalId={approval.id}
                          title={getApprovalTypeName(approval.action_type) || "Demande"}
                          amount={approval.amount}
                          teenName={approval.teen?.full_name}
                        />
                      </div>
                    </div>
                  </StickerCard>
                )
              })}
            </div>
          </section>
        )}

        {/* All Approvals History */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold text-ink">
            <FileCheck className="h-5 w-5 text-lime" />
            Historique des approbations
          </h2>
          {approvals.length > 0 ? (
            <div className="space-y-3">
              {approvals.map((approval: any) => {
                const status = getStatusMeta(approval.status)
                return (
                  <StickerCard key={approval.id} variant="panel" className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-ink bg-paper">
                          {getApprovalIcon(approval.action_type)}
                        </div>
                        <div>
                          <p className="font-display font-bold text-ink">
                            {getApprovalTypeName(approval.action_type) || "Demande d'approbation"}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-mute">
                            <span>{approval.teen?.full_name}</span>
                            <span>•</span>
                            <span>{formatDate(approval.requested_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {approval.amount && (
                          <span className="font-mono text-sm font-bold text-ink">{approval.amount} DH</span>
                        )}
                        <StatusBadge variant={status.variant} label={status.label} />
                      </div>
                    </div>
                  </StickerCard>
                )
              })}
            </div>
          ) : (
            <NivEmpty
              title="Aucune approbation"
              description="Les demandes de tes teens apparaîtront ici."
            />
          )}
        </section>
      </div>
    </div>
  )
}
