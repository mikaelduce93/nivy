"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { CheckCircle2, XCircle, Loader2, CreditCard, RefreshCw } from "lucide-react"

interface AnnivOrderActionsProps {
  orderId: string
  currentStatus: string
  currentPaymentStatus: string
}

export function AnnivOrderActions({
  orderId,
  currentStatus,
  currentPaymentStatus,
}: AnnivOrderActionsProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [status, setStatus] = useState(currentStatus)
  const [paymentStatus, setPaymentStatus] = useState(currentPaymentStatus)

  const handleUpdateStatus = async (newStatus: string) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/anniversaires/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour")
      }

      setStatus(newStatus)
      toast.success(`Statut mis à jour: ${getStatusLabel(newStatus)}`)
      router.refresh()
    } catch (error) {
      toast.error("Maj du statut ratee. Retente?")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdatePaymentStatus = async (newPaymentStatus: string) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/anniversaires/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payment_status: newPaymentStatus }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour")
      }

      setPaymentStatus(newPaymentStatus)
      toast.success(`Paiement mis à jour: ${getPaymentStatusLabel(newPaymentStatus)}`)
      router.refresh()
    } catch (error) {
      toast.error("Maj du paiement ratee. Retente?")
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusLabel = (s: string) => {
    const labels: Record<string, string> = {
      pending: "En attente",
      confirmed: "Confirmé",
      completed: "Terminé",
      cancelled: "Annulé",
    }
    return labels[s] || s
  }

  const getPaymentStatusLabel = (s: string) => {
    const labels: Record<string, string> = {
      pending: "Non payé",
      deposit: "Acompte versé",
      paid: "Payé intégralement",
      refunded: "Remboursé",
    }
    return labels[s] || s
  }

  return (
    <div className="space-y-4">
      {/* Status Update */}
      <div className="space-y-2">
        <label className="text-sm text-mute">Statut de la commande</label>
        <Select
          value={status}
          onValueChange={handleUpdateStatus}
          disabled={isUpdating}
        >
          <SelectTrigger className="bg-card border-ink">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="confirmed">Confirmé</SelectItem>
            <SelectItem value="completed">Terminé</SelectItem>
            <SelectItem value="cancelled">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payment Status Update */}
      <div className="space-y-2">
        <label className="text-sm text-mute">Statut du paiement</label>
        <Select
          value={paymentStatus}
          onValueChange={handleUpdatePaymentStatus}
          disabled={isUpdating}
        >
          <SelectTrigger className="bg-card border-ink">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Non payé</SelectItem>
            <SelectItem value="deposit">Acompte versé</SelectItem>
            <SelectItem value="paid">Payé intégralement</SelectItem>
            <SelectItem value="refunded">Remboursé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border-t border-ink pt-4 space-y-2">
        {/* Quick Actions */}
        {status === "pending" && (
          <Button
            className="w-full bg-lime hover:bg-lime"
            onClick={() => handleUpdateStatus("confirmed")}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Confirmer la commande
          </Button>
        )}

        {status === "confirmed" && (
          <Button
            className="w-full bg-teal hover:bg-teal"
            onClick={() => handleUpdateStatus("completed")}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Marquer comme terminé
          </Button>
        )}

        {paymentStatus === "pending" && (
          <Button
            variant="outline"
            className="w-full border-gold text-gold hover:bg-gold/10"
            onClick={() => handleUpdatePaymentStatus("deposit")}
            disabled={isUpdating}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Enregistrer un acompte
          </Button>
        )}

        {(paymentStatus === "pending" || paymentStatus === "deposit") && (
          <Button
            variant="outline"
            className="w-full border-lime text-lime hover:bg-lime/10"
            onClick={() => handleUpdatePaymentStatus("paid")}
            disabled={isUpdating}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Marquer comme payé
          </Button>
        )}

        {status !== "cancelled" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full border-destructive text-destructive hover:bg-destructive/10"
                disabled={isUpdating}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Annuler la commande
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-ink">
              <AlertDialogHeader>
                <AlertDialogTitle>Annuler cette commande ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. La commande sera marquée comme annulée
                  et le client sera notifié par email.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-card border-ink">
                  Retour
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive"
                  onClick={() => handleUpdateStatus("cancelled")}
                >
                  Confirmer l'annulation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}
