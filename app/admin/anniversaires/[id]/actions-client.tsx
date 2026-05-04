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
      toast.error("Erreur lors de la mise à jour du statut")
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
      toast.error("Erreur lors de la mise à jour du paiement")
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
        <label className="text-sm text-zinc-400">Statut de la commande</label>
        <Select
          value={status}
          onValueChange={handleUpdateStatus}
          disabled={isUpdating}
        >
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
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
        <label className="text-sm text-zinc-400">Statut du paiement</label>
        <Select
          value={paymentStatus}
          onValueChange={handleUpdatePaymentStatus}
          disabled={isUpdating}
        >
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
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

      <div className="border-t border-zinc-800 pt-4 space-y-2">
        {/* Quick Actions */}
        {status === "pending" && (
          <Button
            className="w-full bg-green-600 hover:bg-green-700"
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
            className="w-full bg-blue-600 hover:bg-blue-700"
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
            className="w-full border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
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
            className="w-full border-emerald-500 text-emerald-500 hover:bg-emerald-500/10"
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
                className="w-full border-red-500 text-red-500 hover:bg-red-500/10"
                disabled={isUpdating}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Annuler la commande
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-zinc-900 border-zinc-800">
              <AlertDialogHeader>
                <AlertDialogTitle>Annuler cette commande ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. La commande sera marquée comme annulée
                  et le client sera notifié par email.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-zinc-800 border-zinc-700">
                  Retour
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
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
