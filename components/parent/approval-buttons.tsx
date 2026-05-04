"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

interface ApprovalButtonsProps {
  approvalId: string
  title?: string
  amount?: number
  teenName?: string
  compact?: boolean
}

export function ApprovalButtons({
  approvalId,
  title,
  amount,
  teenName,
  compact = false
}: ApprovalButtonsProps) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const router = useRouter()

  const openConfirmModal = (action: "approve" | "reject") => {
    setPendingAction(action)
    setShowConfirmModal(true)
    setRejectReason("")
  }

  const handleConfirm = async () => {
    if (!pendingAction) return

    setLoading(pendingAction)

    try {
      const response = await fetch("/api/parent/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          action: pendingAction,
          reason: pendingAction === "reject" ? rejectReason : undefined
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Une erreur est survenue")
      }

      toast.success(
        pendingAction === "approve"
          ? `"${title || 'Demande'}" approuvée avec succès`
          : `"${title || 'Demande'}" refusée`
      )

      setShowConfirmModal(false)
      router.refresh()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <div className={`flex ${compact ? "gap-1" : "gap-2"}`}>
        <Button
          size={compact ? "icon" : "sm"}
          variant="outline"
          className={`${compact ? "h-8 w-8" : "h-8"} border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50`}
          onClick={() => openConfirmModal("reject")}
          disabled={loading !== null}
          title="Refuser"
        >
          {loading === "reject" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : compact ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <>
              <XCircle className="h-4 w-4 mr-1" />
              Refuser
            </>
          )}
        </Button>
        <Button
          size={compact ? "icon" : "sm"}
          className={`${compact ? "h-8 w-8" : "h-8"} bg-emerald-500 hover:bg-emerald-600 text-white`}
          onClick={() => openConfirmModal("approve")}
          disabled={loading !== null}
          title="Approuver"
        >
          {loading === "approve" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : compact ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-1" />
              Approuver
            </>
          )}
        </Button>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingAction === "approve" ? (
                <>
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                  Confirmer l'approbation
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  Confirmer le refus
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {pendingAction === "approve" ? (
                <>
                  Êtes-vous sûr de vouloir approuver cette demande ?
                  {teenName && <span className="block mt-1 text-zinc-300">De: {teenName}</span>}
                </>
              ) : (
                <>
                  Êtes-vous sûr de vouloir refuser cette demande ?
                  {teenName && <span className="block mt-1 text-zinc-300">De: {teenName}</span>}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Request Summary */}
          <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700">
            <p className="font-medium text-white">{title || "Demande d'approbation"}</p>
            {amount && (
              <p className="text-emerald-400 font-bold mt-1">{amount} DH</p>
            )}
          </div>

          {/* Rejection Reason (only for reject) */}
          {pendingAction === "reject" && (
            <div className="space-y-2">
              <Label className="text-zinc-300">Raison du refus (optionnel)</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Expliquez pourquoi vous refusez cette demande..."
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[80px]"
                maxLength={500}
              />
              <p className="text-xs text-zinc-500">
                Cette raison sera communiquée au teen
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={loading !== null}
              className="border-zinc-700 text-zinc-300"
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading !== null}
              className={
                pendingAction === "approve"
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : pendingAction === "approve" ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {pendingAction === "approve" ? "Approuver" : "Refuser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
