import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  FileCheck,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Calendar,
  CreditCard,
  ShoppingBag,
  Ticket,
  AlertTriangle,
  ShieldCheck
} from "lucide-react"
import Link from "next/link"
import { ApprovalButtons } from "@/components/parent/approval-buttons"
import { EmptyState } from "@/components/ui/states/empty-state"

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return {
          icon: Clock,
          text: "En attente",
          class: "bg-gold/20 text-gold"
        }
      case "approved":
        return {
          icon: CheckCircle,
          text: "Approuvé",
          class: "bg-lime/20 text-lime"
        }
      case "denied":
        return {
          icon: XCircle,
          text: "Refusé",
          class: "bg-destructive/20 text-destructive"
        }
      default:
        return {
          icon: FileCheck,
          text: status,
          class: "bg-muted text-mute"
        }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-ink">Approbations</h1>
            <p className="text-mute">Gérez les demandes de vos teens</p>
          </div>
          <Button variant="outline" className="border-ink text-ink-2">
            <Filter className="h-4 w-4 mr-2" />
            Filtrer
          </Button>
        </div>

        {/* Signature gate banner */}
        {!hasSigned && (
          <Card className="mb-8 bg-gradient-to-br from-gold/10 to-coral/10 border-gold/30">
            <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <h3 className="font-bold text-ink">
                    Autorisation parentale non signée
                  </h3>
                  <p className="text-sm text-mute mt-1">
                    Pour valider certaines demandes (sorties, paiements,
                    consentements photo) vous devez d&apos;abord signer
                    l&apos;autorisation parentale.
                  </p>
                </div>
              </div>
              <Button
                asChild
                className="bg-gradient-to-r from-teal to-teal hover:from-teal hover:to-teal text-ink shrink-0"
              >
                <Link href="/parent/e-signature?redirect=/parent/approvals">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Signer maintenant
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-gold/20 to-coral/20 border-gold/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gold font-medium">En attente</p>
                  <p className="text-3xl font-black text-ink">{pendingApprovals.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gold/20 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-gold" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-lime/20 to-teal/20 border-lime/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-lime font-medium">Approuvés</p>
                  <p className="text-3xl font-black text-ink">{approvedApprovals.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-lime/20 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-lime" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-destructive/20 to-pink/20 border-destructive/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-destructive font-medium">Refusés</p>
                  <p className="text-3xl font-black text-ink">{rejectedApprovals.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal/20 to-teal/20 border-teal/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-teal font-medium">Total</p>
                  <p className="text-3xl font-black text-ink">{approvals.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-teal/20 flex items-center justify-center">
                  <FileCheck className="h-6 w-6 text-teal" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals - Priority */}
        {pendingApprovals.length > 0 && (
          <Card className="bg-gradient-to-br from-gold/10 to-coral/10 border-gold/30 mb-8">
            <CardHeader>
              <CardTitle className="text-ink flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-gold" />
                Demandes en attente ({pendingApprovals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingApprovals.map((approval: any) => {
                  const status = getStatusBadge(approval.status)
                  const StatusIcon = status.icon
                  return (
                    <div
                      key={approval.id}
                      className="p-5 rounded-2xl bg-card border border-gold/20"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-xl bg-card flex items-center justify-center">
                            {getApprovalIcon(approval.action_type)}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-ink">
                              {getApprovalTypeName(approval.action_type) || "Demande d'approbation"}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-mute">
                              <span className="bg-card px-2 py-0.5 rounded text-xs">
                                {getApprovalTypeName(approval.action_type)}
                              </span>
                              <span>•</span>
                              <span>De: {approval.teen?.full_name || "Teen"}</span>
                              <span>•</span>
                              <span>{formatDate(approval.requested_at)}</span>
                            </div>
                            {approval.details?.reason && (
                              <p className="text-sm text-mute mt-2">{approval.details?.reason}</p>
                            )}
                            {approval.amount && (
                              <p className="text-lime font-bold mt-2">{approval.amount} DH</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <ApprovalButtons
                            approvalId={approval.id}
                            title={getApprovalTypeName(approval.action_type) || "Demande"}
                            amount={approval.amount}
                            teenName={approval.teen?.full_name}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Approvals History */}
        <Card className="bg-gradient-to-br from-paper-2 to-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-lime" />
              Historique des approbations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {approvals.length > 0 ? (
              <div className="space-y-3">
                {approvals.map((approval: any) => {
                  const status = getStatusBadge(approval.status)
                  const StatusIcon = status.icon
                  return (
                    <div
                      key={approval.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-card border border-ink hover:border-ink transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-card flex items-center justify-center">
                          {getApprovalIcon(approval.action_type)}
                        </div>
                        <div>
                          <p className="font-medium text-ink">
                            {getApprovalTypeName(approval.action_type) || "Demande d'approbation"}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-mute">
                            <span>{approval.teen?.full_name}</span>
                            <span>•</span>
                            <span>{getApprovalTypeName(approval.action_type)}</span>
                            <span>•</span>
                            <span>{formatDate(approval.requested_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {approval.amount && (
                          <span className="text-mute font-medium">{approval.amount} DH</span>
                        )}
                        <span className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full ${status.class}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.text}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={FileCheck}
                title="Aucune approbation"
                description="Les demandes de vos teens apparaîtront ici"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
