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
  AlertTriangle
} from "lucide-react"
import Link from "next/link"
import { ApprovalButtons } from "@/components/parent/approval-buttons"

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
    .order("created_at", { ascending: false })

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

  const approvals = await getApprovals(userInfo.profileId)

  const pendingApprovals = approvals.filter((a: any) => a.status === "pending")
  const approvedApprovals = approvals.filter((a: any) => a.status === "approved")
  const rejectedApprovals = approvals.filter((a: any) => a.status === "rejected")

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getApprovalIcon = (type: string) => {
    switch (type) {
      case "booking":
        return <Ticket className="h-5 w-5 text-purple-400" />
      case "purchase":
        return <ShoppingBag className="h-5 w-5 text-blue-400" />
      case "payment":
        return <CreditCard className="h-5 w-5 text-emerald-400" />
      case "event":
        return <Calendar className="h-5 w-5 text-orange-400" />
      default:
        return <FileCheck className="h-5 w-5 text-zinc-400" />
    }
  }

  const getApprovalTypeName = (type: string) => {
    switch (type) {
      case "booking":
        return "Réservation"
      case "purchase":
        return "Achat"
      case "payment":
        return "Paiement"
      case "event":
        return "Événement"
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
          class: "bg-amber-500/20 text-amber-400"
        }
      case "approved":
        return {
          icon: CheckCircle,
          text: "Approuvé",
          class: "bg-emerald-500/20 text-emerald-400"
        }
      case "rejected":
        return {
          icon: XCircle,
          text: "Refusé",
          class: "bg-red-500/20 text-red-400"
        }
      default:
        return {
          icon: FileCheck,
          text: status,
          class: "bg-zinc-500/20 text-zinc-400"
        }
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-zinc-400 hover:text-white">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">Approbations</h1>
            <p className="text-zinc-400">Gérez les demandes de vos teens</p>
          </div>
          <Button variant="outline" className="border-zinc-700 text-zinc-300">
            <Filter className="h-4 w-4 mr-2" />
            Filtrer
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-400 font-medium">En attente</p>
                  <p className="text-3xl font-black text-white">{pendingApprovals.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-400 font-medium">Approuvés</p>
                  <p className="text-3xl font-black text-white">{approvedApprovals.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/20 to-pink-500/20 border-red-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-400 font-medium">Refusés</p>
                  <p className="text-3xl font-black text-white">{rejectedApprovals.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-400 font-medium">Total</p>
                  <p className="text-3xl font-black text-white">{approvals.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <FileCheck className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals - Priority */}
        {pendingApprovals.length > 0 && (
          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
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
                      className="p-5 rounded-2xl bg-zinc-900 border border-amber-500/20"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center">
                            {getApprovalIcon(approval.approval_type)}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">
                              {approval.title || "Demande d'approbation"}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-zinc-400">
                              <span className="bg-zinc-800 px-2 py-0.5 rounded text-xs">
                                {getApprovalTypeName(approval.approval_type)}
                              </span>
                              <span>•</span>
                              <span>De: {approval.teen?.full_name || "Teen"}</span>
                              <span>•</span>
                              <span>{formatDate(approval.created_at)}</span>
                            </div>
                            {approval.description && (
                              <p className="text-sm text-zinc-500 mt-2">{approval.description}</p>
                            )}
                            {approval.amount && (
                              <p className="text-emerald-400 font-bold mt-2">{approval.amount} DH</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <ApprovalButtons
                            approvalId={approval.id}
                            title={approval.title || "Demande"}
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
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-emerald-400" />
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
                      className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                          {getApprovalIcon(approval.approval_type)}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {approval.title || "Demande d'approbation"}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <span>{approval.teen?.full_name}</span>
                            <span>•</span>
                            <span>{getApprovalTypeName(approval.approval_type)}</span>
                            <span>•</span>
                            <span>{formatDate(approval.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {approval.amount && (
                          <span className="text-zinc-400 font-medium">{approval.amount} DH</span>
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
              <div className="text-center py-16">
                <FileCheck className="h-16 w-16 mx-auto mb-4 text-zinc-700" />
                <h3 className="text-xl font-bold text-white mb-2">Aucune approbation</h3>
                <p className="text-zinc-400">
                  Les demandes de vos teens apparaîtront ici
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
