"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { Check, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function ChoreVerifyButtons({
  choreId,
  completionId,
}: {
  choreId: string
  completionId: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  // Wave 4B — replace native window.prompt with a Dialog (canon §0 alert/
  // confirm/prompt forbidden, accessibility + reduced friction on mobile).
  const send = async (approved: boolean, reasonOverride?: string) => {
    setLoading(approved ? "approve" : "reject")
    try {
      const reason = approved
        ? null
        : (reasonOverride ?? rejectReason).trim() || "Refusé par le parent"
      const res = await fetch(`/api/parent/chores/${choreId}/verify-completion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completion_id: completionId,
          approved,
          rejection_reason: reason,
        }),
      })
      const data = await res.json()
      if (data.success) {
        if (approved && data.payout?.paid) {
          toast.success(
            `Validé · ${data.payout.amount_dh} DH (+${data.payout.amount_coins} coins) versés`
          )
        } else if (approved) {
          toast.success("Validé. Récompense en attente d'autres validations.")
        } else {
          toast.success("Refusé")
        }
        router.refresh()
      } else {
        toast.error(data.error || "Erreur")
      }
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setLoading(null)
      setRejectOpen(false)
      setRejectReason("")
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => send(true)}
          disabled={loading !== null}
          className="bg-lime hover:bg-lime text-ink"
        >
          {loading === "approve" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <>
              <Check className="h-4 w-4 mr-1" aria-hidden />
              Valider
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setRejectOpen(true)}
          disabled={loading !== null}
          className="border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          {loading === "reject" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <>
              <X className="h-4 w-4 mr-1" aria-hidden />
              Refuser
            </>
          )}
        </Button>
      </div>

      <Dialog open={rejectOpen} onOpenChange={(o) => { if (!loading) setRejectOpen(o) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser la complétion</DialogTitle>
            <DialogDescription>
              Le motif est partagé avec ton ado pour qu&apos;il/elle comprenne la raison du refus.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="chore-reject-reason">Motif (optionnel)</Label>
            <Textarea
              id="chore-reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={500}
              placeholder="Ex : photo trop floue, tâche pas terminée…"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={loading !== null}
            >
              Annuler
            </Button>
            <Button
              onClick={() => send(false)}
              disabled={loading !== null}
              className="bg-destructive hover:bg-destructive text-ink"
            >
              {loading === "reject" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                "Confirmer le refus"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
